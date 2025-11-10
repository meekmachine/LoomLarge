// VISOS/cognition/conversation/conversationSchedulerMachine.js
import { createMachine, assign, sendParent } from 'xstate';

/**
 * conversationSchedulerMachine:
 *  - Tracks inactivity or user silence in states like "listening" or "thinking."
 *  - No setTimeout calls: we use XState's 'after(...)' + 'delays' config.
 *
 * Context fields:
 *   silentTimeout: number (ms) how long we wait for user speech
 */
export const conversationSchedulerMachine = createMachine({
  id: 'conversationScheduler',
  initial: 'idle',
  context: {
    silentTimeout: 10000 // default 10s
  },
  states: {
    idle: {
      on: {
        START_TIMER: {
          target: 'timing'
        }
      }
    },

    timing: {
      after: {
        SILENT_DELAY: {
          actions: sendParent('NO_RESPONSE'), // tell the parent "no user speech"
          target: 'idle'
        }
      },
      on: {
        RESTART_TIMER: {
          target: 'timing'
        },
        STOP_TIMER: {
          target: 'idle'
        }
      }
    }
  }
},{
  delays: {
    // This config ties to 'after.SILENT_DELAY', returning context.silentTimeout
    SILENT_DELAY: (ctx) => ctx.silentTimeout
  }
});