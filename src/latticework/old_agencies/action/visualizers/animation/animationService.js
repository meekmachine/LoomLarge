// src/VISOS/action/visualizers/animation/animationService.js
// ──────────────────────────────────────────────────────────────
// Public façade for React. Option‑1 architecture: one data
// machine + one scheduler actor.

import { interpret } from 'xstate';
import { animationMachine } from './animationMachine';
import { createAnimationScheduler } from './animationScheduler';

/* ---------- preload bundled snippets to localStorage -------- */
const emotionCtx  = require.context('./animations/emotion',  false, /\.json$/);
const speakingCtx = require.context('./animations/speaking', false, /\.json$/);
const visemeCtx   = require.context('./animations/visemes',  false, /\.json$/);

function preload() {
  const cfg = [
    ['emotionAnimationsList',  emotionCtx ],
    ['speakingAnimationsList', speakingCtx],
    ['visemeAnimationsList',   visemeCtx ]
  ];
  cfg.forEach(([storeKey, ctx]) => {
    const names = [];
    ctx.keys().forEach(fp => {
      const base = fp.replace('./','').replace('.json','');
      names.push(base);
      localStorage.setItem(`${storeKey}/${base}`, JSON.stringify(ctx(fp)));
    });
    localStorage.setItem(storeKey, JSON.stringify(names));
  });
}

/* ---------- singleton handling ------------------------------ */
let __inst = null;
let __refs = 0;

export function createAnimationService() {
  if (__inst) { __refs++; return __inst; }

  const machineSrv  = interpret(animationMachine).start();
  const facsLib = (typeof window!=='undefined') ? window.facslib : null;
  const scheduler   = createAnimationScheduler(machineSrv, facsLib);
  const refreshSched = () =>
    scheduler.refresh(machineSrv.state.context.animations);

  preload();

  /* keep track of global transport state so new snippets auto‑start */
  let transportRunning = false;

  /* -------------------- public API -------------------------- */
  const api = {

    /* load helpers */
    loadFromLocal(key, cat='default', prio=0){
      const str = localStorage.getItem(key); if(!str) return;
      api.loadFromJSON(str, cat, prio);
    },
    loadFromJSON(jsonOrStr, cat='default', prio=0){
      let obj;
      try { obj = typeof jsonOrStr==='string' ? JSON.parse(jsonOrStr) : jsonOrStr; }
      catch(e){ console.error('[animationService] bad JSON', e); return; }

      obj.snippetCategory = cat; obj.snippetPriority = prio;
      if (transportRunning) obj.isPlaying = true;

      const ctx = machineSrv.state.context;
      const existing = ctx.animations.find(a => a.name === obj.name);
      if (existing) Object.assign(existing, obj);
      else machineSrv.send({ type:'LOAD_ANIMATION', data: obj });

      refreshSched(); api.flush();
    },
    loadAUSnippet(sn, prio=0){ api.loadFromJSON({...sn,snippetCategory:'auSnippet'}, 'auSnippet', prio); },
    loadVisemeSnippet(sn, prio=50){ api.loadFromJSON({...sn,snippetCategory:'visemeSnippet'}, 'visemeSnippet', prio); },

    /* immediate evaluate */
    flush(){ scheduler.flush(machineSrv.state.context.animations); },

    /* global transport */
    play(){  transportRunning=true;  machineSrv.send('PLAY_ALL');  refreshSched(); },
    pause(){ transportRunning=false; machineSrv.send('PAUSE_ALL'); refreshSched(); },
    stop(){  transportRunning=false; machineSrv.send('STOP_ALL');  refreshSched(); api.flush(); },

    setPlaybackRate(v){
      const now = Date.now();
      machineSrv.state.context.animations.forEach(sn => {
        const cur = ((now-sn.startWallTime)/1000)*sn.snippetPlaybackRate;
        sn.snippetPlaybackRate = v;
        sn.startWallTime = now - (cur/v)*1000;
      });
      refreshSched(); api.flush();
    },
    setIntensityScale(v){
      machineSrv.state.context.animations.forEach(sn => sn.snippetIntensityScale = v);
      api.flush();
    },

    /* snippet‑level helpers */
    removeAnimation(name){ machineSrv.send({type:'REMOVE_ANIMATION', name}); refreshSched(); api.flush(); },
    setSnippetPlaying(n,b){ const sn=machineSrv.state.context.animations.find(a=>a.name===n); if(sn)sn.isPlaying=b; refreshSched(); api.flush(); },
    setSnippetLoop(n,b){ const sn=machineSrv.state.context.animations.find(a=>a.name===n); if(sn)sn.loop=b; refreshSched(); },
    setSnippetTime(n,t){
      const sn=machineSrv.state.context.animations.find(a=>a.name===n); if(!sn)return;
      const now=Date.now(); sn.startWallTime=now-(t/sn.snippetPlaybackRate)*1000; sn.currentTime=t;
      refreshSched(); api.flush();
    },
    setSnippetPlaybackRate(n,v){
      const sn=machineSrv.state.context.animations.find(a=>a.name===n); if(!sn)return;
      const now=Date.now(); const cur=((now-sn.startWallTime)/1000)*sn.snippetPlaybackRate;
      sn.snippetPlaybackRate=v; sn.startWallTime=now-(cur/v)*1000;
      refreshSched(); api.flush();
    },
    setSnippetIntensityScale(n,v){ const sn=machineSrv.state.context.animations.find(a=>a.name===n); if(sn)sn.snippetIntensityScale=v; api.flush(); },

    setAUCurve(nameOrId, maybeId, maybeCurve){
      machineSrv.send({ type:'CURVE_CHANGED', nameOrId, auId:maybeId, curve:maybeCurve });
      refreshSched(); api.flush();
    },

    /* manual slider overrides */
    manualSetBlend(id,val,dur=80,isVis=false){
      if (!facsLib) return;
      if (isVis) {
        const slot = id==='0'?0:parseInt(id,10)-1;
        facsLib.setTargetViseme(slot,val,dur);
      } else facsLib.setTargetAU(id,val,dur*2,1);
      facsLib.updateEngine();
      machineSrv.send({ type:'MANUAL_SET', id, value:val, isViseme:isVis });
    },
    manualClearBlend(id){ machineSrv.send({ type:'MANUAL_CLEAR', id }); },

    /* introspection */
    onTransition(cb){ const sub=machineSrv.subscribe(s=>s.changed&&cb(s)); return ()=>sub.unsubscribe(); },
    getState(){ return machineSrv.state; },

    /* ref‑counted disposal */
    release(){ __refs--; if(__refs<=0){ scheduler.stop(); machineSrv.stop(); __inst=null; __refs=0; } },
    dispose(){ this.release(); }
  };

  __inst = api; __refs = 1; return api;
}