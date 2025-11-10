// VISOS/action/verbalizers/emotiveExpression/emotiveExpressionMachine.js
import { createMachine, assign } from 'xstate';

/**
 * emotiveExpressionMachine:
 *   States:
 *     - idle
 *     - expressing
 *
 *   aggregator calls:
 *     - PLAY_EMOTION => we store snippetKey => go to "expressing" => action "startSnippet"
 *   machine loads + plays snippet => once done => aggregator => "ANIMATION_DONE" => we remove snippet => go "idle"
 */
export const emotiveExpressionMachine = createMachine({
  id: 'emotiveExpressionMachine',
  initial: 'idle',
  context: {
    animService: null,   // we’ll set this in .withContext from aggregator
    snippetKey: null, 
    playbackRate: 1.0,
    intensityScale: 1.0,

    unsubAnim: null      // to store animService subscription callback if needed
  },
  states: {
    idle: {
      on: {
        PLAY_EMOTION: {
          target: 'expressing',
          actions: 'assignSnippet'
        },
        STOP: {
          // aggregator calls STOP => do nothing if idle
          actions: 'stopSnippet'
        }
      }
    },
    expressing: {
      entry: [
        'startSnippet'
      ],
      on: {
        ANIMATION_DONE: {
          target: 'idle',
          actions: ['stopSnippet','removeSnippet']
        },
        STOP: {
          target: 'idle',
          actions: ['stopSnippet','removeSnippet']
        }
      }
    }
  }
},{
  actions: {
    assignSnippet: assign((ctx, evt) => ({
      ...ctx,
      snippetKey: evt.snippetKey || null,
      playbackRate: evt.playbackRate || 1.0,
      intensityScale: evt.intensityScale || 1.0
    })),

    /**
     * startSnippet:
     *   - Load from localStorage => animService.loadFromLocal => animService.play
     *   - Subscribe to animService => once snippet ends => send "ANIMATION_DONE"
     */
    startSnippet: (ctx, evt) => {
      const { animService, snippetKey, playbackRate, intensityScale } = ctx;
      if(!animService) {
        console.warn('[emotiveExpressionMachine] => no animService => skip => ANIMATION_DONE');
        // send "ANIMATION_DONE" right away
        return;
      }
      if(!snippetKey) {
        console.warn('[emotiveExpressionMachine] => no snippetKey => skip => ANIMATION_DONE');
        // same
        return;
      }

      console.log('[emotiveExpressionMachine] => startSnippet =>', snippetKey);

      // Load snippet from local
      const fullKey = `emotionAnimationsList/${snippetKey}`;
      const dataStr = localStorage.getItem(fullKey);
      if(!dataStr) {
        console.warn('[emotiveExpressionMachine] => snippet missing => skip => ANIMATION_DONE');
        // We could send an event here, but let aggregator or code handle
        return;
      }

      try {
        const parsed = JSON.parse(dataStr);
        parsed.name = snippetKey; 
        parsed.isPlaying = true;
        parsed.loop = false;
        parsed.snippetPlaybackRate = playbackRate;
        parsed.snippetIntensityScale = intensityScale;

        localStorage.setItem('myAnimationTMP', JSON.stringify(parsed));
        animService.loadFromLocal('myAnimationTMP');
        animService.play();

        // Subscribe => once animService => idle => we do "ANIMATION_DONE"
        // We'll store unsub in context if needed => let's do ephemeral
        const unsub = animService.onTransition(animState => {
          if (animState.changed && animState.value === 'idle') {
            // snippet ended => remove => send "ANIMATION_DONE"
            console.log('[emotiveExpressionMachine] => snippet ended => name=', snippetKey);
            animService.removeAnimation(snippetKey);
            localStorage.removeItem('myAnimationTMP');
            // Now dispatch ANIMATION_DONE to the machine
            ctx._xstate_actor.send('ANIMATION_DONE');
          }
        });
        // We can’t store unsub easily in v4 without an assign
        // If we want to unsub on STOP, we can do an action => see "stopSnippet"
        ctx.unsubAnim = unsub;

      } catch(err) {
        console.error('[emotiveExpressionMachine] => parse error =>', err);
        // aggregator => snippet end
      }
    },

    /**
     * stopSnippet => aggregator calls animService.stop => face neutral
     */
    stopSnippet: (ctx, evt) => {
      console.log('[emotiveExpressionMachine] => STOP => aggregator => face neutral => unsub anim');
      // unsub if we want
      if(ctx.unsubAnim) {
        ctx.unsubAnim();
        ctx.unsubAnim = null;
      }
      ctx.animService?.stop();
      // we might remove snippet from memory if we want => see removeSnippet below
    },

    /**
     * removeSnippet => aggregator calls localStorage remove => snippetKey
     */
    removeSnippet: (ctx) => {
      console.log('[emotiveExpressionMachine] => removeSnippet => removing =>', ctx.snippetKey);
      localStorage.removeItem('myAnimationTMP');
      // also remove from animService if needed => but we did that in "startSnippet" callback
    }
  }
});