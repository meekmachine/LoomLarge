/**
 * ---------------------------------------------------------------------------
 *  TTS Utility Helpers
 *  --------------------------------------------------------------------------
 *  1) Generic token helpers  (parseTokens, buildStrippedText, guessBoundaryWord)
 *  2) “Timeline builders”     – convert raw data into a list of scheduler items:
 *        timelineFromLocalWord(ctx)   -> Web‑Speech / local path
 *        timelineFromSapiData(ctx)    -> Microsoft SAPI path
 *
 *  A “timeline item” is always:
 *     { type:'WORD',   word:'hello', index:0, offsetMs:  150 }
 *     { type:'EMOJI',  emoji:'😡',               offsetMs:  300 }
 *     { type:'VISEME', id: 12,                  offsetMs:  420 }
 *
 *  These arrays are loaded into the `ttsSchedulerMachine` so we DON’T
 *  rely on raw setTimeout() scattered through the code‑base.
 * ---------------------------------------------------------------------------
 */

import PhonemeExtractor from '../lipSync/PhonemeExtractor';
import VisemeMapper     from '../lipSync/VisemeMapper';

// ---------------------------------------------------------------------------
//  1)  TOKEN HELPERS
// ---------------------------------------------------------------------------

export function parseTokens(rawText = '') {
  const tokenRegex =
    /(\p{Extended_Pictographic})|([^\s\p{Extended_Pictographic}]+)/gu;

  return [...rawText.matchAll(tokenRegex)].map((m) =>
    m[1] ? { type: 'emoji', value: m[1] } : { type: 'text', value: m[2] }
  );
}

export function buildStrippedText(tokens = []) {
  return tokens
    .filter((t) => t.type === 'text')
    .map((t) => t.value)
    .join(' ')
    .trim();
}

/** Clamp / sanitize numeric inputs (rate, pitch, …) */
export function ensureFloat(x, def = 1, min = 0.1, max = 10) {
  const v = (typeof x === 'number') ? x : parseFloat(x);
  if (!Number.isFinite(v)) return def;
  return Math.min(Math.max(v, min), max);
}

/* Friendly alias so callers can import { stripText } */
export const stripText = buildStrippedText;

/** Web‑Speech’s onboundary gives a charIndex + charLength – pull substring */
export function guessBoundaryWord(full, start = 0, length = 1) {
  if (!length || length < 1) length = 1;
  return full.substring(start, start + length).trim();
}

// ---------------------------------------------------------------------------
//  2)  TIMELINE BUILDERS
// ---------------------------------------------------------------------------

const phonemeExtractor = new PhonemeExtractor();
const visemeMapper     = new VisemeMapper();

/**
 * timelineFromLocalWord(ctx)
 *   – ctx.tokens   : array from parseTokens
 *   – ctx.rate     : speech rate (1.0 = normal)
 *
 * Strategy:
 *   • Break strippedText into words.
 *   • For each word, create WORD event at cumulative offset.
 *   • For each word, generate phonemes ➜ visemes ➜ add VISEME events.
 *   • Add EMOJI events using proportional char‑distance heuristic.
 */
export function timelineFromLocalWord(ctx) {
  const { tokens = [], strippedText = '', rate = 1.0 } = ctx;
  const timeline = [];

  // -----  words & visemes  -----
  const words = strippedText.split(/\s+/).filter(Boolean);
  let runningMs = 0;

  words.forEach((word, idx) => {
    // Rough duration: 50 ms per char, slower if rate<1
    const wordDur = (word.length * 50) / rate;

    timeline.push({
      type: 'WORD',
      word,
      index: idx,
      offsetMs: runningMs
    });

    // Phoneme ➜ viseme mapping for this word
    const phonemes = phonemeExtractor.extractPhonemes(word);
    const visemes  = visemeMapper.mapPhonemesToVisemes(phonemes);

    let localOffset = 0;
    visemes.forEach((v) => {
      const durMs = (v.duration || 120) / rate;
      timeline.push({
        type: 'VISEME',
        id:   v.viseme,
        durMs,
        offsetMs: runningMs + localOffset
      });
      localOffset += durMs;
    });

    /* Advance global offset:
       • let precise viseme timing dominate
       • add a tiny inter‑word gap (30 ms) for mouth closure
    */
    const gapMs = 30 / rate;
    runningMs += Math.max(wordDur, localOffset) + gapMs;
  });

  // -----  emojis  -----
  //  We drop emojis IN BETWEEN based on char offset ratio
  let totalChars = 0;
  tokens.forEach((t) => { if (t.type === 'text') totalChars += t.value.length; });

  if (totalChars > 0) {
    let usedChars = 0;
    tokens.forEach((t) => {
      if (t.type === 'text') {
        usedChars += t.value.length;
      } else if (t.type === 'emoji') {
        const ratio    = usedChars / totalChars;
        const offsetMs = ratio * runningMs;
        timeline.push({ type: 'EMOJI', emoji: t.value, offsetMs });
      }
    });
  }

  return timeline;
}

/**
 * timelineFromSapiData(ctx)
 *   – ctx.visemes       : list from SAPI (number + audioPosition)
 *   – ctx.strippedText  : string
 *
 * Strategy:
 *   • Use viseme list for VISEME items.
 *   • Distribute WORD events proportionally across total audio length.
 *   • Distribute EMOJI events with same proportional method.
 */
export function timelineFromSapiData(ctx) {
  const {
    visemes = [], strippedText = '', tokens = []
  } = ctx;

  const timeline = [];

  // ----- visemes -----
  visemes.forEach((v, i) => {
    // Offset in ms: audioPosition is in ticks (100ns) or already ms
    const posMs = v.audioPosition > 1_000_000 ? v.audioPosition / 10_000 : v.audioPosition;
    const cur = posMs;
    const nxtRaw = visemes[i + 1] ? visemes[i + 1].audioPosition : cur + 120;
    const nxt = nxtRaw > 1_000_000 ? nxtRaw / 10_000 : nxtRaw;
    timeline.push({
      type: 'VISEME',
      id:   v.number,
      durMs: Math.min(Math.max(nxt - cur + 20, 90), 250),
      offsetMs: cur
    });
  });

  // Determine total duration from visemes
  const maxOffset =
    visemes.reduce((m, v) => {
      const posMs = v.audioPosition > 1_000_000 ? v.audioPosition / 10_000 : v.audioPosition;
      return Math.max(m, posMs);
    }, 0) + 200;

  // ----- words -----
  const words = strippedText.split(/\s+/).filter(Boolean);
  const totalChars = words.join('').length || 1;
  let runningChars = 0;

  words.forEach((w, idx) => {
    runningChars += w.length;
    const ratio = runningChars / totalChars;
    timeline.push({
      type: 'WORD',
      word: w,
      index: idx,
      offsetMs: Math.max(0, ratio * maxOffset - 60)   // shift 60 ms earlier
    });
  });

  // ----- emojis -----
  let usedChars = 0;
  tokens.forEach((t) => {
    if (t.type === 'text') {
      usedChars += t.value.length;
    } else if (t.type === 'emoji') {
      const ratio    = usedChars / totalChars;
      timeline.push({
        type: 'EMOJI',
        emoji: t.value,
        offsetMs: ratio * maxOffset
      });
    }
  });

  return timeline;
}