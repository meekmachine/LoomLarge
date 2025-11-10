// VISOS/action/verbalizers/prosodicExpressionMachine.js
import { createMachine } from 'xstate';

/**
 * prosodicExpressionMachine:
 * 
 * A parallel machine controlling brow + head loops.
 * 
 * Each sub-state:
 *   - idle
 *   - active
 *   - stopping (briefly) => goes to idle after a short delay
 * 
 * We have events:
 *   - START_TALKING => idle->active
 *   - STOP_TALKING  => active->stopping => after delay => idle
 *
 * If you only want them to remain 'active' indefinitely, you can choose
 * not to send STOP_TALKING except on punctuation or silence.
 */
export const prosodicExpressionMachine = createMachine({
  id: 'prosodicExpressionMachine',
  type: 'parallel',
  states: {
    browControl: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            START_TALKING: { target: 'active', actions: 'browStart' }
          }
        },
        active: {
          on: {
            STOP_TALKING: { target: 'stopping', actions: 'browStop' }
          }
        },
        stopping: {
          after: {
            BROW_STOP_DELAY: { target: 'idle' }
          }
        }
      }
    },
    headControl: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            START_TALKING: { target: 'active', actions: 'headStart' }
          }
        },
        active: {
          on: {
            STOP_TALKING: { target: 'stopping', actions: 'headStop' }
          }
        },
        stopping: {
          after: {
            HEAD_STOP_DELAY: { target: 'idle' }
          }
        }
      }
    }
  }
},{
  delays: {
    // Brow => short fade => 200ms
    BROW_STOP_DELAY: 200,
    // Head => slightly longer => 300ms
    HEAD_STOP_DELAY: 300
  }
});