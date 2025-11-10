// src/VISOS/action/visualizers/animation/animationMachine.js
// ──────────────────────────────────────────────────────────────
// Pure, serialisable store for React. No timers or FacsLib calls.

import { createMachine, assign } from 'xstate';

/* Make sure every key‑frame has a stable ID */
function cloneCurves(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).map(([cid, arr]) => [
      cid,
      (arr ?? []).map(fr => ({
        id: fr.id ?? (crypto.randomUUID?.() || `${cid}-${fr.time}`),
        time: fr.time,
        intensity: fr.intensity
      }))
    ])
  );
}

export const animationMachine = createMachine(
  {
    id: 'animationMachine',
    context: {
      /* legacy tick size for UI widgets that still read it */
      stepTime: 0.06,

      /* snippet array */
      animations: [],

      /* live blend‑shape values shown in sliders */
      currentAUs: {},
      currentVisemes: {},

      /* for curve editors: key‑frames we are easing toward */
      scheduledTransitions: [],

      /* manual slider overrides */
      manualOverrides: {}
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          /* API events */
          LOAD_ANIMATION:   { actions: 'load' },
          REMOVE_ANIMATION: { actions: 'remove' },

          PLAY_ALL:  { actions: 'playAll'  },
          PAUSE_ALL: { actions: 'pauseAll' },
          STOP_ALL:  { actions: 'stopAll'  },

          CURVE_CHANGED: { actions: 'mergeCurve' },

          /* From scheduler */
          KEYFRAME_HIT: { actions: 'applyBlendValues' },
          UI_PROGRESS:  { actions: 'updateCurrentTimes' },

          /* Manual slider layer */
          MANUAL_SET:   { actions: 'manualSet'   },
          MANUAL_CLEAR: { actions: 'manualClear' }
        }
      }
    }
  },
  {
    actions: {
      /* ── load / remove snippet ───────────────────────────── */
      load: assign((ctx, { data }) => {
        const d = data ?? {};
        const sn = {
          name:                  d.name ?? `sn_${Date.now()}`,
          curves:                cloneCurves(d.curves),
          isPlaying:             d.isPlaying === false ? false : true,
          loop:                  !!d.loop,
          snippetPlaybackRate:   typeof d.snippetPlaybackRate === 'number' ? d.snippetPlaybackRate : 1,
          snippetIntensityScale: typeof d.snippetIntensityScale === 'number' ? d.snippetIntensityScale : 1,
          snippetCategory:       d.snippetCategory ?? 'default',
          snippetPriority:       typeof d.snippetPriority === 'number' ? d.snippetPriority : 0,
          maxTime:               typeof d.maxTime === 'number' ? d.maxTime : 0,
          currentTime: 0,
          startWallTime: 0,          // set on first scheduler rebuild
          cursor: {}                 // curveId → kfIdx
        };
        return { ...ctx, animations: [...ctx.animations, sn] };
      }),

      remove: assign((ctx, { name }) => ({
        ...ctx,
        animations: ctx.animations.filter(sn => sn.name !== name)
      })),

      /* ── global transport helpers ───────────────────────── */
      playAll:  assign(ctx => ({ ...ctx,
        animations: ctx.animations.map(sn => ({ ...sn, isPlaying: true }))
      })),
      pauseAll: assign(ctx => ({ ...ctx,
        animations: ctx.animations.map(sn => ({ ...sn, isPlaying: false }))
      })),
      stopAll:  assign(ctx => ({ ...ctx,
        animations: ctx.animations.map(sn => ({ ...sn, isPlaying: false }))
      })),

      /* ── curve edits from editors ───────────────────────── */
      mergeCurve: assign((ctx, { nameOrId, auId, curve }) => {
        let snippetName, id, newCurve;
        if (Array.isArray(auId)) { id = nameOrId; newCurve = auId; snippetName = null; }
        else { snippetName = nameOrId; id = auId; newCurve = curve; }

        const sn = snippetName
          ? ctx.animations.find(s => s.name === snippetName)
          : ctx.animations[0];
        if (!sn) return ctx;
        sn.curves[id] = cloneCurves({ tmp: newCurve }).tmp;
        sn.cursor[id] = 0;          // reset playback index for that curve
        return ctx;
      }),

      /* ── batch of key‑frames from scheduler ─────────────── */
      applyBlendValues: assign((ctx, { data: batch }) => {
        const curA = { ...ctx.currentAUs };
        const curV = { ...ctx.currentVisemes };
        const ids  = [];

        batch.forEach(ev => {
          const sn    = ev.snippet;
          const curve = sn.curves[ev.curveId];
          const kf    = curve[ev.kfIdx];
          const val   = kf.intensity * sn.snippetIntensityScale;

          if (sn.snippetCategory === 'visemeSnippet') curV[ev.curveId] = val;
          else                                         curA[ev.curveId] = val;

          ids.push(kf.id);
          sn.currentTime = kf.time;
        });

        /* manual overrides always win in UI display */
        Object.entries(ctx.manualOverrides).forEach(([id, val]) => {
          if (curA[id] !== undefined) curA[id] = val;
          else curV[id] = val;
        });

        return {
          ...ctx,
          currentAUs: curA,
          currentVisemes: curV,
          scheduledTransitions: ids
        };
      }),

      /* ── lightweight UI progress tick ───────────────────── */
      updateCurrentTimes: assign((ctx) => {
        const now = Date.now();
        ctx.animations.forEach(sn => {
          if (!sn.isPlaying || !sn.startWallTime) return;
          sn.currentTime =
            ((now - sn.startWallTime) / 1000) * sn.snippetPlaybackRate;
        });
        return ctx;
      }),

      /* ── manual slider overrides ────────────────────────── */
      manualSet: assign((ctx, { id, value, isViseme }) => {
        const mo = { ...ctx.manualOverrides, [id]: value };
        if (isViseme) ctx.currentVisemes[id] = value;
        else          ctx.currentAUs[id]     = value;
        return { ...ctx, manualOverrides: mo };
      }),

      manualClear: assign((ctx, { id }) => {
        const mo = { ...ctx.manualOverrides };
        delete mo[id];
        return { ...ctx, manualOverrides: mo };
      })
    }
  }
);