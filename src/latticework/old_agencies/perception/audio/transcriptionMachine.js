////////////////////////////////////////////////////////////////////////////////
// 1) transcriptionMachine.js
////////////////////////////////////////////////////////////////////////////////
import { createMachine, assign } from 'xstate';

/**
 * transcriptionMachine:
 *  - off => "START_LISTENING" => listening
 *  - listening => on "RECOGNITION_ENDED" -> re-check if we want to restart or go "off"
 *  - error => can "RETRY" => off
 *
 * Context fields:
 *   lastAgentSpeech    Used for final ignoring with FuzzySet
 *   currentAgentWord   Used for partial ignoring with FuzzySet
 *   manuallyStopped    If set true, we don't auto-restart recognition
 *   error              For any error from speech recognition
 */
export const transcriptionMachine = createMachine({
  id: 'transcriptionMachine',
  initial: 'off',
  context: {
    lastAgentSpeech: '',
    currentAgentWord: '',
    error: null,
    manuallyStopped: false
  },
  states: {
    off: {
      on: {
        START_LISTENING: {
          target: 'listening',
          actions: assign({ manuallyStopped: false })
        }
      }
    },

    listening: {
      // We'll specify the invoked service 'transcriptionProcess' in .withConfig(...) from the service file
      invoke: {
        id: 'transcriptionProcess',
        src: 'transcriptionProcess',
        onDone: { target: 'off' },
        // On Web‑Speech failure, immediately try again.
        onError: {
          target: 'listening',   // auto‑restart recognition
          actions: assign({
            error: (_, evt) => evt.data
          })
        }
      },
      on: {
        STOP_LISTENING: {
          target: 'off',
          actions: assign({ manuallyStopped: true })
        },
        // We'll receive 'RECOGNITION_ENDED' from the process if recognition stops unexpectedly
        RECOGNITION_ENDED: [
          {
            cond: (ctx) => !ctx.manuallyStopped,
            target: 'listening' // restart automatically
          },
          { target: 'off' } // if manuallyStopped is true
        ],
        // These events let us store or clear agent speech in context
        SET_AGENT_SPEECH: {
          actions: assign((ctx, evt) => ({
            ...ctx,
            lastAgentSpeech: (evt.phrase || '').trim()
          }))
        },
        CLEAR_AGENT_SPEECH: {
          actions: assign((ctx) => ({
            ...ctx,
            lastAgentSpeech: ''
          }))
        },
        SET_CURRENT_AGENT_WORD: {
          actions: assign((ctx, evt) => ({
            ...ctx,
            currentAgentWord: (evt.word || '').trim()
          }))
        },
        CLEAR_CURRENT_AGENT_WORD: {
          actions: assign((ctx) => ({
            ...ctx,
            currentAgentWord: ''
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