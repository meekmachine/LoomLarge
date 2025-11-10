

import { interpret } from 'xstate';
import { stressReconcilerMachine } from './stressReconcilerMachine.js';

/* system prompt helper */
function systemPrompt() {
  return {
    role: 'system',
    content:
`You are Paul, an empathetic virtual counsellor administering the 10‑item PSS questionnaire. 
Follow the exact instructions (emojis, acknowledgements, —DONE— cue) and keep the dialogue on‑task.`
  };
}

/**
 * initStressReconciler
 * @param {string} apiKey – OpenAI key
 * @param {string} [model='gpt-4o']
 */
export function initStressReconciler({ apiKey, model = 'gpt-4o' } = {}) {

  const history = [systemPrompt()];

  /* interpreter */
  const actor = interpret(
    stressReconcilerMachine.withConfig({
      services: {
        callOpenAI: (ctx) => async () => {
          history.push({ role: 'user', content: ctx.userText });

          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: history,
              max_tokens: 200
            })
          });

          const data = await resp.json();
          if (!resp.ok || !data.choices) {
            throw new Error(`OpenAI error ${resp.status}: ${JSON.stringify(data)}`);
          }

          const assistant = data.choices[0].message.content.trim();
          history.push({ role: 'assistant', content: assistant });
          return assistant;
        }
      }
    })
  ).start();

  /* public facade */
  function request(userText = '') {
    return new Promise((resolve, reject) => {
      const sub = actor.subscribe((state) => {
        if (state.matches('success')) {
          sub.unsubscribe();
          resolve(state.context.assistantText);
        }
        if (state.matches('failure')) {
          sub.unsubscribe();
          reject(state.context.error);
        }
      });
      actor.send({ type: 'REQUEST', userText });
    });
  }

  function resetHistory() {
    history.length = 0;
    history.push(systemPrompt());
  }

  return {
    request,
    resetHistory,
    get history() { return [...history]; },
    dispose() { actor.stop(); }
  };
}