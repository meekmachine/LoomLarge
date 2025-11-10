// VISOS/perception/audio/pitchMachine.js
import { createMachine, assign } from 'xstate';

/**
 * pitchMachine:
 *   - off => "START_EXTRACTING" => extracting
 *   - extracting => "STOP_EXTRACTING" => off
 *                  => error => error
 *   - error => can "RETRY" => off
 *
 * context includes:
 *   - mediaStream
 *   - pitch, volume
 *   - error
 */
export const pitchMachine = createMachine({
  id: 'pitchMachine',
  initial: 'off',
  context: {
    mediaStream: null,
    pitch: 0,
    volume: 0,
    error: null
  },
  states: {
    off: {
      on: {
        START_EXTRACTING: 'extracting'
      }
    },
    extracting: {
      invoke: {
        id: 'pitchProcess',
        src: 'pitchProcess',
        onDone: { target: 'off' },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, evt) => evt.data
          })
        }
      },
      on: {
        STOP_EXTRACTING: 'off',
        UPDATE_PITCH_VOLUME: {
          actions: assign((ctx, evt) => ({
            pitch: evt.pitch,
            volume: evt.volume
          }))
        }
      }
    },
    error: {
      on: {
        RETRY: 'off'
      }
    }
  }
});