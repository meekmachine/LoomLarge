import { createMachine } from 'xstate';

/**
 * ctx.list      : [{ visemeId, offsetMs, durMs? }, …]
 * ctx.actorRef  : reference to the lipSyncMachine interpreter
 * ctx.rate      : speech rate factor (unused for now, but kept for parity)
 * ctx.timers    : array of timeout handles
 */

export const lipSyncSchedulerMachine = createMachine({
  id: 'lipSyncScheduler',
  initial: 'idle',
  context: {
    list: [],
    actorRef: null,
    timers: [],
    rate: 1
  },

  states: {
    idle: {
      on: {
        SCHEDULE_SAPI: {
          target: 'running',
          actions: 'assignSchedule'
        }
      }
    },

    running: {
      entry: 'kickoffTimers',
      on: {
        STOP: {
          target: 'idle',
          actions: 'clearTimers'
        }
      },
      after: {
        ALL_DONE: { target: 'idle', actions: 'clearTimers' }
      }
    }
  }
}, {
  delays: {
    // Dynamically compute when all visemes are done
    ALL_DONE: (ctx) => {
      const last = ctx.list.length ? ctx.list[ctx.list.length - 1] : { offsetMs: 0, durMs: 0 };
      return last.offsetMs + (last.durMs || 0) + 50;
    }
  },
  actions: {
    assignSchedule: (ctx, e) => {
      ctx.list = Array.isArray(e.list) ? e.list : [];
      ctx.actorRef = e.actorRef || null;
      ctx.rate = typeof e.rate === "number" ? e.rate : 1;
      ctx.timers = [];
    },
    kickoffTimers: (ctx) => {
      ctx.timers = ctx.list.map(item =>
        setTimeout(() => {
          ctx.actorRef?.send({ type:'VISEME_START', visemeId: item.visemeId, durMs: item.durMs });
        }, item.offsetMs)
      );
    },
    clearTimers: (ctx) => {
      ctx.timers.forEach(clearTimeout);
      ctx.timers = [];
    }
  }
});