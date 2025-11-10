

import { createMachine, assign } from 'xstate';

/**
 * stressReconcilerMachine
 * idle → requesting → success / failure → idle
 */
export const stressReconcilerMachine = createMachine({
  id: 'stressReconciler',
  initial: 'idle',
  context: {
    userText:      '',
    assistantText: '',
    error:         null
  },
  states: {
    idle: {
      on: {
        REQUEST: {
          target: 'requesting',
          actions: assign({
            userText:      (_, e) => e.userText,
            assistantText: ()    => '',
            error:         ()    => null
          })
        }
      }
    },

    requesting: {
      invoke: {
        id: 'openaiCall',
        src: 'callOpenAI',
        onDone: {
          target: 'success',
          actions: assign({ assistantText: (_, e) => e.data })
        },
        onError: {
          target: 'failure',
          actions: assign({ error: (_, e) => e.data })
        }
      }
    },

    success: { after: { 10: 'idle' } },
    failure: { after: { 10: 'idle' } }
  }
});