// VISOS/action/verbalizers/lipSync/lipSyncService.js
// ─────────────────────────────────────────────────────────────────────────────
import { interpret } from 'xstate';
import { lipSyncMachine } from './lipSyncMachine';          // Web-Speech only
import { neutralVisemes } from '../../../cognition/facs/facsService';
import { createAnimationService } from '../../visualizers/animation/animationService';

/**
 * initLipSyncService({ engine:'webSpeech' | 'sapi', rate })
 *   • Web-Speech: uses a rolling visemeSnippet updated in real time.
 *   • SAPI:  receives the *entire* viseme array once, converts it to a
 *            visemeSnippet, and lets AnimationService play it.
 */
export function initLipSyncService({ engine = 'webSpeech', rate = 1 } = {}) {

  // ───────────────────────────────────────────────
  //  WEB-SPEECH BRANCH  (unchanged)
  // ───────────────────────────────────────────────
  if (engine === 'webSpeech') {
    const animSvc       = createAnimationService();   // singleton
    const SN_NAME       = 'webSpeechLive';
    const HOLD_SEC      = 0.14;                       // 140 ms hold
    const curves        = {};                         // { visId: [ {time,int}, … ] }
    let   baseTimeSec   = 0;
    let   snippetLoaded = false;

    function ensureSnippetLoaded() {
      if (snippetLoaded) return;
      animSvc.loadVisemeSnippet({
        name: SN_NAME,
        curves,
        isPlaying: true,
        loop: false,
        maxTime: 0
      }, -100);
      snippetLoaded = true;
    }

    function addKeyFrames(id, tSec) {
      curves[id].push({ time: tStart, intensity: onsetIntensity });
        const newMax = tSec + HOLD_SEC + 0.1;
        animSvc.setSnippetMaxTime(SN_NAME, newMax);
        animSvc.setAUCurve(SN_NAME, id, curves[id]);   // live update
   }

    return {
      /* Called per VISEME_START from Web-Speech TTS */
      handleViseme(id /* 0-21 */, durMs = 120) {
        const nowSec = performance.now() / 1000;
        if (baseTimeSec === 0) baseTimeSec = nowSec;
        const t = nowSec - baseTimeSec;

        ensureSnippetLoaded();
        addKeyFrames(id, t);
        animSvc.flush();        // immediate pose
      },

      stop() {
        neutralVisemes();
        animSvc.removeAnimation(SN_NAME);
        snippetLoaded = false;
        baseTimeSec   = 0;
        Object.keys(curves).forEach(k => delete curves[k]);
      },

      dispose() {
        this.stop();
        animSvc.release?.();
      }
    };
  }

  // ───────────────────────────────────────────────
  //  SAPI BRANCH  (new builder)
  // ───────────────────────────────────────────────
  const animSvc    = createAnimationService();   // singleton
  let   currentClip = null;                      // active snippet name

  /* Build ONE animation snippet from raw SAPI viseme array.
   *   • visemeSnippet : 21 curves (IDs 0‑20), each idle when not active.
   */
  /* =========================================================================
   * buildVisemeSnippet ── Build ONE visemeSnippet from a raw SAPI viseme array.
   * Every viseme curve:
   *   • Starts at 0 % at t = 0
   *   • Jumps to <onsetIntensity>% at its onset time
   *   • Holds that value for 90 % of the phoneme duration
   *   • Releases to 0 % at the end of the phoneme
   * The snippetPlaybackRate is set to the TTS rate so the timeline remains
   * correct when the engine speaks faster / slower than 1×.
   * ========================================================================= */
  function buildVisemeSnippet(arr, onsetIntensity = 90, speechRate = 1) {
    const curves = {};
    for (let i = 0; i <= 20; i++) curves[i] = [{ time: 0, intensity: 0 }];

    // SAPI offsets & durations are already in milliseconds ➞ seconds helper
    const toSec = (ms) => ms / 1000;

    let maxTime = 0;
    arr.forEach((v, idx) => {
      if (!v) return;
      const id = v.number;
      if (typeof id !== 'number' || id < 0 || id > 20) return;

      const onsetMs = v.offset ?? v.audioPosition ?? 0;
      const durMs =
        v.duration ??
        ((arr[idx + 1]?.offset ?? arr[idx + 1]?.audioPosition ?? (onsetMs + 140)) -
          onsetMs);

      const tStart = +toSec(onsetMs).toFixed(3);
      const hold   = durMs * 0.9;                      // 90 % hold
      const tEnd   = +(tStart + toSec(hold)).toFixed(3);

      curves[id].push(
        { time: tStart, intensity: onsetIntensity },
        { time: tEnd,   intensity: 0 }
      );

      maxTime = Math.max(maxTime, tEnd + 0.1);
    });

    // Sort each curve and ensure a closing zero at maxTime
    Object.values(curves).forEach(frames => {
      frames.sort((a, b) => a.time - b.time);
      const last = frames[frames.length - 1];
      if (last.time < maxTime || last.intensity !== 0) {
        frames.push({ time: +maxTime.toFixed(3), intensity: 0 });
      }
    });

    return {
      name:                `sapi_vis_${Date.now()}`,
      curves,
      isPlaying:           true,
      loop:                false,
      maxTime,
      snippetPlaybackRate: speechRate,
      snippetIntensityScale: 1
    };
  }

  return {
    /**
     * Call *once per utterance* when SAPI gives you the full viseme array.
     * visemeArr = [{ number, offset, duration }, …]
     */
    handleSapiVisemes(visemeArr = []) {
      if (!Array.isArray(visemeArr) || visemeArr.length === 0) return;

      const snippet = buildVisemeSnippet(visemeArr, 90, rate);

      /* 🔵  DEBUG: log the full JSON we’re about to play */
      console.log('SAPI‑generated viseme snippet ⤵︎');
      console.log(JSON.stringify(snippet, null, 2));

      if (currentClip) animSvc.removeAnimation(currentClip);
      animSvc.loadVisemeSnippet(snippet, -100);   // flag → visemeSnippet
      currentClip = snippet.name;

      animSvc.flush();  // show first key‑frame immediately
    },

    /** Interrupt or dispose mid‑utterance. */
    stop() {
      if (currentClip) {
        animSvc.removeAnimation(currentClip);
        currentClip = null;
      }
    },

    dispose() {
      this.stop();
      animSvc.release?.();
    }
  };
}