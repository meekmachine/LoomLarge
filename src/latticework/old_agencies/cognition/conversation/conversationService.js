import { interpret } from 'xstate';
import { conversationMachine } from './conversationMachine';
import { createTranscriptionService } from '../../perception/audio/transcriptionService';

/**
 * initConversationService({
 *   chatFlowGenerator,       // yields agent text from GPT
 *   onUserSpeechPartial,     // partial user speech callback
 *   onUserSpeechFinal,       // final user speech callback
 *   onAgentUtterance,        // agent text callback
 *   ttsService               // aggregator with .enqueueText, .stopSpeech
 * })
 *
 * Returns aggregator => { start(), stop(), getState(), service }
 */
export function initConversationService({
  chatFlowGenerator,
  onUserSpeechPartial,
  onUserSpeechFinal,
  onAgentUtterance,
  ttsService
}) {
  let xstateService = null;
  let transcriptionSvc = null;
  let boundarySub = null;
  let generatorRef = null;
  let partialBuffer = '';
  let talkingStartTime = 0;
  let lastAgentSpeech = '';

  function start() {
    console.log('[ConversationService] => start => interpret conversationMachine');
    xstateService = interpret(conversationMachine)
      .onTransition(handleStateTransition)
      .start();

    // Always run GPT flow on any FINAL_USER_SPEECH event:
    xstateService.onEvent(evt => {
      if (evt.type === 'FINAL_USER_SPEECH') {
        console.log('[ConversationService] => AUTO-RESUME on FINAL_USER_SPEECH:', evt.transcript);
        runGPTFlow(evt.transcript);
      }
    });

    // Create & start transcription
    transcriptionSvc = createTranscriptionService({
      onTranscript: (transcript, isFinal) => {
        handleUserSpeech(transcript, isFinal);
      },
      agentSpeech$: ttsService?.getBoundary$ ? ttsService.getBoundary$() : null
    });
    transcriptionSvc.startListening();

    generatorRef = chatFlowGenerator?.() || null;
    xstateService.send({ type: 'START_CONVERSATION' });
    greetAgent();
  }

  function stop() {
    console.log('[ConversationService] => stop => cleaning up...');
    if (xstateService) {
      xstateService.stop();
      xstateService = null;
    }
    if (transcriptionSvc) {
      transcriptionSvc.stopListening();
      transcriptionSvc = null;
    }
    if (boundarySub) {
      boundarySub.unsubscribe();
      boundarySub = null;
    }
    generatorRef = null;
    partialBuffer = '';
    lastAgentSpeech = '';
  }

  function getState() {
    return xstateService?.state || null;
  }

  function handleStateTransition(state) {
    if (!state.changed) return;
    console.log('[ConversationService] => conversationMachine =>', state.value, state.context);

    // If agent enters 'talking' => subscribe boundary (if TTS is used) & record startTime
    if (state.value === 'talking') {
      subscribeBoundary();
      talkingStartTime = Date.now();
      partialBuffer = '';
    } else {
      // in any other state => unsubscribe boundary
      if (boundarySub) {
        boundarySub.unsubscribe();
        boundarySub = null;
      }
      transcriptionSvc?.clearCurrentAgentWord();
    }
  }

  function subscribeBoundary() {
    if (!ttsService) return;
    console.log('[ConversationService] => ttsService.getAgentWord$');
    if (boundarySub) boundarySub.unsubscribe();
    boundarySub = ttsService.getAgentWord$()?.subscribe(({ word, timestamp }) => {
      console.log(`[ConversationService] => boundary => word="${word}" time=${timestamp}`);
      // store current agent word in transcription for fuzzy ignoring
      transcriptionSvc?.setCurrentAgentWord(word);
    });
  }

  async function greetAgent() {
    if (!generatorRef) return;
    console.log('[ConversationService] => greetAgent => generatorRef.next("")');
    const { value } = generatorRef.next('');
    const greet = await resolveValue(value);
    if (!greet) {
      xstateService.send({ type: 'NO_RESPONSE' });
      return;
    }
    console.log('[ConversationService] => greetAgent => greet=', greet);
    lastAgentSpeech = greet;
    xstateService.send({ type: 'AGENT_RESPONSE', text: greet });
    transcriptionSvc?.setAgentSpeech(greet);
    onAgentUtterance?.(greet);

    if (ttsService) {
      ttsService.enqueueText(greet).then(() => {
        console.log('[ConversationService] => greetAgent => agent done => AGENT_DONE');
        transcriptionSvc?.clearAgentSpeech();
        transcriptionSvc?.clearCurrentAgentWord();
        if (!xstateService) return;
        xstateService.send({ type: 'AGENT_DONE' });
      });
    } else {
      xstateService.send({ type: 'AGENT_DONE' });
    }
  }

  function handleUserSpeech(transcript, isFinal) {
    const stVal = xstateService.state.value;
    console.log(`[ConversationService] => userSpeech("${transcript}", final=${isFinal}), st=${stVal}`);
    if (!transcriptionSvc) return;

    const cleanedPartial = cleanText(transcript);

    // If partial user speech
    if (!isFinal && stVal === 'talking') {
      // gather partial text
      partialBuffer = `${partialBuffer} ${cleanedPartial}`.trim();
      if (meetsInterruptThreshold(partialBuffer)) {
        console.log('[ConversationService] => user meets interrupt => USER_INTERRUPTED');
        xstateService.send({ type: 'USER_INTERRUPTED' });
        ttsService?.stopSpeech();
        transcriptionSvc.clearAgentSpeech();
        transcriptionSvc.clearCurrentAgentWord();
      }
      onUserSpeechPartial?.(transcript, stVal === 'interrupted');
      xstateService.send({ type: 'PARTIAL_USER_SPEECH', transcript });
      return;
    }

    // If partial in other states or not final => just pass it along
    if (!isFinal) {
      onUserSpeechPartial?.(transcript, stVal === 'interrupted');
      xstateService.send({ type: 'PARTIAL_USER_SPEECH', transcript });
      return;
    }

    // If final user speech
    const cleanedFinal = cleanText(transcript);
    const finalText = partialBuffer ? `${partialBuffer} ${cleanedFinal}`.trim() : cleanedFinal;
    partialBuffer = '';

    if (stVal === 'talking' && meetsInterruptThreshold(finalText)) {
      console.log('[ConversationService] => final => interrupt => USER_INTERRUPTED');
      xstateService.send({ type: 'USER_INTERRUPTED' });
      ttsService?.stopSpeech();
      transcriptionSvc.clearAgentSpeech();
      transcriptionSvc.clearCurrentAgentWord();
    }

    onUserSpeechFinal?.(transcript, stVal === 'interrupted');
    xstateService.send({ type: 'FINAL_USER_SPEECH', transcript });
  }

  async function runGPTFlow(userText) {
    console.log('[ConversationService] => runGPTFlow => next:', userText);
    if (!generatorRef) return;
    const { value } = generatorRef.next(userText);
    const agentReply = await resolveValue(value);
    if (!agentReply) {
      xstateService.send({ type: 'NO_RESPONSE' });
      return;
    }
    console.log('[ConversationService] => agentResp=', agentReply);
    lastAgentSpeech = agentReply;
    xstateService.send({ type: 'AGENT_RESPONSE', text: agentReply });
    transcriptionSvc?.setAgentSpeech(agentReply);
    onAgentUtterance?.(agentReply);

    if (ttsService) {
      // Removed any second "reply" usage here
      ttsService.enqueueText(agentReply).then(() => {
        console.log('[ConversationService] => agent chunk done => AGENT_DONE');
        transcriptionSvc?.clearAgentSpeech();
        transcriptionSvc?.clearCurrentAgentWord();
        if (!xstateService) return;
        xstateService.send('AGENT_DONE');
      });
    } else {
      xstateService.send('AGENT_DONE');
    }
  }

  return {
    start,
    stop,
    getState,
    get service() {
      return xstateService;
    }
  };
}

// Helpers
function cleanText(txt) {
  if (!txt) return '';
  // remove emojis, punctuation, extra spaces
  return txt
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function meetsInterruptThreshold(text) {
  if (!text) return false;
  const words = text.split(/\s+/).filter(w => w.length >= 3);
  return words.length >= 2;
}

async function resolveValue(val) {
  if (val instanceof Promise) {
    try { return await val; }
    catch (e) { console.error('[ConversationService] => GPT error', e); return null; }
  }
  return typeof val === 'string' ? val : null;
}