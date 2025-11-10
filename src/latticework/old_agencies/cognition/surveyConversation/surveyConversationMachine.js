// surveyConversationMachine.js - REWRITE for ask→listen→reflect→proceed with timeouts, SKIP, REVIEW, UI-driven changes
import { createMachine, assign, spawn, sendParent } from 'xstate';

// Timer child machine for timeouts
const surveyTimerMachine = createMachine({
  id: 'surveyTimer',
  initial: 'idle',
  context: { timeoutMs: 8000, handle: null },
  states: {
    idle: {
      on: { START: 'running' }
    },
    running: {
      entry: 'startTimer',
      exit: 'clearTimer',
      on: { CANCEL: 'idle' }
    }
  }
}, {
  actions: {
    startTimer: (ctx, evt) => {
      ctx.handle = setTimeout(() => {
        if (typeof ctx.sendParent === 'function') {
          ctx.sendParent('TIMEOUT');
        }
      }, ctx.timeoutMs);
    },
    clearTimer: (ctx) => {
      if (ctx.handle) clearTimeout(ctx.handle);
    }
  }
});

export const surveyConversationMachine = createMachine({
  id: 'surveyConversation',
  initial: 'idle',
  context: {
    idx: 0,
    total: 0,
    partialAnswer: '',
    lastAnswer: '',
    timerRef: undefined,
    skipRequested: false,
    reviewRequested: false,
    awaitingUIChange: false
  },
  states: {
    idle: {
      on: {
        START_SURVEY: {
          target: 'asking',
          actions: assign({ idx: 0 })
        }
      }
    },
    asking: {
      entry: ['cancelTimer', 'resetTimer'],
      exit: 'cancelTimer',
      on: {
        // The agent has spoken the question, now listen
        QUESTION_SPOKEN: 'listening',
        // UI or external causes question change
        UI_QUESTION_CHANGED: {
          actions: ['updateIdxFromUI'],
          target: 'asking'
        },
        // Timeout: repeat question
        TIMEOUT: { target: 'asking' },
        // User interrupts to skip or review
        SKIP: {
          actions: assign({ skipRequested: (_) => true }),
          target: 'reflecting'
        },
        REVIEW: {
          actions: assign({ reviewRequested: (_) => true }),
          target: 'reviewing'
        },
        // Proceed/next question (from UI or logic)
        PROCEED: [
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1 }),
            target: 'asking'
          }
        ]
      }
    },
    listening: {
      entry: ['cancelTimer', 'resetTimer'],
      exit: 'cancelTimer',
      on: {
        PARTIAL_USER_ANSWER: {
          actions: assign({
            partialAnswer: (_, e) => e.text
          })
        },
        FINAL_USER_ANSWER: {
          target: 'reflecting',
          actions: assign({
            lastAnswer: (_, e) => e.text,
            partialAnswer: () => ''
          })
        },
        // UI or external causes question change
        UI_QUESTION_CHANGED: {
          actions: ['updateIdxFromUI'],
          target: 'asking'
        },
        // Timeout: repeat question
        TIMEOUT: { target: 'asking' },
        // User interrupts to skip or review
        SKIP: {
          actions: assign({ skipRequested: (_) => true }),
          target: 'reflecting'
        },
        REVIEW: {
          actions: assign({ reviewRequested: (_) => true }),
          target: 'reviewing'
        },
        // Proceed/next question (from UI or logic)
        PROCEED: [
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1 }),
            target: 'asking'
          }
        ]
      }
    },
    reflecting: {
      entry: ['cancelTimer', 'resetTimer'],
      exit: 'cancelTimer',
      on: {
        // After reflection is spoken, proceed to next question or finish
        REFLECT_SPOKEN: [
          {
            cond: (ctx) => ctx.skipRequested,
            actions: assign({ skipRequested: () => false }),
            target: 'asking'
          },
          {
            actions: assign({ skipRequested: () => false }),
            cond: (ctx) => false, // preserve order, fallback
            target: 'asking'
          },
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1, skipRequested: () => false }),
            target: 'asking'
          }
        ],
        // UI or external causes question change
        UI_QUESTION_CHANGED: {
          actions: [
            'updateIdxFromUI',
            assign({ skipRequested: () => false })
          ],
          target: 'asking'
        },
        // Timeout: just proceed
        TIMEOUT: [
          {
            cond: (ctx) => ctx.skipRequested,
            actions: assign({ skipRequested: () => false }),
            target: 'asking'
          },
          {
            actions: assign({ skipRequested: () => false }),
            cond: (ctx) => false,
            target: 'asking'
          },
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1, skipRequested: () => false }),
            target: 'asking'
          }
        ],
        // Explicit proceed
        PROCEED: [
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1, skipRequested: () => false }),
            target: 'asking'
          }
        ]
      }
    },
    reviewing: {
      entry: ['cancelTimer', 'resetTimer'],
      exit: 'cancelTimer',
      on: {
        // Once review is spoken, go back to asking (same idx)
        REVIEW_SPOKEN: {
          actions: assign({ reviewRequested: () => false }),
          target: 'asking'
        },
        // UI or external causes question change
        UI_QUESTION_CHANGED: {
          actions: [
            'updateIdxFromUI',
            assign({ reviewRequested: () => false })
          ],
          target: 'asking'
        },
        // Timeout: just proceed
        TIMEOUT: [
          {
            actions: assign({ reviewRequested: () => false }),
            target: 'asking'
          }
        ],
        // Explicit proceed
        PROCEED: [
          {
            cond: (ctx) => ctx.idx + 1 >= ctx.total,
            target: 'finished'
          },
          {
            actions: assign({ idx: (ctx) => ctx.idx + 1 }),
            target: 'asking'
          }
        ]
      }
    },
    finished: {
      type: 'final'
    }
  }
}, {
  actions: {
    resetTimer: assign({
      timerRef: (ctx) => spawn(surveyTimerMachine, 'surveyTimer')
    }),
    cancelTimer: (ctx) => {
      if (ctx.timerRef && ctx.timerRef.send) ctx.timerRef.send('CANCEL');
    },
    updateIdxFromUI: assign({
      idx: (ctx, evt) => typeof evt.idx === 'number' ? evt.idx : ctx.idx
    })
  }
});