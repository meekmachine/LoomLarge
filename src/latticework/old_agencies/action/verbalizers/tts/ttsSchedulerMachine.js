import { createMachine, assign, sendParent } from 'xstate';

/**
 * Timeline item shape (all offsets in ms):
 *   { type:'WORD',   word,  index, offsetMs }
 *   { type:'EMOJI',  emoji,         offsetMs }
 *   { type:'VISEME', id,            offsetMs, durMs? }
 *
 *   LOAD_TIMELINE -> schedules invoke() that fires events
 *   CANCEL        -> stops everything, returns to idle
 */


export const ttsSchedulerMachine = createMachine({
  id: 'ttsScheduler',
  initial: 'idle',
  context: {
    timeline: [],
    lastVisemeTs: 0 // unix-ms of the most recent VISEME_EVENT
  },

  states: {
    idle: {
      on: {
        LOAD_TIMELINE: {
          target: 'scheduling',
          actions: 'assignTimeline'
        }
      }
    },

    scheduling: {
      invoke: {
        id: 'timelineExec',
        src: (ctx) => (send) => {
          // Schedule each timeline item via setTimeout
          const timers = ctx.timeline.map(item => {
            return setTimeout(() => {
              switch (item.type) {
                case 'WORD':
                  send({ type: 'WORD_EVENT', word: item.word, index: item.index });
                  break;
                case 'EMOJI':
                  send({ type: 'EMOJI_EVENT', emoji: item.emoji });
                  break;
                case 'VISEME':
                  send({ type: 'VISEME_EVENT', visemeId: item.id, durMs: item.durMs });
                  break;
              }
            }, item.offsetMs);
          });

          // Fire TIMELINE_DONE exactly at the last item’s offset + durMs (if any)
          const maxOffset = ctx.timeline.reduce(
            (m, i) => Math.max(m, i.offsetMs + (i.durMs || 0)), 
            0
          );
          const doneTimer = setTimeout(() => {
            send('TIMELINE_DONE');
          }, maxOffset);

          timers.push(doneTimer);

          // Cleanup function for XState invocation
          return () => timers.forEach(clearTimeout);
        }
      },
      onDone: {
        target: 'idle',
        actions: 'clearAll'
      },
      on: {
        WORD_EVENT:   { actions: 'onWordEvent' },
        EMOJI_EVENT:  { actions: 'onEmojiEvent' },
        VISEME_EVENT: { actions: 'onVisemeEvent' },
        CANCEL: {
          target: 'idle',
          actions: 'clearAll'
        },
        TIMELINE_DONE: {
          target: 'idle',
          actions: 'clearAll'
        }
      }
    }
  }
}, {
  actions: {
    assignTimeline: (ctx, e) => {
      ctx.timeline = e.timeline || [];
    },

    onWordEvent: sendParent((_, e) => e),

    // Always forward emoji events – emotive system may debounce internally
    onEmojiEvent: sendParent((_, e) => e),

    onVisemeEvent: assign((ctx, e, { sendParent }) => {
      sendParent(e);
      return {
        ...ctx,
        lastVisemeTs: Date.now()
      };
    }),

    clearAll: assign({
      timeline: (_) => []
    })
  }
});