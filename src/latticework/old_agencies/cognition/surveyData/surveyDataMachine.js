// VISOS/cognition/surveyData/surveyDataMachine.js
// -------------------------------------------------
// Keeps track of (a) current question index and
// (b) canonical answers keyed by index.
//
// It is deliberately simple: the survey-conversation
// layer enforces bounds and decides when to dispatch
// NEXT or END.
//
// Exports:
//   • surveyDataMachine  – XState machine
//   • SURVEY_TEXT        – array of question text
//   • SURVEY_OPTIONS     – array[questionIdx] = [opts]

import { createMachine, assign } from 'xstate';
import QUESTIONS from './surveyQuestions.json';

export const SURVEY_TEXT    = QUESTIONS.map(q => q.text);
export const SURVEY_OPTIONS = QUESTIONS.map(q => q.options ?? []);

/* ─────────────────────────────────────────────── */

export const surveyDataMachine = createMachine({
  id: 'surveyData',
  initial: 'inProgress',

  /* ─ context ─
     index   → current question #
     answers → { [idx]: canonicalAnswer }
  */
  context: {
    index  : 0,
    answers: {}
  },

  states: {
    /* survey still running */
    inProgress: {
      on: {
        /* store answer for *current* index */
        SET_ANSWER: {
          actions: assign((ctx, evt) => ({
            answers: { ...ctx.answers, [ctx.index]: evt.text }
          }))
        },

        /* advance index (guarded by caller so we never overflow) */
        NEXT: {
          actions: assign({ index: (ctx) => ctx.index + 1 })
        },
        /* go to previous index but not below 0 */
        PREVIOUS: {
          actions: assign({ index: (ctx) => Math.max(0, ctx.index - 1) })
        },

        /* caller signals completion */
        END: { target: 'finished' }
      }
    },

    finished: { type: 'final' }
  }
});