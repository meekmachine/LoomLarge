// VISOS/cognition/conversation/conversationMachine.js
import { createMachine, assign, spawn } from 'xstate';
import { conversationSchedulerMachine } from './conversationSchedulerMachine';

/**
 * conversationMachine:
 *  - States:
 *    idle -> listening -> thinking -> talking -> interrupted -> error
 *  - We spawn or invoke conversationSchedulerMachine in 'listening' or 'thinking' 
 *    to detect user inactivity, dispatching NO_RESPONSE if user is silent too long.
 *
 * context:
 *  lastUserText, lastAgentText
 *  schedulerRef?  ref to a spawned child machine
 */
export const conversationMachine = createMachine({
  id: 'conversationMachine',
  initial: 'idle',
  context: {
    lastUserText: '',
    lastAgentText: '',
    schedulerRef: null
  },
  states: {
    idle: {
      on: {
        START_CONVERSATION: 'listening'
      }
    },

    listening: {
      entry: 'spawnScheduler',
      on: {
        PARTIAL_USER_SPEECH: {
          actions: ['assignUserPartial', 'restartTimer']
        },
        FINAL_USER_SPEECH: {
          target: 'thinking',
          actions: ['assignUserFinal', 'stopTimer']
        },
        NO_RESPONSE: {
          target: 'listening'
        },
        CANCEL: 'idle'
      }
    },

    thinking: {
      entry: 'spawnScheduler',
      on: {
        AGENT_RESPONSE: {
          target: 'talking',
          actions: 'assignAgentText'
        },
        NO_RESPONSE: {
          target: 'listening'
        },
        CANCEL: 'idle',
        STOP_TIMER: { actions: 'stopTimer' }
      }
    },

    talking: {
      // no scheduling here, or we could do inactivity if user partial is not recognized
      on: {
        USER_INTERRUPTED: 'interrupted',
        AGENT_DONE:       'listening'
      }
    },

    interrupted: {
      on: {
        PARTIAL_USER_SPEECH: {
          actions: 'assignUserPartial'
        },
        FINAL_USER_SPEECH: {
          target: 'thinking',
          actions: 'assignUserFinal'
        },
        RESUME: 'listening'
      }
    },

    error: {
      on: { RETRY: 'idle' }
    }
  }
},{
  actions: {
    assignUserPartial: assign((ctx, evt) => ({
      ...ctx,
      lastUserText: evt.transcript
    })),
    assignUserFinal: assign((ctx, evt) => ({
      ...ctx,
      lastUserText: evt.transcript
    })),
    assignAgentText: assign((ctx, evt) => ({
      ...ctx,
      lastAgentText: evt.text
    })),

    spawnScheduler: assign((ctx) => {
      // spawn a new scheduler machine with a certain silentTimeout
      const schedulerRef = spawn(
        conversationSchedulerMachine.withContext({
          silentTimeout: 10000
        }),
        'convScheduler'
      );
      // start the timer
      schedulerRef.send('START_TIMER');
      return { ...ctx, schedulerRef };
    }),

    restartTimer: (ctx) => {
      if (ctx.schedulerRef) {
        ctx.schedulerRef.send('RESTART_TIMER');
      }
    },
    stopTimer: (ctx) => {
      if (ctx.schedulerRef) {
        ctx.schedulerRef.send('STOP_TIMER');
      }
    }
  }
});