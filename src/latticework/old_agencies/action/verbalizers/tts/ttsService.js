// VISOS/action/verbalizers/tts/ttsService.js
// ────────────────────────────────────────────────────────────────
// Thin façade that delegates all lip-sync work to the chosen
// implementation (Web-Speech vs SAPI).  All heavy lifting lives
// in lipSyncService; we only expose a back-compat surface.
// ────────────────────────────────────────────────────────────────

import { initLipSyncService } from '../lipSync/lipSyncService';

let sapiAC = null;   // AudioContext for SAPI playback
let sapiSrc = null;

/**
 * createTtsService({ engine, rate })
 *   engine : 'webSpeech' | 'sapi'
 *   rate   : optional speech-rate hint forwarded to lip-sync layer
 */
export function createTtsService({ engine = 'webSpeech', rate = 1 } = {}) {
  /* --------------------------------------------------------- */
  /*  1.  Instantiate lip-sync backend                         */
  /* --------------------------------------------------------- */
  const lipSync = initLipSyncService({ engine, rate });

  /* --------------------------------------------------------- */
  /*  2.  Voice discovery helpers                              */
  /* --------------------------------------------------------- */
  let resolveVoices;
  const voicesLoadedPromise = new Promise(r => { resolveVoices = r; });

  let localVoices = [];
  let currentVoice = null;

  /* Web-Speech voices */
  if (engine === 'webSpeech') {
    const synth = window.speechSynthesis;
    const finish = (v) => { localVoices = v; resolveVoices(); };

    const first = synth.getVoices();
    if (first && first.length) {
      finish(first);
    } else {
      synth.onvoiceschanged = () => finish(synth.getVoices());
    }
  } else {
    /* SAPI path (or other engines) – resolve immediately */
    resolveVoices();
  }

  /* SAPI voice list helper */
  const SAPI_ENDPOINT = 'https://new-emotion.cis.fiu.edu/HapGL/HapGLService.svc';
  let sapiVoiceName = 'RS Julie';

  async function fetchSapiVoices() {
    if (engine !== 'sapi') return [];
    try {
      const r = await fetch(`${SAPI_ENDPOINT}/getVoices`);
      let d = await r.json();
      if (typeof d === 'string') d = JSON.parse(d);
      return Array.isArray(d) ? d : (d?.voices ?? []);
    } catch (err) {
      console.warn('[ttsService] fetchSapiVoices error →', err);
      return [];
    }
  }

  // SAPI playback helper
  async function speakSapi(text = '') {
    if (!text.trim()) return;
    try {
      // 1) fetch wav + viseme JSON
      const url = `${SAPI_ENDPOINT}/speak?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(sapiVoiceName)}`;
      const r = await fetch(url);
      let d = await r.json();
      if (typeof d === 'string') d = JSON.parse(d);
      const { audioStream, visemes = [] } = d || {};
      if (Array.isArray(visemes) && visemes.length) {
        console.log('SAPI response text ↴\n', text);
        console.log('SAPI viseme array ↴\n', d?.visemes);
        const timeline = d.visemes.map(v => ({
          id: v.number,
          onsetMs: v.offset ?? v.audioPosition,
          durMs: v.duration,
          releaseMs: (v.offset ?? v.audioPosition) + (v.duration ?? 0)
        }));
        console.log("SAPI Timeline")
        console.table(timeline);
        lipSync.handleSapiVisemes(visemes);
      }
      if (!audioStream) return;

      // 2) decode + play via Web Audio so we can stop() later
      //    (borrowed from old implementation)
      if (sapiSrc) {
        try { sapiSrc.stop(0); } catch { }
        sapiSrc = null;
      }
      if (sapiAC) {
        try { await sapiAC.close(); } catch { }
        sapiAC = null;
      }
      sapiAC = new (window.AudioContext || window.webkitAudioContext)();
      const buf = Uint8Array.from(atob(audioStream), c => c.charCodeAt(0)).buffer;
      const decoded = await sapiAC.decodeAudioData(buf);
      sapiSrc = sapiAC.createBufferSource();
      sapiSrc.buffer = decoded;
      sapiSrc.connect(sapiAC.destination);
      return new Promise((res) => {
        sapiSrc.onended = () => {
          res();
        };
        sapiSrc.start(0);
      });
    } catch (err) {
      console.warn('[ttsService] speakSapi error →', err);
    }
  }

  /* --------------------------------------------------------- */
  /*  3.  Public Surface (mirrors legacy API)                  */
  /* --------------------------------------------------------- */
  return {
    /* ---------- lip-sync hooks ---------- */
    handleViseme(id = 0, dur = 120) {
      if (engine === 'webSpeech') lipSync.handleViseme(id, dur);
    },

    handleSapiVisemes(arr = []) {
      if (engine === 'sapi') lipSync.handleSapiVisemes(arr);
    },

    stop() {
      lipSync.stop();
      if (engine === 'webSpeech') {
        try { window.speechSynthesis.cancel(); } catch { }
      }
      if (engine === 'sapi') {
        try { sapiSrc?.stop(0); } catch { }
        sapiSrc = null;
        if (sapiAC) {
          try { sapiAC.close(); } catch { }
          sapiAC = null;
        }
      }
    },
    dispose() { lipSync.dispose(); },

    /* ---------- legacy speech helpers ---------- */
    enqueueText(rawText = '') {
      return new Promise((resolve) => {
        if (!rawText.trim()) return resolve();

        if (engine === 'webSpeech') {
          try { window.speechSynthesis.cancel(); } catch { }
          lipSync.stop();                      // ensure mouth closes before next utterance
        }

        if (engine === 'webSpeech') {
          // quick mouth-open pulse so avatar “starts talking”
          lipSync.handleViseme(0, 120);

          const utter = new SpeechSynthesisUtterance(rawText);
          if (currentVoice) utter.voice = currentVoice;

          utter.onboundary = (ev) => {
            if (ev.name === 'word') {
              // simple 120‑ms pulse per word
              lipSync.handleViseme(0, 120);
            }
          };
          utter.onend = resolve;
          utter.onerror = resolve;
          window.speechSynthesis.speak(utter);
        } else {
          speakSapi(rawText).then(resolve);
        }
      });
    },

    stopSpeech() { this.stop(); },

    /**
     * interruptSpeech(text) – legacy helper that stops any current
     * utterance and immediately enqueues the new text.
     */
    interruptSpeech(text = '') {
      this.stopSpeech();
      return this.enqueueText(text);
    },

    /* ---------- voice-dropdown helpers ---------- */
    voicesLoadedPromise,

    getVoices: () => localVoices,

    findAndSetVoice: async (name) => {
      await voicesLoadedPromise;
      currentVoice = localVoices.find(v => v.name.includes(name)) || null;
      return currentVoice;
    },

    fetchSapiVoices,

    setSapiVoiceName: (n) => { if (n) sapiVoiceName = n; }
  };
}

/* -----------------------------------------------------------------
 *  Back-compat alias (old modules import { initTtsService } …)
 * ----------------------------------------------------------------*/
export const initTtsService = createTtsService;