// src/VISOS/action/visualizers/animation/animationMachine.js
import { createMachine, assign } from 'xstate';
import { ActionUnitsList, VisemesList } from '../../../../unity/facs/shapeDict.js';

/* ─────────────────────────── helpers ──────────────────────────── */
const THR = 0.01;                                 // ignore Δ < 1 %
function facs() {                                 // late‑bind FacsLib
  return (typeof window !== 'undefined') ? window.facslib : null;
}

/* ---- key‑frame utilities -------------------------------------- */
function keyframeStep(arr, t) {
  if (!Array.isArray(arr) || !arr.length) return { val: 0, next: Infinity };
  const f = [...arr].sort((a, b) => a.time - b.time);
  let prev = f[0];
  for (const fr of f) {
    if (fr.time <= t) prev = fr;
    else return { val: prev.intensity, next: fr.time - t };
  }
  return { val: prev.intensity, next: Infinity };
}
function evalSnippet(sn) {
  const out = {};
  let soon = Infinity;
  if (!sn.curves) return { out, next: soon };
  for (const [id, kfs] of Object.entries(sn.curves)) {
    const { val, next } = keyframeStep(kfs, sn.currentTime);
    out[id] = val * sn.snippetIntensityScale;
    if (next < soon) soon = next;
  }
  return { out, next: soon };
}
function maxTime(curves = {}) {
  let m = 0;
  for (const kfs of Object.values(curves)) {
    if (Array.isArray(kfs))
      kfs.forEach(fr => { if (fr.time > m) m = fr.time; });
  }
  return Math.max(m, 0.5);
}

