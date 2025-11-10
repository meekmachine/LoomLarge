// surveyScheduler.js
import { createMachine, assign, sendParent } from 'xstate';

export const surveySchedulerMachine = createMachine({
  id: 'surveyScheduler',
  initial: 'idle',
  context: { timer: null },
  states: {
    idle: {
      on: {
        START_ASK:     'asking',
        START_LISTEN:  'listening',
        START_REFLECT: 'reflecting',
        CANCEL:        { actions: 'clearTimer' }
      }
    },
    asking: {
      entry: 'startAskTimer',
      on: { CANCEL: { target: 'idle', actions: 'clearTimer' } }
    },
    listening: {
      entry: 'startListenTimer',
      on: { CANCEL: { target: 'idle', actions: 'clearTimer' } }
    },
    reflecting: {
      entry: 'startReflectTimer',
      on: { CANCEL: { target: 'idle', actions: 'clearTimer' } }
    }
  }
}, {
  actions: {
    startAskTimer: assign(ctx => {
      clearTimeout(ctx.timer);
      const timer = setTimeout(() => sendParent('ASK_TIMEOUT'), 10000);
      return { timer };
    }),
    startListenTimer: assign(ctx => {
      clearTimeout(ctx.timer);
      const timer = setTimeout(() => sendParent('LISTEN_TIMEOUT'), 15000);
      return { timer };
    }),
    startReflectTimer: assign(ctx => {
      clearTimeout(ctx.timer);
      const timer = setTimeout(() => sendParent('REFLECT_TIMEOUT'), 500);
      return { timer };
    }),
    clearTimer: ctx => {
      clearTimeout(ctx.timer);
    }
  }
});