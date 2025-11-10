// src/VISOS/action/visualizers/animation/animationScheduler.js
// ──────────────────────────────────────────────────────────────
// One global scheduler actor.  Holds a priority queue of the
// next key‑frame for every playing curve across all snippets.

import { createMachine, assign, interpret } from 'xstate';

/* ── queue helpers ────────────────────────────────────────── */

function buildInitialQueue(snippets, now) {
  const q = [];
  snippets.forEach(sn => {
    if (!sn.isPlaying) return;

    if (!sn.startWallTime) sn.startWallTime = now;       // preserve anchor
    sn.cursor = {};                                       // reset per rebuild

    Object.entries(sn.curves).forEach(([curveId, arr]) => {
      if (!arr.length) return;
      sn.cursor[curveId] = 0;
      const firstKF = arr[0];
      const tAbs =
        sn.startWallTime +
        (firstKF.time / Math.max(0.001, sn.snippetPlaybackRate)) * 1000;
      q.push({ tAbs, snippet: sn, curveId, kfIdx: 0 });
    });
  });
  q.sort((a, b) => a.tAbs - b.tAbs);
  return q;
}

function insertEvent(queue, ev) {
  queue.push(ev);
  queue.sort((a, b) => a.tAbs - b.tAbs);
}

function queueNextForCurve(ev, queue) {
  const sn    = ev.snippet;
  const curve = sn.curves[ev.curveId];
  const nextIdx =
    ev.kfIdx + 1 < curve.length ? ev.kfIdx + 1 : sn.loop ? 0 : null;

  if (nextIdx == null) {
    const finished = Object.entries(sn.curves).every(([cid, arr]) => {
      const cur = sn.cursor[cid] ?? 0;
      return cur + 1 >= arr.length && !sn.loop;
    });
    if (finished) sn.isPlaying = false;
    return;
  }

  const curKF  = curve[ev.kfIdx];
  const nextKF = curve[nextIdx];
  const dt =
    ((nextKF.time - (nextIdx === 0 ? 0 : curKF.time)) /
      Math.max(0.001, sn.snippetPlaybackRate)) * 1000;

  insertEvent(queue, {
    tAbs: ev.tAbs + dt,
    snippet: sn,
    curveId: ev.curveId,
    kfIdx: nextIdx
  });
}

/* ── scheduler machine ────────────────────────────────────── */

export function createAnimationScheduler(parentService, facsLib) {
  const scheduler = createMachine(
    {
      id: 'kfScheduler',
      context: { queue: [] },
      initial: 'idle',
      states: {
        idle: {
          on: { REBUILD: { actions: 'rebuild', target: 'waiting' } }
        },
        waiting: {
          after: {
            NEXT_EVENT: {
              actions: ['fireDue', 'maybeProgressTick'],
              target: 'waiting'
            }
          },
          on: {
            REBUILD: { actions: 'rebuild', internal: false },
            STOP:    { actions: 'clear',   target: 'idle' }
          }
        }
      }
    },
    {
      delays: {
        NEXT_EVENT: (ctx) =>
          ctx.queue.length
            ? Math.max(0, ctx.queue[0].tAbs - Date.now())
            : 2147483647
      },
      actions: {
        rebuild: assign((ctx, evt) => ({
          queue: buildInitialQueue(evt.snippets ?? [], Date.now())
        })),
        clear: assign({ queue: [] }),

        fireDue: assign((ctx) => {
          const now = Date.now();
          const due = [];
          while (ctx.queue.length && ctx.queue[0].tAbs <= now) {
            due.push(ctx.queue.shift());
          }
          if (!due.length) return ctx;

          const best = {};
          due.forEach(ev => {
            const sn    = ev.snippet;
            const curve = sn.curves[ev.curveId];
            const curKF = curve[ev.kfIdx];
            const nextKF =
              curve[ev.kfIdx + 1] ?? (sn.loop ? curve[0] : null);

            const durMs = nextKF
              ? Math.round(
                  ((nextKF.time - curKF.time) / sn.snippetPlaybackRate) * 1000
                )
              : 60;

            const id    = ev.curveId;
            const value = curKF.intensity * sn.snippetIntensityScale;
            const vis   = sn.snippetCategory === 'visemeSnippet';
            const prio  = sn.snippetPriority ?? 0;
            const cur   = best[id];

            if (!cur || prio > cur.prio || (prio === cur.prio && value > cur.val)) {
              best[id] = { val: value, durMs, vis, prio };
            }

            sn.currentTime = curKF.time;
            sn.cursor[ev.curveId] = ev.kfIdx;          // advance cursor
          });

          /* merge manual overrides */
          Object.entries(parentService.state.context.manualOverrides ?? {})
            .forEach(([id, val]) =>
              best[id] = { val, durMs: 40, vis: false, prio: Infinity });

          /* call FacsLib once per blend‑shape */
          Object.entries(best).forEach(([id, o]) => {
            if (o.vis) {
              const slot = id === '0' ? 0 : parseInt(id, 10) - 1;
              facsLib.setTargetViseme(slot, o.val, o.durMs);
            } else {
              facsLib.setTargetAU(id, o.val, o.durMs * 2, 1);
            }
          });
          facsLib.updateEngine();

          /* enqueue following frames */
          due.forEach(ev => queueNextForCurve(ev, ctx.queue));

          parentService.send({ type:'KEYFRAME_HIT', data: due });
          return ctx;
        }),

        maybeProgressTick: (_, __, { state }) => {
          if (state.context.queue.length)
            parentService.send({ type:'UI_PROGRESS' });
        }
      }
    }
  );

  const service = interpret(scheduler).start();

  return {
    rebuild(snippets){ service.send({ type:'REBUILD', snippets }); },
    refresh(snippets){ this.rebuild(snippets); },
    flush(snippets){
      const tmp = buildInitialQueue(snippets, Date.now());
      if (!tmp.length) return;
      parentService.send({ type:'KEYFRAME_HIT', data: [tmp[0]] });
      const sn = tmp[0].snippet;
      const kf = sn.curves[tmp[0].curveId][tmp[0].kfIdx];
      const val = kf.intensity * sn.snippetIntensityScale;
      if (sn.snippetCategory === 'visemeSnippet') {
        const slot = tmp[0].curveId === '0' ? 0 : parseInt(tmp[0].curveId, 10) - 1;
        facsLib.setTargetViseme(slot, val, 1);
      } else {
        facsLib.setTargetAU(tmp[0].curveId, val, 2, 1);
      }
      facsLib.updateEngine();
    },
    stop(){
      service.send('STOP'); service.stop();
    }
  };
}