// VISOS/action/visualizers/emotiveExpression/emotiveExpressionService.js

import { interpret } from 'xstate';
import { emotiveSchedulerMachine } from './emotiveSchedulerMachine';
import { createAnimationService } from '../animation/animationService';

/**
 * parseEmojisOrEmotionWords(str):
 *  - Combines emoji -> emotion + text-based words -> emotion
 *  - E.g. "😱" => 'anxious', or "surprise" => 'surprise'
 */
function parseEmojisOrEmotionWords(str) {
  // known emoji => emotion snippet
  const recognizedEmoji = {
    '😞': 'sad',
    '😢': 'sad',
    '😡': 'angry',
    '😱': 'anxious',
    '🙂': 'calm',
    '😅': 'relieved',
    '😔': 'hopeless',
    '😠': 'stressed'
  };

  // known text => snippet key (expand as needed)
  const recognizedWords = {
    'sad': 'sad',
    'angry': 'angry',
    'surprise': 'surprise',
    'happy': 'happy',
    'calm': 'calm',
    'stressed': 'stressed'
    // Add more if you want
  };

  const results = [];

  // A) Parse for emoji
  let i = 0;
  while (i < str.length) {
    let matched = false;
    for (const [emoji, emoKey] of Object.entries(recognizedEmoji)) {
      if (str.slice(i, i + emoji.length) === emoji) {
        results.push({ emotion: emoKey, emoji });
        i += emoji.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }

  // B) Parse for text-based emotion words:
  const tokens = str.split(/\s+/);
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (recognizedWords[lower]) {
      results.push({ emotion: recognizedWords[lower], word: token });
    }
  }

  return results;
}

/**
 * mapEmotionToSnippetKey(emotion)
 *  - direct mapping if snippet keys match the emotion name
 *    or you can define a table if needed: e.g. 'surprise' => 'bigSurpriseAnimation'
 */
function mapEmotionToSnippetKey(emotion) {
  return emotion;
}

/**
 * emotiveExpressionService
 *  - We interpret emotiveSchedulerMachine (a queue system)
 *  - handleWordBoundary => parse emojis or text => queue them
 *  - handleEmotion('surprise') => directly queue that snippet => if idle => start
 */
export function initEmotiveExpressionService() {
  const animService = createAnimationService();

  const customMachine = emotiveSchedulerMachine.withConfig({
    actions: {
      goPlay: (ctx, evt) => {
        const item = ctx.currentItem;
        if (!item?.snippetKey) {
          console.warn('[emotiveExpService] => no snippetKey => skip => DONE_ITEM');
          actor.send('DONE_ITEM');
          return;
        }
        loadAndPlaySnippet(item.snippetKey, item.playbackRate || 1.0, item.intensityScale || 1.0);
      },
      stopAll: (ctx, evt) => {
        console.log('[emotiveExpService] => stopAll => animService.stop() => neutral');
        animService.stop();
        localStorage.removeItem('myAnimationTMP');
      }
    }
  });

  const actor = interpret(customMachine)
    .onTransition((state) => {
      if (state.changed) {
        console.log('[emotiveExpService] => machine =>', state.value, state.context);
      }
    })
    .start();

  // track snippet end => send DONE_ITEM => go idle
  let unsubAnim = animService.onTransition(animState => {
    if (animState.changed && animState.value === 'idle') {
      console.log('[emotiveExpService] => snippet ended => DONE_ITEM => neutral');
      actor.send('DONE_ITEM');
      localStorage.removeItem('myAnimationTMP');
    }
  });
  if (typeof unsubAnim !== 'function') {
    unsubAnim = null;
  }

  function handleWordBoundary(word) {
    console.log('[emotiveExpService] => handleWordBoundary =>', word);
    const found = parseEmojisOrEmotionWords(word);
    found.forEach(eObj => {
      const snippetKey = mapEmotionToSnippetKey(eObj.emotion);
      actor.send({
        type: 'QUEUE_EMOTION',
        item: { snippetKey }
      });
    });
    // if idle => start
    const st = actor.state;
    if (st.value === 'idle' && !st.context.isPlaying && st.context.queue.length > 0) {
      actor.send('START_PLAY');
    }
  }

  function handleEmotion(snippetKey, playbackRate = 1.0, intensityScale = 1.0) {
    console.log('[emotiveExpService] => handleEmotion =>', snippetKey);
    actor.send({
      type: 'QUEUE_EMOTION',
      item: { snippetKey, playbackRate, intensityScale }
    });
    // if idle => start
    const st = actor.state;
    if (st.value === 'idle' && !st.context.isPlaying && st.context.queue.length>0) {
      actor.send('START_PLAY');
    }
  }

  function stop() {
    console.log('[emotiveExpService] => stop() => STOP_ALL');
    actor.send('STOP_ALL');
  }

  function dispose() {
    stop();
    if (unsubAnim) unsubAnim();
    actor.stop();
  }

  /**
   * loadAndPlaySnippet => load from localStorage => animService.load => animService.play
   */
  function loadAndPlaySnippet(snippetKey, rate, scale) {
    console.log('[emotiveExpService] => loadAndPlaySnippet =>', snippetKey);
    const fullKey = `emotionAnimationsList/${snippetKey}`;
    const dataStr = localStorage.getItem(fullKey);
    if (!dataStr) {
      console.warn('[emotiveExpService] => snippet missing => skip => DONE_ITEM');
      actor.send('DONE_ITEM');
      return;
    }
    try {
      const parsed = JSON.parse(dataStr);
      parsed.name = snippetKey;
      parsed.isPlaying = true;
      parsed.loop = false;
      parsed.snippetPlaybackRate = rate;
      parsed.snippetIntensityScale = scale;

      localStorage.setItem('myAnimationTMP', JSON.stringify(parsed));
      animService.loadFromLocal('myAnimationTMP');
      animService.play();
    } catch(err) {
      console.error('[emotiveExpService] => parse error =>', err);
      actor.send('DONE_ITEM');
    }
  }

  return {
    handleWordBoundary,
    handleEmotion,
    stop,
    dispose
  };
}