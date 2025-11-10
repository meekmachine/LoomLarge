// surveyDataService.js
import { interpret } from 'xstate';
import { surveyDataMachine } from './surveyDataMachine';

export function initSurveyDataService() {
  const actor = interpret(surveyDataMachine).start();

  function setAnswer(text) {
    actor.send({ type: 'SET_ANSWER', text });
  }
  function nextQuestion() {
    actor.send('NEXT');
  }
  function previousQuestion() {
    actor.send('PREVIOUS');
  }
  function endSurvey() {
    actor.send('END');
  }

  function getScore() {
    const answers = actor.getSnapshot().context.answers;
    return Object.values(answers)
      .map((val) => parseInt(val, 10))
      .filter((n) => !isNaN(n))
      .reduce((acc, n) => acc + n, 0);
  }

  function getResultMessage(score = getScore()) {
    if (score <= 13) return 'Your stress level is low.';
    if (score <= 26) return 'Your stress level is moderate.';
    return 'Your stress level is high.';
  }

  return {
    actor,
    setAnswer,
    nextQuestion,
    previousQuestion,
    endSurvey,
    getScore,
    getResultMessage,
    subscribe: (...args) => actor.subscribe(...args)
  };
}