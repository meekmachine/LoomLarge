// VISOS/action/verbalizers/prosodicExpression/prosodicExpressionSchedulerMachine.js
import { createMachine } from 'xstate';

/**
 * This scheduler handles fade-outs for the brow & head loops:
 *   - When we get 'FADE_BROW(label)' => compute leftover time => go through explicit sub-states for each fade step
 *   - Same for 'FADE_HEAD(label)'
 *   - Each fade step is a visible state, not a loop with after/assign.
 *   - 4 fade steps are used for both brow and head for clarity.
 *   - On the last fade step, intensity is set to zero, snippet is removed, and play is paused.
 */

const FADE_STEPS = 4;
const STEP_MS = 120;

function computeSteps(aggregator, label, stepInterval) {
  // aggregator must have getSnippetInfo(label)=>{duration, currentTime, snippetPlaybackRate}
  const info = aggregator.getSnippetInfo?.(label);
  if (!info) return FADE_STEPS;
  const leftSec = Math.max(0, (info.duration - info.currentTime) / (info.snippetPlaybackRate || 1));
  const fadeMs = Math.max(300, leftSec * 1000);
  return Math.max(FADE_STEPS, Math.ceil(fadeMs / stepInterval));
}

export const prosodicExpressionSchedulerMachine = createMachine({
  id: 'prosodicScheduler',
  initial: 'idle',
  context: {
    aggregator: null,
    browLabel: null,
    headLabel: null,
    browSteps: FADE_STEPS,
    headSteps: FADE_STEPS,
    stepInterval: STEP_MS
  },
  states: {
    idle: {
      on: {
        ASSIGN_AGGREGATOR: {
          actions: (ctx, e) => {
            ctx.aggregator = e.aggregator;
          }
        },
        FADE_BROW: {
          target: 'browFading1',
          actions: (ctx, e) => {
            ctx.browLabel = e.label;
            ctx.browSteps = computeSteps(ctx.aggregator, e.label, ctx.stepInterval);
          }
        },
        FADE_HEAD: {
          target: 'headFading1',
          actions: (ctx, e) => {
            ctx.headLabel = e.label;
            ctx.headSteps = computeSteps(ctx.aggregator, e.label, ctx.stepInterval);
          }
        }
      }
    },
    // Brow fading states: 4 steps for clarity
    browFading1: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.75);
      },
      after: {
        [STEP_MS]: 'browFading2'
      },
      on: {
        FADE_HEAD: {
          target: 'bothFading1',
          actions: (ctx, e) => {
            ctx.headLabel = e.label;
            ctx.headSteps = computeSteps(ctx.aggregator, e.label, ctx.stepInterval);
          }
        }
      }
    },
    browFading2: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.5);
      },
      after: {
        [STEP_MS]: 'browFading3'
      }
    },
    browFading3: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.25);
      },
      after: {
        [STEP_MS]: 'browFading4'
      }
    },
    browFading4: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel) {
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0);
          ctx.aggregator.removeAnimation(ctx.browLabel);
          ctx.aggregator.pause?.();
          ctx.aggregator.removeSnippetLabel?.(ctx.browLabel);
        }
      },
      after: {
        [STEP_MS]: 'idle'
      }
    },
    // Head fading states: 4 steps for clarity
    headFading1: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.75);
      },
      after: {
        [STEP_MS]: 'headFading2'
      },
      on: {
        FADE_BROW: {
          target: 'bothFading1',
          actions: (ctx, e) => {
            ctx.browLabel = e.label;
            ctx.browSteps = computeSteps(ctx.aggregator, e.label, ctx.stepInterval);
          }
        }
      }
    },
    headFading2: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.5);
      },
      after: {
        [STEP_MS]: 'headFading3'
      }
    },
    headFading3: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.25);
      },
      after: {
        [STEP_MS]: 'headFading4'
      }
    },
    headFading4: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.headLabel) {
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0);
          ctx.aggregator.removeAnimation(ctx.headLabel);
          ctx.aggregator.pause?.();
          ctx.aggregator.removeSnippetLabel?.(ctx.headLabel);
        }
      },
      after: {
        [STEP_MS]: 'idle'
      }
    },
    // Both fading in parallel (4 steps each)
    bothFading1: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.75);
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.75);
      },
      after: {
        [STEP_MS]: 'bothFading2'
      }
    },
    bothFading2: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.5);
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.5);
      },
      after: {
        [STEP_MS]: 'bothFading3'
      }
    },
    bothFading3: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0.25);
        if (ctx.aggregator && ctx.headLabel)
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0.25);
      },
      after: {
        [STEP_MS]: 'bothFading4'
      }
    },
    bothFading4: {
      entry: (ctx) => {
        if (ctx.aggregator && ctx.browLabel) {
          ctx.aggregator.setSnippetIntensityScale(ctx.browLabel, 0);
          ctx.aggregator.removeAnimation(ctx.browLabel);
        }
        if (ctx.aggregator && ctx.headLabel) {
          ctx.aggregator.setSnippetIntensityScale(ctx.headLabel, 0);
          ctx.aggregator.removeAnimation(ctx.headLabel);
        }
        ctx.aggregator?.pause?.();
        ctx.aggregator?.removeSnippetLabel?.(ctx.browLabel);
        ctx.aggregator?.removeSnippetLabel?.(ctx.headLabel);
      },
      after: {
        [STEP_MS]: 'idle'
      }
    }
  }
});