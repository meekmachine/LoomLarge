// VISOS/perception/audio/pitchService.js
import { interpret, assign } from 'xstate';
import { Subject, Observable } from 'rxjs';
import Pitchy from 'pitchy';

import { pitchMachine } from './pitchMachine';

/**
 * 1) We'll create a single Subject to emit { pitch, volume, timestamp }.
 *    We'll expose its .asObservable() so external code can subscribe.
 */
const pitchVolumeSubject = new Subject();
// If you want a read-only Observable for external code:
export const pitchVolume$ = pitchVolumeSubject.asObservable();

/**
 * pitchProcess(context, event)
 *
 * Invoked service that sets up an RxJS stream for pitch detection. We:
 *  - use context.mediaStream
 *  - run a loop calling Pitchy.analyse()
 *  - attach a timestamp
 *  - emit { pitch, volume, timestamp } to pitchVolumeSubject
 *  - also dispatch an event back to the machine for context updates
 */
function pitchProcess(context, event) {
  return (callback, onReceive) => {
    const { mediaStream } = context;
    if (!mediaStream) {
      callback({ type: 'error', data: new Error('No mediaStream for pitch detection') });
      return () => {}; // empty cleanup
    }

    // We'll create an RxJS Observable that does real-time pitch detection
    const pitch$ = new Observable((subscriber) => {
      let audioContext;
      let analyserNode;
      let rafId;
      let stopped = false;

      function start() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sourceNode = audioContext.createMediaStreamSource(mediaStream);

        const fftSize = 2048;
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = fftSize;
        sourceNode.connect(analyserNode);

        const sampleRate = audioContext.sampleRate;
        const buffer = new Float32Array(fftSize);

        function update() {
          if (stopped) return;

          analyserNode.getFloatTimeDomainData(buffer);

          const [pitch, clarity] = Pitchy.analyse(buffer, sampleRate);
          const volume = estimateVolume(buffer);

          // We'll attach a timestamp. For comparing to transcripts, you might use:
          // - Date.now()
          // - performance.now() for higher-resolution
          // - audioContext.currentTime for a real audio-clock timestamp
          const timestamp = performance.now();

          // Emit an item
          subscriber.next({ pitch, volume, timestamp });

          rafId = requestAnimationFrame(update);
        }
        update();
      }
      start();

      // Return teardown
      return () => {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (audioContext) {
          audioContext.close();
        }
      };
    });

    // 2) Subscribe => forward to the machine and also to pitchVolumeSubject
    const subscription = pitch$.subscribe({
      next: ({ pitch, volume, timestamp }) => {
        // Dispatch to XState => e.g. update context
        callback({ type: 'UPDATE_PITCH_VOLUME', pitch, volume });

        // Also push to pitchVolumeSubject for external subscribers
        pitchVolumeSubject.next({ pitch, volume, timestamp });
      },
      error: (err) => {
        callback({ type: 'error', data: err });
      },
      complete: () => {
        callback('DONE');
      }
    });

    // 3) Return the invoked service cleanup
    return () => {
      subscription.unsubscribe();
    };
  };
}

/** Simple RMS volume estimate */
function estimateVolume(floatBuffer) {
  let sumSq = 0;
  for (let i = 0; i < floatBuffer.length; i++) {
    const val = floatBuffer[i];
    sumSq += val * val;
  }
  return Math.sqrt(sumSq / floatBuffer.length);
}

/**
 * createPitchService({ onPitchVolume, mediaStream })
 *
 * Exposes aggregator methods:
 *  - startExtracting, stopExtracting, setMediaStream, retry
 *  - plus getState()
 *  - also we have a global pitchVolume$ stream exporting from this file
 */
export function createPitchService({ onPitchVolume, mediaStream } = {}) {
  // Configure the machine with pitchProcess
  const machine = pitchMachine.withConfig({
    services: {
      pitchProcess
    }
  }, {
    context: {
      mediaStream,
      pitch: 0,
      volume: 0,
      error: null
    }
  });

  // Interpret
  const service = interpret(machine)
    .onTransition((state, evt) => {
      if (evt.type === 'UPDATE_PITCH_VOLUME') {
        onPitchVolume?.(evt.pitch, evt.volume);
      }
    })
    .start();

  return {
    service,

    startExtracting: () => service.send('START_EXTRACTING'),
    stopExtracting: () => service.send('STOP_EXTRACTING'),
    retry: () => service.send('RETRY'),

    // if the user updates the mic stream from outside
    setMediaStream: (stream) => {
      service.send({
        type: 'xstate.assign',
        assignment: assign((ctx) => ({
          ...ctx,
          mediaStream: stream
        }))
      });
    },

    getState: () => service.state,

    // For convenience, if you want direct access to the pitchVolume$ from here:
    getPitchVolume$() {
      return pitchVolume$;
    }
  };
}