////////////////////////////////////////////////////////////////////////////////
// 3) transcriptionService.js
////////////////////////////////////////////////////////////////////////////////

import { interpret } from 'xstate';
import { transcriptionMachine } from './transcriptionMachine';
import { Observable } from 'rxjs';
import natural from 'natural';
const tokenizer = new natural.TreebankWordTokenizer();
import { BehaviorSubject } from 'rxjs';

// LiveKit‑style boundary stream (WORD events with speaker tag)
const boundary$ = new BehaviorSubject(null);

// Set for the agent's full utterance tokens
const agentWordSet = new Set();   // entire utterance words
let agentSpeakingActive = false;
let agentScriptStr = '';

/**
 * Creates a TranscriptionService that uses a no-magic-interval approach:
 *  - The "transcriptionProcess" callback restarts recognition automatically
 *    if onend fires and we haven't manually stopped.
 *  - FuzzySet ignoring for partial/final if agent is speaking
 *  - Optionally handle boundary$ from TTS to filter out agent speech, if desired
 */
export function createTranscriptionService({ onTranscript, agentSpeech$ } = {}) {
  // We'll define a config for the machine that references "transcriptionProcess"
  const machine = transcriptionMachine.withConfig({
    services: {
      transcriptionProcess: (ctx, evt) => transcriptionProcess(ctx, evt, boundary$)
    }
  });

  // Interpret the machine
  const service = interpret(machine)
    .onTransition((state, evt) => {
      // Listen for 'TRANSCRIPT_EVENT' to pass recognized transcripts to caller
      if (evt.type === 'TRANSCRIPT_EVENT') {
        onTranscript?.(evt.transcript, evt.isFinal);
      }
    })
    .start();

  // If we get 'agentSpeech$', we set/cancel agent words
  let agentSpeechSub = null;


  function initAgentSpeechHandling() {
    if (!agentSpeech$) return;
    agentSpeechSub = agentSpeech$.subscribe({
      next: (agentEvt) => {
        if (!agentEvt) return;          // initial null emission
        switch (agentEvt.type) {
          // "AGENT_SCRIPT": full agent script (token list)
          case 'AGENT_SCRIPT':
            agentWordSet.clear();
            (agentEvt.words || []).forEach(w => agentWordSet.add(w));
            agentScriptStr = (agentEvt.words || []).join(' ');
            break;
          // "AGENT_START": agent about to speak
          case 'AGENT_START':
            agentSpeakingActive = true;
            break;
          // "WORD" => set currentAgentWord for partial ignoring
          case 'WORD': {
            const w = agentEvt.word?.toLowerCase();
            service.send({ type: 'SET_CURRENT_AGENT_WORD', word: w });
            boundary$.next({
              type:'WORD',
              word: w,
              index: agentEvt.index ?? -1,
              ts: Date.now(),
              speaker:'agent'
            });
            break;
          }
          // "END" => agent final phrase => optional
          case 'END':
            service.send({ type: 'SET_AGENT_SPEECH', phrase: agentEvt.phrase });
            service.send('CLEAR_CURRENT_AGENT_WORD');
            break;
          // "AGENT_DONE" => speaking ended
          case 'AGENT_DONE':
            agentSpeakingActive = false;
            agentWordSet.clear();
            agentScriptStr = '';
            service.send('CLEAR_AGENT_SPEECH');
            service.send('CLEAR_CURRENT_AGENT_WORD');
            break;
          case 'PLAYBACK_ENDED':
            agentSpeakingActive = false;
            agentWordSet.clear();
            agentScriptStr = '';
            service.send('CLEAR_AGENT_SPEECH');
            service.send('CLEAR_CURRENT_AGENT_WORD');
            break;
          default:
            break;
        }
      },
      error: (err) => console.error('[TranscriptionService] agentSpeech$ error =>', err),
      complete: () => console.log('[TranscriptionService] agentSpeech$ => completed'),
    });
  }
  initAgentSpeechHandling();

  return {
    service,
    startListening: () => service.send('START_LISTENING'),
    stopListening:  () => service.send('STOP_LISTENING'),

    setAgentSpeech: (phrase) => service.send({ type: 'SET_AGENT_SPEECH', phrase }),
    clearAgentSpeech: () => service.send('CLEAR_AGENT_SPEECH'),

    setCurrentAgentWord: (word) => service.send({ type: 'SET_CURRENT_AGENT_WORD', word }),
    clearCurrentAgentWord: () => service.send('CLEAR_CURRENT_AGENT_WORD'),

    getState: () => service.state,
    getBoundary$: () => boundary$.asObservable(),

    dispose: () => {
      console.log('[TranscriptionService] => dispose() => stopping machine + unsubscribing');
      boundary$.complete();
      service.stop();
      agentSpeechSub?.unsubscribe();
    }
  };
}

