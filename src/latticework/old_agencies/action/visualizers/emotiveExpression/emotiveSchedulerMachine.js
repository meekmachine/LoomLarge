// VISOS/action/verbalizers/emotiveExpression/emotiveSchedulerMachine.js
import { createMachine, assign } from 'xstate';

/**
 * emotiveSchedulerMachine:
 *   - A queue-based approach for scheduling multiple emotion snippet items in sequence.
 *   - Each item => { snippetKey, offsetMs?, playbackRate?, intensityScale? }
 *   - States: idle -> delaying -> playing -> checkQueue -> idle
 */
export const emotiveSchedulerMachine = createMachine({
  id: 'emotiveScheduler',
  initial: 'idle',
  context: {
    queue: [],         // array of items
    currentItem: null, // the item being played
    isPlaying: false
  },
  states: {
    idle: {
      on: {
        QUEUE_EMOTION: {
          actions: 'appendItem'
        },
        START_PLAY: {
          cond: 'hasQueue',
          target: 'delaying',
          actions: 'startNext'
        },
        STOP_ALL: { actions: 'stopAll' } // if aggregator calls stopAll while idle
      }
    },
    delaying: {
      // optional offset
      after: {
        NEXT_OFFSET: {
          target: 'playing',
          actions: 'goPlay'
        }
      },
      on: {
        STOP_ALL: {
          target: 'idle',
          actions: 'stopAll'
        },
        QUEUE_EMOTION: {
          actions: 'appendItem'
        }
      }
    },
    playing: {
      // aggregator loads & plays => once snippet ends => DONE_ITEM
      on: {
        DONE_ITEM: {
          target: 'checkQueue',
          actions: 'finishItem'
        },
        STOP_ALL: {
          target: 'idle',
          actions: 'stopAll'
        },
        QUEUE_EMOTION: {
          actions: 'appendItem'
        }
      }
    },
    checkQueue: {
      always: [
        {
          cond: 'hasQueue',
          target: 'delaying',
          actions: 'startNext'
        },
        {
          target: 'idle',
          actions: 'clearPlaying'
        }
      ]
    }
  }
},{
  guards: {
    hasQueue: (ctx) => ctx.queue.length > 0
  },
  delays: {
    // if currentItem.offsetMs => wait that long
    NEXT_OFFSET: (ctx) => {
      const item = ctx.currentItem;
      return item?.offsetMs || 0;
    }
  },
  actions: {
    appendItem: assign((ctx, evt) => {
      if(!evt.item) return ctx;
      return {
        ...ctx,
        queue: [...ctx.queue, evt.item]
      };
    }),
    startNext: assign((ctx) => {
      const [ next, ...rest ] = ctx.queue;
      return {
        ...ctx,
        currentItem: next,
        queue: rest,
        isPlaying: true
      };
    }),
    goPlay: (ctx) => {
      // aggregator will load + play snippet => we override in service
      console.log('[emotiveScheduler] => goPlay => snippet=', ctx.currentItem?.snippetKey);
    },
    finishItem: assign((ctx) => ({
      ...ctx,
      currentItem: null,
      isPlaying: false
    })),
    clearPlaying: assign((ctx) => ({
      ...ctx,
      currentItem: null,
      isPlaying: false
    })),
    stopAll: assign((ctx) => ({
      ...ctx,
      queue: [],
      currentItem: null,
      isPlaying: false
    }))
  }
});