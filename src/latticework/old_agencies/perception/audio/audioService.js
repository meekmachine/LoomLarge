// VISOS/perception/audio/audioService.js
import { interpret, assign } from 'xstate';
import { audioMachine } from './audioMachine';
import { Subject } from 'rxjs';

/**
 * audioFrameSubject => emits { samples: Float32Array, sampleRate, timestamp } 
 * for any subscriber, used by pitchService & transcriptionService.
 */
const audioFrameSubject = new Subject();
export const audioFrame$ = audioFrameSubject.asObservable();

export function createAudioService() {
  // interpret the audioMachine
  const service = interpret(audioMachine)
    .onTransition((state) => {
      if (state.changed) {
        console.log('[AudioService] =>', state.value, state.context);

        if (state.value === 'audioOn') {
          // set up the ScriptProcessor to push PCM frames
          startAudioCapture(state.context);
        }
        if (state.value === 'audioOff' || state.value === 'unsupported') {
          stopAudioCapture(state.context);
        }
      }
    })
    .start();

  function startAudioCapture(ctx) {
    if (ctx.audioContext) return; // already capturing?

    // create AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // create source from mediaStream
    const source = audioContext.createMediaStreamSource(ctx.mediaStream);

    // create script processor
    const bufferSize = 2048;
    const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    scriptNode.onaudioprocess = (audioEvent) => {
      const input = audioEvent.inputBuffer.getChannelData(0);
      // clone input
      const samples = new Float32Array(input);
      const sampleRate = audioContext.sampleRate;
      const timestamp = performance.now(); // or audioContext.currentTime

      audioFrameSubject.next({ samples, sampleRate, timestamp });
    };
    source.connect(scriptNode);
    scriptNode.connect(audioContext.destination);

    // update context so we know we are capturing
    service.send({
      type: 'xstate.assign',
      assignment: assign(() => ({
        ...ctx,
        audioContext
      }))
    });
    console.log('[AudioService] => started capturing audio frames');
  }

  function stopAudioCapture(ctx) {
    if (ctx.audioContext) {
      ctx.audioContext.close().catch((e)=>console.warn('Error closing AudioContext', e));
    }
    ctx.mediaStream?.getTracks().forEach((track) => track.stop());
    console.log('[AudioService] => stopped capturing audio frames');
  }

  return {
    service,
    init: () => service.send('INIT'),
    start: () => service.send('START'),
    stop: () => service.send('STOP'),
    getState: () => service.state
  };
}