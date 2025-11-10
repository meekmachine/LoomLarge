// facsMachine.js
import { createMachine, assign } from 'xstate';

/* ------------------------------------------------------------------ */
/*  shapeDict: Action Units & Visemes                                 */
/* ------------------------------------------------------------------ */
import {
  ActionUnitsList,
  VisemesList
} from '../../../unity/facs/shapeDict.js';

/* ------------------------------------------------------------------ */
/*  FacsLib – wrapper around Unity EngineWebGL_u3d                    */
/* ------------------------------------------------------------------ */
import { FacsLib } from '../../../unity/facs/facslib.js';

/* ------------------------------------------------------------------ */
/*  Keep ONE FacsLib instance across re-creations                     */
/* ------------------------------------------------------------------ */
let globalFacsLibRef = null;

/* ------------------------------------------------------------------ */
/*  Collision helper – legacy logic, unchanged                        */
/* ------------------------------------------------------------------ */
function applyCollisionsNoClamp(auStates, auId, rawVal, notes = '') {
  const newAUs = { ...auStates };

  let val = parseFloat(rawVal);
  if (Number.isNaN(val)) val = 0;

  /* 1️⃣  set self */
  newAUs[auId] = { ...newAUs[auId], intensity: val, notes };

  /* 2️⃣  apply collisions from shapeDict */
  const thisAU = ActionUnitsList.find((au) => au.id === auId);
  if (thisAU && Array.isArray(thisAU.collisions)) {
    thisAU.collisions.forEach((collision) => {
      if (typeof collision === 'string') {
        /* simple “override”: zero target AU */
        const partnerId = collision;
        if (newAUs[partnerId]) {
          newAUs[partnerId] = {
            ...newAUs[partnerId],
            intensity: 0,
            notes: `suppressed by ${auId}`
          };
        }
        return;
      }

      /* object syntax with { partner, type, threshold, synergy } */
      const {
        partner,
        type,
        threshold = 50,
        synergy = 1.0
      } = collision;
      if (!partner || !type) return;

      let partnerVal = parseFloat(newAUs[partner]?.intensity);
      if (Number.isNaN(partnerVal)) partnerVal = 0;

      switch (type) {
        case 'inverseDial': {
          if (val > threshold) {
            const newVal = 100 - val * synergy;
            if (newVal < partnerVal) newAUs[partner].intensity = newVal;
          }
          break;
        }
        case 'override': {
          if (val > threshold) newAUs[partner].intensity = 0;
          break;
        }
        case 'clamp': {
          if (val > threshold && partnerVal > synergy) {
            newAUs[partner].intensity = synergy;
          }
          break;
        }
        case 'amplify': {
          if (val > threshold) {
            const boost = (val - threshold) * synergy;
            newAUs[partner].intensity = partnerVal + boost;
          }
          break;
        }
        default:
          /* unknown type → ignore */
          break;
      }
    });
  }
  return newAUs;
}

