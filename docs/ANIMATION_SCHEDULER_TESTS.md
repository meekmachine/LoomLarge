# Animation Scheduler Test Coverage

This document summarizes what the Vitest suite under `src/latticework/animation/__tests__/animationScheduler.test.ts`
verifies now that the scheduler relies entirely on the external render-loop clock
(and EngineThree's `THREE.AnimationMixer`) for timing.

## 1. Basic Loading
- Snippets load into the animation machine with normalized curves and calculated durations.
- Calling `play()` flips the scheduler into the playing state.

## 2. Time Stepping Semantics
- `step(dt)` advances the scheduler's internal play clock and updates snippet
  `currentTime` based on their playback rates.
- Non-looping snippets clamp to their final keyframe time once their duration is exceeded.
- Looping snippets wrap their local time back into `[0, duration)` after completing a cycle.

## 3. Playback Rate Effects
- Changing `snippetPlaybackRate` accelerates or slows local time accumulation when
  the wall-clock anchor indicates a second of real time has elapsed.

## 4. Intensity Scaling & Priority Resolution
- Snippet `snippetIntensityScale` values multiply sampled curve values before being
  clamped and sent to the host.
- Higher-priority snippets win AU conflicts regardless of value, and when priorities
  tie the higher sampled value wins.

## 5. Seeking
- `seek()` updates both the snippet's `currentTime` and its wall-clock anchor so
  subsequent ticks continue from the requested offset.

These tests intentionally focus on scheduler-level behavior. EngineThree's animation
mixer interpolation is assumed to be exercised by integration tests elsewhere.
