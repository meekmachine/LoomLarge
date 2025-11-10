

import { createMachine, assign } from 'xstate';

/**
 * ttsMachine:
 *  - Manages the high-level TTS state: idle → loadingAudio → speaking → done/stopped/failed.
 *  - No hard-coded delays or “magic intervals” here; it’s purely event-driven.
 *
 * Context fields:
 *   engine           "webSpeech" or "sapi"
 *   tokens           parsed tokens (see ttsUtils)
 *   strippedText     text without emojis
 *   audioDataBase64  base64 audio data (SAPI) or null (for local Web Speech)
 *   visemes          array of viseme data (SAPI) or empty
 *   currentWord      the current word being spoken
 *   currentIndex     index of that word
 *   error            error message or object
 */
export const ttsMachine = createMachine({
  id: 'ttsMachine',
  initial: 'idle',
  context: {
    engine:        'webSpeech',
    tokens:        [],
    strippedText:  '',
    audioDataBase64: null,
    visemes:       [],
    currentWord:   '',
    currentIndex:  -1,
    error:         null
  },

  states: {
    idle: {
      on: {
        START_SPEECH: {
          target: 'loadingAudio',
          actions: 'assignStart'
        }
      }
    },

    loadingAudio: {
      // Fetch or prepare audio data (for SAPI, do the HTTP request; for local, do nothing).
      invoke: {
        id: 'fetchOrPrepareAudio',
        src: 'fetchOrPrepareAudio'
      },
      on: {
        DONE: {
          target: 'speaking',
          actions: assign({
            audioDataBase64: (_, e) => e.data.audioDataBase64,
            visemes:        (_, e) => e.data.visemes || []
          })
        },
        ERROR: {
          target: 'failed',
          actions: assign({ error: (_, e) => e.data })
        }
      }
    },

    speaking: {
      // TTS is actively speaking here; scheduling/timing is delegated to ttsSchedulerMachine.
      entry: 'startSpeaking',
      on: {
        BOUNDARY: {
          actions: assign({
            currentWord:  (_, e) => e.word,
            currentIndex: (_, e) => e.index
          })
        },
        DONE_SPEAKING: 'done',
        STOP:          'stopped'
      }
    },

    stopped: {
      // Speech was interrupted or canceled early.
      entry: 'stopSpeech',
      on: {
        START_SPEECH: {
          target: 'loadingAudio',
          actions: 'assignStart'
        }
      }
    },

    done: {
      // Finished naturally; returns to idle.
      on: {
        START_SPEECH: {
          target: 'loadingAudio',
          actions: 'assignStart'
        }
      }
    },

    failed: {
      // Some error happened (e.g. network error for SAPI).
      type: 'final'
    }
  }
}, {
  actions: {
    /**
     * Assign context fields from the START_SPEECH event.
     * No timeouts or artificial delays here.
     */
    assignStart: assign((_, e) => ({
      engine:         e.engine,
      tokens:         e.tokens,
      strippedText:   e.strippedText,
      audioDataBase64: null,
      visemes:        [],
      currentWord:    '',
      currentIndex:   -1,
      error:          null
    }))
    // The actual startSpeaking/stopSpeech logic is injected in ttsService.js via .withConfig
  }
});