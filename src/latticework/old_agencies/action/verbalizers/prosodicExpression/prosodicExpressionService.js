// VISOS/action/verbalizers/prosodicExpression/prosodicExpressionService.js
import { interpret } from 'xstate';
import { prosodicExpressionMachine } from './prosodicExpressionMachine';
import { createAnimationService }    from '../../visualizers/animation/animationService';

/* ------------------------------------------------------------------ */
/*  CONSTANT KEYS – only ONE key per snippet (no duplicates)          */
/* ------------------------------------------------------------------ */
const BROW_LOOP_KEY   = 'speakingAnimationsList/browRaiseSmall';
const BROW_PULSE_KEY  = 'speakingAnimationsList/browRaiseShort';
const HEAD_LOOP_KEY   = 'speakingAnimationsList/headNodSmall';
const HEAD_PULSE_KEY  = 'speakingAnimationsList/headNodShort';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** ensureLoaded:
 *  – If a snippet (by `name`) is already present in the aggregator → return true.
 *  – Else copy JSON from localStorage -> add `.name` -> save under tmpKey -> loadFromLocal(tmpKey).
 */
function ensureLoaded(aggregator, key, cat = 'default', prio = 0) {
  if (!key) return false;

  // 1. already in memory?
  const sn = aggregator.getState().context.animations.find(a => a.name === key);
  if (sn) return true;

  // 2. locate JSON in localStorage
  const raw = localStorage.getItem(key);
  if (!raw) {
    console.warn('[prosodic] snippet missing in localStorage:', key);
    return false;
  }
  try {
    // parse + label
    const parsed = JSON.parse(raw);
    parsed.name               = key;
    parsed.snippetCategory    = cat;
    parsed.snippetPriority    = prio;
    parsed.currentTime        = 0;
    parsed.isPlaying          = false;   // start/stop decides play state
    parsed.loop               = false;
    parsed.snippetIntensityScale = 1.0;

    // store under a temp key and load via AnimationService
    const tmpKey = `TMP__${key}`;
    localStorage.setItem(tmpKey, JSON.stringify(parsed));
    aggregator.loadFromLocal(tmpKey, cat, prio);
    return true;
  } catch (err) {
    console.error('[prosodic] JSON parse error for', key, err);
    return false;
  }
}

/** startSnippet / stopSnippet – convenience wrappers */
function startSnippet(agg, name, { loop = false, intensity = 1.0 }) {
  if (!name) return;
  ensureLoaded(agg, name);             // guarantees snippet exists
  agg.setSnippetTime(name, 0);
  agg.setSnippetLoop(name, loop);
  agg.setSnippetIntensityScale(name, intensity);
  agg.setSnippetPlaying(name, true);
}

function stopSnippet(agg, name) {
  if (!name) return;
  agg.setSnippetPlaying(name, false);
  agg.setSnippetTime(name, 0);
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */
export function initProsodicExpressionService() {
  const anim = createAnimationService();     // singleton aggregator

  let browLoopLabel = BROW_LOOP_KEY;
  let headLoopLabel = HEAD_LOOP_KEY;
  let lastPulseTime = 0;

  /* ---------------- XState machine → calls helpers ---------------- */
  const actor = interpret(
    prosodicExpressionMachine.withConfig({
      actions: {
        browStart: () => startSnippet(anim, browLoopLabel, { loop:true }),
        browStop:  () => stopSnippet(anim,  browLoopLabel),

        headStart: () => startSnippet(anim, headLoopLabel, { loop:true }),
        headStop:  () => stopSnippet(anim, headLoopLabel)
      }
    })
  ).start();

  /* ---------------- external API ---------------------------------- */
  function startTalking()  { actor.send('START_TALKING'); }
  function stopTalking()   { actor.send('STOP_TALKING');  }

  /** pulse(idx) – every word */
  function pulse(idx = 0) {
    const now = performance.now();
    if (now - lastPulseTime < 120) return;   // debounce
    lastPulseTime = now;

    // quick brow pulse
    startSnippet(anim, BROW_PULSE_KEY, { loop:false, intensity:1 });

    // head nod every second word
    if (idx % 2 === 1) {
      startSnippet(anim, HEAD_PULSE_KEY, { loop:false, intensity:1 });
    }
  }

  function dispose() {
    actor.stop();
    anim.dispose();
  }

  /* guarantee initial load of loop snippets so first call is instant */
  ensureLoaded(anim, BROW_LOOP_KEY, 'brow', 2);
  ensureLoaded(anim, HEAD_LOOP_KEY, 'head', 2);
  ensureLoaded(anim, BROW_PULSE_KEY, 'brow', 5);
  ensureLoaded(anim, HEAD_PULSE_KEY, 'head', 5);

  return { startTalking, stopTalking, pulse, dispose };
}