////////////////////////////////////////////////////////////////////////////////
// transcriptionSchedulerMachine.js
// ---------------------------------------------------------------------------
// A tiny supervisor that decides whether to restart recognition after it
// ends.  The main transcriptionMachine invokes Speech-Recognition; this
// scheduler only handles the “should we auto-restart?” policy.
// ---------------------------------------------------------------------------

import { createMachine, assign } from 'xstate';

/**
 * transcriptionSchedulerMachine
 *
 *  ready ── START_RECOGNITION ─▶ recognizing
 *
 *  recognizing
 *      │  RECOGNITION_ENDED  (manuallyStopped = false) ─▶ restart
 *      │  RECOGNITION_ENDED  (manuallyStopped = true)  ─▶ ready
 *      └─ STOP_RECOGNITION ─▶ ready
 *
 *  restart  ── (always) ─▶ recognizing
 *
 * context:
 *   manuallyStopped   – if true, a STOP_RECOGNITION request came from UI /
 *                       higher-level service and we should not auto-restart
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

    /* transient state: immediately re-enters recognizing */
    restart: {
      always: {
        target: 'recognizing',
        actions: assign({ manuallyStopped: false })
      }
    }
  }
});