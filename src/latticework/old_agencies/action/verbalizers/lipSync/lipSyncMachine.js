import { createMachine, assign } from 'xstate';

export const lipSyncMachine = createMachine({
  id: 'lipSync',
  initial: 'idle',
  context: {
    intensity: 90,
    holdMs: 120
  },

  states: {
    idle: {
      on: {
        VISEME_START: {
          target: 'holding',
          actions: ['applyViseme', 'assignHold']
        }
      }
    },

    holding: {
      after: {
        HOLD_TIME: { target: 'idle', actions: 'neutral' }
      },
      on: {
        VISEME_START: {
          target: 'holding',
          actions: ['applyViseme', 'assignHold']
        }
      }
    }
  }
}, {
  delays: {
    HOLD_TIME: (ctx) => ctx.holdMs
  },
  actions: {
    assignHold: assign({ holdMs: (_, e) => e.durMs || 120 }),
    applyViseme: () => {},    // injected by service
    neutral:     () => {}     // injected by service
  }
});