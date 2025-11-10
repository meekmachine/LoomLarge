// surveyConversationService.js
import { interpret } from 'xstate';
import FuzzySet from 'fuzzyset';
import { surveyConversationMachine } from './surveyConversationMachine';
import { initSurveyDataService } from '../surveyData/surveyDataService';
import { SURVEY_TEXT, SURVEY_OPTIONS } from '../surveyData/surveyDataMachine';
import { initConversationService } from '../conversation/conversationService';

function createFuzzySet(arr) {
  return FuzzySet(arr);
}

function handleFinalAnswer(answer, isUI, opts) {
  if (isUI) {
    const lower = answer.trim().toLowerCase();
    return opts.find(o => o.toLowerCase() === lower) || null;
  }
  const fs = createFuzzySet(opts);
  const results = fs.get(answer, null, 0.75);
  return results && results[0] && results[0][1] || null;
}

function* postAnswerFlow(idx, opts, setAnswer, nextQuestion, endSurvey, finalAnswer, finalIsUI) {
  yield finalIsUI
    ? `Ok, you clicked on ${finalAnswer}.`
    : `Ok, you said ${finalAnswer}.`;

  if (idx >= SURVEY_TEXT.length - 1) {
    endSurvey();
    return { type: 'END' };
  }

  // Immediately proceed to next question after reflecting
  nextQuestion();
  return { type: 'PROCEED' };
}

export function initSurveyConversationService({
  ttsService,
  onUserSpeechPartial = () => {},
  onUserSpeechFinal   = () => {},
  onAgentUtterance    = () => {}
}) {
  const { actor: dataActor, setAnswer, nextQuestion, endSurvey, getScore, getResultMessage } = initSurveyDataService();

  const convoActor = interpret(
    surveyConversationMachine.withContext({
      idx: 0,
      total: SURVEY_TEXT.length,
      partialAnswer: '',
      lastAnswer: ''
    })
  ).start();

  // Keep conversation machine in sync when UI changes the question index
  dataActor.subscribe((state) => {
    const evt = state.event;
    if (evt.type === 'NEXT' || evt.type === 'PREVIOUS') {
      const newIdx = state.context.index;
      // Tell the conversation machine the question has changed via UI
      convoActor.send({ type: 'UI_QUESTION_CHANGED', idx: newIdx });
      // After UI question change, resume generator and cause agent to speak question via normal flow
      storedUserAnswer = '';
      storedIsUI = true;
      inner.service.send({ type: 'FINAL_USER_SPEECH', transcript: '', isUI: true });
    }
  });

  let storedUserAnswer = null;
  let storedIsUI = false;

  convoActor.onTransition((st) => {
    if (st.event.type === 'FINAL_USER_ANSWER' && st.value === 'interrupted') {
      storedUserAnswer = st.event.text;
      storedIsUI = !!st.event.isUI;
    }
  });

  const inner = initConversationService({
    chatFlowGenerator: () => makeSurveyFlow(),
    ttsService,
    onUserSpeechPartial: (txt) => {
      const isIntr = convoActor.state.matches('interrupted');
      onUserSpeechPartial(txt, isIntr);
      convoActor.send({ type: 'PARTIAL_USER_ANSWER', text: txt });
    },
    onUserSpeechFinal: (txt, isIntr, isUI = false) => {
      onUserSpeechFinal(txt, isIntr);
      convoActor.send({ type: 'FINAL_USER_ANSWER', text: txt, isUI });
    },
    onAgentUtterance: (txt) => {
      onAgentUtterance(txt);
      const lc = txt.trim().toLowerCase();
      convoActor.send(lc.startsWith('ok') ? 'REFLECT_SPOKEN' : 'QUESTION_SPOKEN');
    }
  });

  function* makeSurveyFlow() {
    while (true) {
      const idx = dataActor.getSnapshot().context.index;
      if (idx >= SURVEY_TEXT.length) {
        const score = getScore();
        const message = getResultMessage(score);
        yield `Survey complete. Your total score is ${score}. ${message}`;
        return { type: 'END' };
      }

      // Always yield the question text first
      yield SURVEY_TEXT[idx];

      // Get the answer: either from UI or from user speech
      let finalAnswer, finalIsUIFlag;
      if (storedUserAnswer) {
        finalAnswer = storedUserAnswer;
        finalIsUIFlag = storedIsUI;
        storedUserAnswer = null;
        storedIsUI = false;
      } else {
        // Get the answer from the user (yielded value)
        finalAnswer = yield;
        finalIsUIFlag = false;
      }

      // Special review handling
      if (typeof finalAnswer === 'string' && finalAnswer.toLowerCase() === 'review') {
        yield 'Let’s review the question.';
        yield SURVEY_TEXT[idx];
        return { type: 'REVIEW' };
      }

      const opts = SURVEY_OPTIONS[idx];
      const matched = handleFinalAnswer(finalAnswer, finalIsUIFlag, opts);
      if (!matched) {
        yield 'I did not understand. Please pick one of the listed options.';
        continue;
      }
      setAnswer(matched);
      const action = yield* postAnswerFlow(
        idx,
        opts,
        setAnswer,
        nextQuestion,
        endSurvey,
        matched,
        finalIsUIFlag
      );
      if (action.type === 'PROCEED') continue;
      if (action.type === 'REVIEW') continue;
      break;
    }
  }

  function submitPartial(text, isUI = false) {
    inner.service.send({ type: 'PARTIAL_USER_SPEECH', transcript: text, isUI });
  }

  function submitFinal(text, isUI = false) {
    storedUserAnswer = text;
    storedIsUI = isUI;

    ttsService?.stopSpeech?.();
    inner.service.send({ type: 'USER_INTERRUPTED' });
    inner.service.send({ type: 'FINAL_USER_SPEECH', transcript: text, isUI });
  }

  return {
    start() {
      convoActor.send('START_SURVEY');
      inner.start();
    },
    stop() {
      inner.stop();
      convoActor.stop();
      dataActor.stop();
    },
    submitPartial,
    submitFinal,
    interrupt() {
      ttsService?.stopSpeech?.();
      inner.service.send({ type: 'USER_INTERRUPTED' });
      convoActor.send('USER_INTERRUPTED');
    },
    convoActor,
    dataActor,
  };
}