// -----------------------------------------------------------------------------
// The invoked "transcriptionProcess" for the XState machine
//  - This is where we do partial/final ignoring with FuzzySet
//  - We remove the 300 ms setTimeout in onend and replace it with an immediate
//    'RECOGNITION_ENDED' event if not manuallyStopped, letting the machine decide if we auto-restart
// -----------------------------------------------------------------------------
function transcriptionProcess(context, event, boundary$) {
  return (callback, onReceive) => {
    console.log('[TranscriptionService] => starting recognition with agent filtering via Natural tokenizer...');
    let recognition = null;
    let manuallyStopped = false;
    let { lastAgentSpeech, currentAgentWord } = context;

    onReceive((evt) => {
      switch (evt.type) {
        case 'STOP_LISTENING':
          manuallyStopped = true;
          if (recognition) recognition.stop();
          break;
        case 'SET_AGENT_SPEECH':
          lastAgentSpeech = (evt.phrase || '').trim();
          break;
        case 'CLEAR_AGENT_SPEECH':
          lastAgentSpeech = '';
          break;
        case 'SET_CURRENT_AGENT_WORD':
          currentAgentWord = (evt.word || '').trim().toLowerCase();
          break;
        case 'CLEAR_CURRENT_AGENT_WORD':
          currentAgentWord = '';
          break;
        default:
          break;
      }
    });

    // The main STT logic
    const stt$ = new Observable((subscriber) => {
      function startRecognition() {
        if (!recognition) {
          recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          recognition.lang = 'en-US';
          recognition.interimResults = true;
          recognition.continuous = true;

          recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const chunk = result[0].transcript.trim();
              if (!chunk) continue;

              const isFinal = result.isFinal;
              // Deterministic speaker differentiation using Natural tokenizer
              const chunkLower = chunk.toLowerCase();
              const tokens = tokenizer.tokenize(chunkLower);
              // Phrase-level echo check
              const allMatchScript  = tokens.every(t => agentWordSet.has(t));
              const prefixMatch     = agentScriptStr.startsWith(chunkLower);
              if (agentSpeakingActive && (allMatchScript || prefixMatch)) {
                continue; // echo
              }

              // Publish each token to boundary$ with speaker=user
              tokens.forEach((tok, idx) => boundary$.next({
                type:   'WORD',
                word:   tok,
                index:  idx,
                ts:     Date.now(),
                speaker:'user'
              }));

              // If not ignored, forward it
              subscriber.next({ transcript: chunk, isFinal });
            }
          };

          recognition.onerror = (err) => {
            console.warn('[TranscriptionService] recognizer error –', err.error);
            // Treat any recognizer error like an "ended" event so we auto‑restart
            subscriber.next({ type: 'RECOGNITION_ENDED', reason: err.error });
          };

          recognition.onend = () => {
            console.warn(`[TranscriptionService] onend => manuallyStopped=${manuallyStopped}`);
            if (!manuallyStopped) {
              subscriber.next({ type: 'RECOGNITION_ENDED' }); // notify machine
            } else {
              subscriber.complete(); // done for real
            }
          };
        }
        recognition.start();
      }

      console.log('[TranscriptionService] => recognition.start()');
      startRecognition();

      // Cleanup
      return () => {
        console.log('[TranscriptionService] => stopping recognition...');
        manuallyStopped = true;
        recognition?.stop();
      };
    });

    const subscription = stt$.subscribe({
      next: (evt) => {
        if (evt.type === 'RECOGNITION_ENDED') {
          callback('RECOGNITION_ENDED');
        } else {
          callback({ type: 'TRANSCRIPT_EVENT', transcript: evt.transcript, isFinal: evt.isFinal });
        }
      },
      complete: () => {
        callback('DONE');
      }
    });

    return () => subscription.unsubscribe();
  };
}