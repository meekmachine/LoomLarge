////////////////////////////////////////////////////////////////////////////////
// 2) transcriptionSchedulerMachine.js (Optional scheduling machine)
//    - If you want a separate machine to handle repeated restarts or
//      housekeeping, you could use something like this. Then your main
//      transcriptionMachine can spawn or interpret it as a child.
////////////////////////////////////////////////////////////////////////////////

import { createMachine, assign } from 'xstate';

/**
 * transcriptionSchedulerMachine:
 *  - ready => on START_RECOGNITION => recognizing
 *  - recognizing => if we get RECOGNITION_ENDED => either restart or go ready
 *
 * context: { manuallyStopped: false }
 */
export const transcriptionSchedulerMachine = createMachine({
  id: 'transcriptionScheduler',
  initial: 'ready',
  context: {
    manuallyStopped: false
  },
  states: {
    ready: {
      on: {
        START_RECOGNITION: {
          target: 'recognizing',
          actions: assign({ manuallyStopped: false })
        }
      }
    },
    recognizing: {
      on: {
        RECOGNITION_ENDED: [
          {
            cond: (ctx) => !ctx.manuallyStopped,
            target: 'restart'
          },
          {
            target: 'ready'
          }
        ],
        STOP_RECOGNITION: {
          target: 'ready',
          actions: assign({ manuallyStopped: true })
        }
      }
    },
    restart: {
      always: {
        target: 'recognizing',
        actions: assign({ manuallyStopped: false })
      }
    }
  }
});