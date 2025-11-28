# Animation Agency → AnimationMixer Migration (Work-in-Progress)

## Goal
Replace the legacy per-frame curve scheduler (and EngineThree transition calls) with AnimationMixer-driven playback for AU/viseme snippets, including mixed morph+bone continua, while preserving the existing snippet UI (play/pause, rate, intensity, blend).

## Current State (after latest revert)
- Legacy scheduler/machine flow is back to working baseline.
- EngineThree exposes mixer/mixerRoot/model/morph mesh accessors (added during migration attempts).
- Machine and service experiments were reverted; mixer-only playback is not active.

## Intended Mixer-Only Design
- Build `AnimationClip` + `AnimationAction` per snippet/curve once on load/play.
- Tracks per curve:
  - Morph tracks: AU numeric → `AU_TO_MORPHS`/`MORPH_VARIANTS`; non-numeric curveId → treat as morph name.
  - Bone tracks: AU numeric → bone bindings from shapeDict (e.g., `BONE_AU_TO_BINDINGS`/`COMPOSITE_ROTATIONS`), create rotation tracks on model bones.
  - Mixed continua (morph+bone): include both morph and bone tracks in a single action so one weight/timeScale/loop controls both sides (L/R or up/down).
- Snippet settings → action config:
  - Weight ← snippetIntensityScale or mixerWeight
  - TimeScale ← snippetPlaybackRate
  - Loop/clamp ← snippet.loop, mixerLoopMode, mixerClampWhenFinished
  - Blend mode: fade/crossfade/additive/warp using mixer helpers and face-section policies (facePart/faceArea from shapeDict).
- Lifecycle:
  - On LOAD/PLAY: create/reuse actions; start play; cache per snippet/curve/binding.
  - On STEP: **only** `mixer.update(dt)` (no per-frame curve sampling or EngineThree transitions).
  - On STOP/REMOVE: stop actions, uncache.

## Mapping References
- Morphs: `src/engine/arkit/shapeDict.ts` → `AU_TO_MORPHS`, `MORPH_VARIANTS`.
- Bones: same shapeDict → `BONE_AU_TO_BINDINGS`, `COMPOSITE_ROTATIONS` (and facePart/faceArea for section/channel grouping).
- Engine host accessors: `EngineThree.getAnimationMixer/getMixerRoot/getModelRoot/getMorphMeshes`.

## What Broke in the One-Pass Attempt
- Legacy scheduler removed; machine partially rewired; mixer actions morph-only; per-frame fallback sampling introduced → UI stopped listing/playing snippets.
- Takeaway: need incremental changes with testing, not a monolithic swap.

## Recommended Incremental Plan
1) From baseline, keep legacy on. Add SET_HOST/STEP in machine and host mixer accessors (non-breaking). Ensure UI still works.
2) Add mixer actions for morph-only curves (build on load/play, advance mixer on STEP). Keep legacy for bones/mixed.
3) Add bone tracks for AU bindings; build mixed actions (morph+bone). Verify continua stay synced.
4) Switch blend policies per face section; wire UI mixer fields to actions.
5) Remove legacy scheduler/transition calls once mixer covers all targets; clean up action caches and stop logic.

## Notes
- The only per-frame work in mixer mode should be `mixer.update(dt)`; no curve sampling/applying AUs each frame.
- Visemes: treat like morph tracks (curveId morph names or viseme index mapping).
- Keep UI snippet list in sync by relying on machine state; avoid mutating snapshots directly.