/* ─────────────────────────── machine ──────────────────────────── */
export const animationMachine = createMachine(
  {
    id: 'animationMachine',
    initial: 'idle',
    context: {
      animations: [],
      stepTime: 0.06,                  // 60 ms heartbeat
      previousAUs: {},
      previousVisemes: {},
      currentAUs:    {},               // ← live pose cache (for UI)
      currentVisemes:{},
      schedulerService: null,
      facsLib: null                    // injected later
    },

    states: {
      idle: {
        on: {
          /* one‑time injections ---------- */
          SET_SCHEDULER: { actions: assign({ schedulerService: (_,e) => e.ref }) },
          SET_FACSLIB:   { actions: assign({ facsLib:       (_,e) => e.ref }) },

          /* snippet mgmt ------------------ */
          LOAD_ANIMATION:   { actions: 'load'   },
          REMOVE_ANIMATION: { actions: 'remove' },

          /* transport --------------------- */
          PLAY_ALL:  { actions: 'playAll'  },
          PAUSE_ALL: { actions: 'pauseAll' },
          STOP_ALL:  { actions: 'stopAll'  },

          /* driver events ----------------- */
          TICK:     { actions: ['advance', 'sendPose', 'maybeReschedule'] },
          KEYFRAME: { actions: ['sendPose', 'maybeReschedule'] }
        }
      }
    }
  },
  {
    actions: {
      /* ── load / remove ───────────────────────────────────────── */
      load: assign((ctx, { data }) => {
        const d = data ?? {};
        const sn = {
          name:                  d.name ?? `sn_${Date.now()}`,
          curves:                d.curves ?? {},
          isPlaying:             !!d.isPlaying,
          loop:                  !!d.loop,
          currentTime:           0,
          maxTime:               typeof d.maxTime === 'number' ? d.maxTime : maxTime(d.curves),
          snippetPlaybackRate:   typeof d.snippetPlaybackRate === 'number' ? d.snippetPlaybackRate : 1,
          snippetIntensityScale: typeof d.snippetIntensityScale === 'number' ? d.snippetIntensityScale : 1,
          snippetCategory:       d.snippetCategory ?? 'default',
          snippetPriority:       typeof d.snippetPriority === 'number' ? d.snippetPriority : 0
        };
        return { ...ctx, animations: [...ctx.animations, sn] };
      }),

      remove: assign((ctx, { name }) => ({
        ...ctx,
        animations: ctx.animations.filter(sn => sn.name !== name)
      })),

      /* ── advance timelines (each TICK) ───────────────────────── */
      advance: assign(ctx => {
        const dt = ctx.stepTime;
        ctx.animations.forEach(sn => {
          if (!sn.isPlaying && sn.maxTime !== 0) return;
          sn.currentTime += dt * sn.snippetPlaybackRate;
          if (sn.currentTime >= sn.maxTime) {
            if (sn.loop) sn.currentTime = 0;
            else { sn.currentTime = sn.maxTime; sn.isPlaying = false; }
          }
        });
        return ctx;
      }),

      /* ── adaptive heartbeat ------------------------------------ */
      maybeReschedule: ctx => {
        const sched = ctx.schedulerService;
        if (!sched || typeof sched.send !== 'function') return;

        let soon = Infinity;
        ctx.animations.forEach(sn => {
          if (!sn.isPlaying) return;
          const { next } = evalSnippet(sn);
          const wait = next / sn.snippetPlaybackRate;
          if (wait > 0 && wait < soon) soon = wait;
        });
        const ms = isFinite(soon) ? Math.max(1, Math.round(soon * 1000)) : 60000;
        sched.send({ type: 'SET_DELAY', delayMs: ms });
      },

      /* ── send blend‑shape pose to Unity ------------------------ */
      sendPose: assign(ctx => {
        const facsLib = ctx.facsLib || facs();
        if (!facsLib) return ctx;

        const best = {};                        // id → {val,vis,prio,durMs}
        ctx.animations.forEach(sn => {
          if (!sn.isPlaying && sn.maxTime !== 0) return;
          const { out, next } = evalSnippet(sn);
          const durMs = isFinite(next)
            ? Math.round(next / sn.snippetPlaybackRate * 1000)
            : 60;
          const isVis = sn.snippetCategory === 'visemeSnippet';
          const prio  = sn.snippetPriority ?? 0;

          Object.entries(out).forEach(([id, v]) => {
            const cur = best[id];
            if (!cur || prio > cur.prio || (prio === cur.prio && v > cur.val)) {
              best[id] = { val: v, vis: isVis, prio, durMs };
            }
          });
        });

        /* Split AU vs. Viseme and send only when value really changed */
        const prevA = ctx.previousAUs;
        const prevV = ctx.previousVisemes;
        const curA  = {};
        const curV  = {};

        Object.entries(best).forEach(([id, o]) => {
          if (o.vis) {
            const slot = id === '0' ? 0 : (parseInt(id, 10) - 1);
            const last = prevV[id] ?? 0;
            if (Math.abs(o.val - last) >= THR) {
              facsLib.setTargetViseme(slot, o.val, o.durMs);
              prevV[id] = o.val;
            }
            curV[id] = o.val;
          } else {
            const last = prevA[id] ?? 0;
            if (Math.abs(o.val - last) >= THR) {
              facsLib.setTargetAU(id, o.val, o.durMs *1.4);
              console.log("Scheduling duration")
              console.log(o.durMs)
              prevA[id] = o.val;
            }
            curA[id] = o.val;
          }
        });
        facsLib.updateEngine();

        /* prune one‑shot snippets (maxTime === 0) */
        ctx.animations = ctx.animations.filter(sn => !(sn.maxTime === 0 && !sn.isPlaying));

        /* expose latest pose to UI via context */
        return {
          ...ctx,
          previousAUs:      { ...prevA },
          previousVisemes:  { ...prevV },
          currentAUs:       curA,
          currentVisemes:   curV
        };
      }),

      /* ── transport helpers ───────────────────────────────────── */
      playAll:  assign(ctx => ({ ...ctx, animations: ctx.animations.map(a => ({ ...a, isPlaying: true  })) })),
      pauseAll: assign(ctx => ({ ...ctx, animations: ctx.animations.map(a => ({ ...a, isPlaying: false })) })),
      stopAll:  assign(ctx => ({ ...ctx, animations: ctx.animations.map(a => ({ ...a, isPlaying: false, currentTime: 0 })) }))
    }
  }
);