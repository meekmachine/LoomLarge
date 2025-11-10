// facsScheduler.js
import { createMachine, interpret } from 'xstate';
import { facsService } from './facsService.js';

/**
 * The scheduler holds a queue of transitions, each with { type, delay, payload }.
 * After the specified delay, it dispatches an event to facsService.
 */
let schedulerService = null;

export function initFacsScheduler() {
  if (schedulerService) return schedulerService;

  const schedulerMachine = createMachine({
    id: 'facsScheduler',
    initial: 'idle',
    context: { queue: [] },
    states: {
      idle: {
        on: {
          SCHEDULE_TRANSITION: {
            actions: 'enqueue',
            target: 'scheduling'
          }
        }
      },
      scheduling: {
        always: {
          cond: (ctx) => ctx.queue.length === 0,
          target: 'idle'
        },
        after: [
          {
            delay: (ctx) => ctx.queue[0]?.delay || 0,
            target: 'dispatching'
          }
        ]
      },
      dispatching: {
        entry: 'dispatch',
        always: {
          actions: 'dequeue',
          target: 'scheduling'
        }
      }
    }
  },{
    actions: {
      enqueue: (ctx, evt) => {
        ctx.queue.push(evt.transition);
      },
      dequeue: (ctx) => {
        ctx.queue.shift();
      },
      dispatch: (ctx) => {
        if (!facsService || ctx.queue.length === 0) return;
        const { type, payload } = ctx.queue[0];
        facsService.send({ type, ...payload });
      }
    }
  });

  schedulerService = interpret(schedulerMachine).start();
  return schedulerService;
}

/**
 * If you want to schedule an AU or Viseme with a delay,
 * call these from your application or from facsService.
 */
export function scheduleAU(auId, intensity=0, delay=0, notes='') {
  schedulerService?.send({
    type: 'SCHEDULE_TRANSITION',
    transition: {
      delay,
      type: 'SET_AU',
      payload: { auId, intensity, notes }
    }
  });
}

export function scheduleViseme(visemeId, intensity=0, duration=0, delay=0, notes='') {
  schedulerService?.send({
    type: 'SCHEDULE_TRANSITION',
    transition: {
      delay,
      type: 'SET_VISEME',
      payload: { visemeId, intensity, duration, notes }
    }
  });
}