/* =================================================================== */
/*  createFacsMachine                                                  */
/* =================================================================== */
export function createFacsMachine(engine) {
  /* ensure singleton FacsLib */
  if (!globalFacsLibRef) globalFacsLibRef = new FacsLib(engine);
  window.facslib = globalFacsLibRef;
  return createMachine(
    {
      id: 'facsMachine',
      initial: 'idle',
      context: {
        /* dictionaries: { [id]: { intensity, … } } */
        auStates: ActionUnitsList.reduce((acc, au) => {
          acc[au.id] = { intensity: 0, notes: '' };
          return acc;
        }, {}),
        visemeStates: VisemesList.reduce((acc, v) => {
          acc[v.id] = { intensity: 0, duration: 0, notes: '' };
          return acc;
        }, {}),
        facsLib: globalFacsLibRef,
        useAUsForVisemes: false,
        currentVisemeId: null,
        /* NEW → cache to throttle viseme traffic */
        previousVisemes: {}
      },
      states: {
        idle: {
          on: {
            /* AU events */
            SET_AU: {
              actions: ['assignAUCollisions', 'syncAll']
            },
            /* Viseme events – two flows */
            SET_VISEME: [
              {
                cond: 'usingAUMap',
                actions: [
                  'maybeDialBackOtherVisemes',
                  'assignVisemeAUStates',
                  'syncAll'
                ]
              },
              {
                actions: [
                  'maybeDialBackOtherVisemes',
                  'assignViseme',
                  'syncSingleViseme'
                ]
              }
            ],
            /* Toggle mapping mode */
            SET_VISEME_MODE: { actions: 'assignVisemeMode' },
            /* Neutralize */
            NEUTRAL: { actions: ['zeroAll', 'callEngineNeutral'] },
            NEUTRAL_VISEMES: { actions: ['zeroVisemes', 'callEngineNeutralVis'] },
            /* Import JSON (legacy) */
            APPLY_JSON: { actions: ['applyJson', 'syncAll'] }
          }
        }
      }
    },
    {
      /* ===========  GUARDS  ============ */
      guards: {
        usingAUMap: (ctx) => ctx.useAUsForVisemes
      },
      /* ===========  ACTIONS  ============ */
      actions: {
        /* A) AU + collision */
        assignAUCollisions: assign((ctx, e) => {
          const { auId, intensity = 0, notes = '' } = e;
          const updated = applyCollisionsNoClamp(
            ctx.auStates,
            auId,
            intensity,
            notes
          );
          return { ...ctx, auStates: updated };
        }),
        /* B) dial back other visemes */
        maybeDialBackOtherVisemes: assign((ctx, e) => {
          const { visemeId } = e;

          /* If we are in pure‑viseme mode let multiple visemes coexist. */
          if (!ctx.useAUsForVisemes) {
            return ctx;                          // ← no dial‑back, keep all visemes as is
          }

          /* AU‑mapping path (legacy rigs) keeps the old behaviour: 
             dial down the previous viseme when a new one starts. */
          const newVis = { ...ctx.visemeStates };
          if (ctx.currentVisemeId != null) {
            newVis[ctx.currentVisemeId].intensity *= 0.2;
          }
          newVis[visemeId] = { ...newVis[visemeId], notes: '' };  // make sure it exists
          return { ...ctx, visemeStates: newVis, currentVisemeId: visemeId };
        }),
        /* C) AU‑mapping viseme assignment */
        assignVisemeAUStates: assign((ctx, e) => {
          const { visemeId, intensity = 100, duration = 0 } = e;
          const vis = { ...ctx.visemeStates };
          vis[visemeId] = { ...vis[visemeId], intensity, duration };
          const found = VisemesList.find((v) => String(v.id) === String(visemeId));
          if (!found?.recommendedAUs) {
            return { ...ctx, visemeStates: vis, currentVisemeId: visemeId };
          }
          const aus = { ...ctx.auStates };
          Object.entries(found.recommendedAUs).forEach(([auId, base]) => {
            const scaled = (parseFloat(base) || 0) * (intensity / 100);
            aus[auId] = { ...aus[auId], intensity: scaled };
          });
          return { ...ctx, auStates: aus, visemeStates: vis, currentVisemeId: visemeId };
        }),
        /* D) direct viseme assignment */
        assignViseme: assign((ctx, e) => {
          const { visemeId, intensity = 0, duration = 0, notes = '' } = e;
          // 1) reset all viseme states to zero
          const vis = Object.fromEntries(
            Object.keys(ctx.visemeStates).map(id => [
              id,
              { intensity: 0, duration: 0, notes: '' }
            ])
          );
          // 2) set the new viseme
          vis[visemeId] = { intensity, duration, notes };
          return { ...ctx, visemeStates: vis, currentVisemeId: visemeId };
        }),
        syncSingleViseme: (ctx, e) => {
          const { visemeId, intensity = 0, duration = 0 } = e;

          /* Unity blend‑shapes are indexed 0‑20, whereas SAPI sends 0‑20/21.
             For IDs >0 we subtract 1 so “viseme 1” → slot 0, “viseme 2” → slot 1 ... */
          const slot = visemeId === 0 ? 0 : (parseInt(visemeId, 10) - 1);

          if (intensity > 0) {
            ctx.facsLib.setTargetViseme(slot, intensity, duration); 
            ctx.facsLib.updateEngine();
          }
          ctx.previousVisemes[visemeId] = intensity;
        },
        /* E) syncAll with viseme throttling */
        syncAll: (ctx) => {
          const { auStates, visemeStates, facsLib } = ctx;
          for (const [auId, { intensity }] of Object.entries(auStates)) {
            facsLib.setTargetAU(auId, intensity, null, 0);
          }
          for (const [vId, { intensity, duration }] of Object.entries(visemeStates)) {
            const slot = vId === '0' ? 0 : (parseInt(vId, 10) - 1);
            facsLib.setTargetViseme(slot, intensity, duration || 0);
          }
          facsLib.updateEngine();
          // ctx.previousVisemes = nextCache; // disabled caching
        },
        /* F) zero helpers */
        zeroAll: assign((ctx) => {
          const aus = Object.fromEntries(Object.keys(ctx.auStates).map(k => [k, { intensity: 0, notes: '' }]));
          const vis = Object.fromEntries(Object.keys(ctx.visemeStates).map(k => [k, { intensity: 0, duration: 0, notes: '' }]));
          return { ...ctx, auStates: aus, visemeStates: vis, previousVisemes: {}, currentVisemeId: null };
        }),
        callEngineNeutral: (ctx) => {
          ctx.facsLib.setNeutral(0);
          ctx.facsLib.setNeutralViseme(0);
          ctx.facsLib.updateEngine();
        },
        zeroVisemes: assign((ctx) => {
          const vis = Object.fromEntries(Object.keys(ctx.visemeStates).map(k => [k, { intensity: 0, duration: 0, notes: '' }]));
          return { ...ctx, visemeStates: vis, previousVisemes: {}, currentVisemeId: null };
        }),
        callEngineNeutralVis: (ctx) => {
          ctx.facsLib.setNeutralViseme(0);
          ctx.facsLib.updateEngine();
        },
        /* G) import JSON */
        applyJson: assign((ctx, e) => {
          try {
            const arr = JSON.parse(e.json);
            let aus = { ...ctx.auStates };
            arr.forEach(({ id, intensity = 0, notes = '' }) => {
              if (aus[id]) {
                const raw = parseFloat(intensity) * 90 || 0;
                aus = applyCollisionsNoClamp(aus, id, raw, notes);
              }
            });
            return { ...ctx, auStates: aus };
          } catch (err) {
            console.warn('[facsMachine] applyJson error', err);
            return ctx;
          }
        }),
        /* H) toggle mode */
        assignVisemeMode: assign((ctx, e) => ({ ...ctx, useAUsForVisemes: !!e.value }))
      }
    }
  );
}