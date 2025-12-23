import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { HalftonePass } from 'three/examples/jsm/postprocessing/HalftonePass.js';
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { SepiaShader } from 'three/examples/jsm/shaders/SepiaShader.js';
import {
  AU_TO_MORPHS,
  BONE_AU_TO_BINDINGS,
  AU_MIX_DEFAULTS,
  CC4_BONE_NODES,
  CC4_EYE_MESH_NODES,
  CC4_MESHES,
  VISEME_KEYS,
} from './arkit/shapeDict';
import type { TransitionHandle } from './EngineThree.types';
import { ThreeAnimation } from './ThreeAnimation';

// Post-processing effect types
export type PostEffect =
  | 'none'
  | 'bloom'
  | 'film'
  | 'glitch'
  | 'halftone'
  | 'dotScreen'
  | 'vignette'
  | 'sepia';

// Effect parameter types
export type BloomParams = { strength: number; radius: number; threshold: number };
export type FilmParams = { intensity: number };
export type GlitchParams = { wild: boolean };
export type HalftoneParams = { radius: number; scatter: number; greyscale: boolean };
export type DotScreenParams = { scale: number; angle: number };
export type VignetteParams = { offset: number; darkness: number };
export type SepiaParams = { amount: number };

export type EffectParams = {
  bloom: BloomParams;
  film: FilmParams;
  glitch: GlitchParams;
  halftone: HalftoneParams;
  dotScreen: DotScreenParams;
  vignette: VignetteParams;
  sepia: SepiaParams;
};

// Default effect parameters
export const DEFAULT_EFFECT_PARAMS: EffectParams = {
  bloom: { strength: 0.5, radius: 0.4, threshold: 0.85 },
  film: { intensity: 0.35 },
  glitch: { wild: false },
  halftone: { radius: 4, scatter: 0, greyscale: false },
  dotScreen: { scale: 0.8, angle: 0.5 },
  vignette: { offset: 1.0, darkness: 1.2 },
  sepia: { amount: 0.9 },
};

// ============================================================================
// DERIVED CONSTANTS - computed from shapeDict core data
// ============================================================================

/** All AU IDs that have bone bindings */
export const BONE_DRIVEN_AUS = new Set(Object.keys(BONE_AU_TO_BINDINGS).map(Number));


/** AUs that have both morphs and bones - can blend between them */
export const MIXED_AUS = new Set(
  Object.keys(AU_TO_MORPHS)
    .map(Number)
    .filter(id => AU_TO_MORPHS[id]?.length && BONE_AU_TO_BINDINGS[id]?.length)
);

/** Check if an AU has separate left/right morphs */
export const hasLeftRightMorphs = (auId: number): boolean => {
  const keys = AU_TO_MORPHS[auId] || [];
  return keys.some(k => /_L$|_R$|Left$|Right$/.test(k));
};

const X_AXIS = new THREE.Vector3(1,0,0);
const Y_AXIS = new THREE.Vector3(0,1,0);
const Z_AXIS = new THREE.Vector3(0,0,1);
const deg2rad = (d: number) => (d * Math.PI) / 180;

type BoneKeys = 'EYE_L' | 'EYE_R' | 'JAW' | 'HEAD' | 'NECK' | 'TONGUE';

type NodeBase = {
  obj: THREE.Object3D;
  basePos: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  baseEuler: THREE.Euler;
};

type ResolvedBones = Partial<Record<BoneKeys, NodeBase>>;
export class EngineThree {
  private auValues: Record<number, number> = {};

  // Unified transition system - delegated to ThreeAnimation
  private animation = new ThreeAnimation();

  private rigReady = false;
  private missingBoneWarnings = new Set<string>();

  // Skybox storage
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private skyboxTexture: THREE.Texture | null = null;


  // Post-processing
  private composer: EffectComposer | null = null;
  private currentEffect: PostEffect = 'none';
  private effectPass: Pass | null = null;
  private effectParams: EffectParams = { ...DEFAULT_EFFECT_PARAMS };

  // Unified rotation state tracking for bones
  // Each axis stores value (signed, with scale applied) and maxDegrees for rendering
  private rotations: Record<string, Record<'pitch' | 'yaw' | 'roll', { value: number; maxDegrees: number }>> = {
    JAW: { pitch: { value: 0, maxDegrees: 0 }, yaw: { value: 0, maxDegrees: 0 }, roll: { value: 0, maxDegrees: 0 } },
    HEAD: { pitch: { value: 0, maxDegrees: 0 }, yaw: { value: 0, maxDegrees: 0 }, roll: { value: 0, maxDegrees: 0 } },
    EYE_L: { pitch: { value: 0, maxDegrees: 0 }, yaw: { value: 0, maxDegrees: 0 }, roll: { value: 0, maxDegrees: 0 } },
    EYE_R: { pitch: { value: 0, maxDegrees: 0 }, yaw: { value: 0, maxDegrees: 0 }, roll: { value: 0, maxDegrees: 0 } },
    TONGUE: { pitch: { value: 0, maxDegrees: 0 }, yaw: { value: 0, maxDegrees: 0 }, roll: { value: 0, maxDegrees: 0 } }
  };

  // Nodes with pending rotation changes - applied once per frame in update()
  private pendingCompositeNodes = new Set<string>();
  private isPaused: boolean = false;

  // ============================================================================
  // INTERNAL RAF LOOP - EngineThree owns the frame loop
  // ============================================================================
  private clock = new THREE.Clock();
  private rafId: number | null = null;
  private running = false;

  /** Start the internal RAF loop */
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();

    const tick = () => {
      if (!this.running) return;
      const dt = this.clock.getDelta();

      // Update transitions, mixers, mouse tracking
      this.update(dt);

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /** Stop the internal RAF loop */
  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.clock.stop();
  }

  /** Check if the engine loop is running */
  isRunning(): boolean {
    return this.running;
  }

  /** Dispose the engine */
  dispose() {
    this.stop();
  }

  // ============================================================================
  // OPTIMIZED TRANSITION SYSTEM
  // Pre-resolves morph indices and bone references at transition creation time
  // ============================================================================


  // No constructor needed - all state is initialized inline

  private getMorphValue(key: string): number {
    for (const m of this.meshes) {
      const dict: any = (m as any).morphTargetDictionary;
      const infl: any = (m as any).morphTargetInfluences;
      if (!dict || !infl) continue;
      const idx = dict[key];
      if (idx !== undefined) return infl[idx] ?? 0;
    }
    return 0;
  }
  /**
   * Smoothly tween an AU to a target value.
   * For continuum pairs (e.g., AU 41/42 tongue tilt), supports -1 to +1 range:
   * - Negative values activate the paired AU
   * - Positive values activate this AU
   */
  /**
   * Smoothly tween an AU to a target value.
   * For continuum pairs (e.g., AU 41/42 tongue tilt), supports -1 to +1 range.
   *
   * @param id - AU ID (number) or string with side suffix ('12L', '12R')
   * @param to - Target intensity value
   * @param durationMs - Transition duration in milliseconds
   * @param balance - Optional left/right balance: -1 = left only, 0 = both equally, +1 = right only
   */
  transitionAU = (id: number | string, to: number, durationMs = 200, balance?: number): TransitionHandle => {
    const numId = typeof id === 'string' ? Number(id.replace(/[^\d]/g, '')) : id;
    const target = clamp01(to);

    // Get morph keys and bone bindings directly from shape dict
    const morphKeys = AU_TO_MORPHS[numId] || [];
    const bindings = BONE_AU_TO_BINDINGS[numId] || [];

    // Calculate balance scales
    const effectiveBalance = balance ?? 0;
    const leftScale = effectiveBalance >= 0 ? 1 - effectiveBalance : 1;
    const rightScale = effectiveBalance <= 0 ? 1 + effectiveBalance : 1;

    this.auValues[numId] = target;

    const handles: TransitionHandle[] = [];

    // Transition morphs - L/R pairs get balance scaling, others get full target
    const [leftMorph, rightMorph, ...rest] = morphKeys;
    if (leftMorph) handles.push(this.transitionMorph(leftMorph, target * leftScale, durationMs));
    if (rightMorph) handles.push(this.transitionMorph(rightMorph, target * rightScale, durationMs));
    for (const morph of rest) handles.push(this.transitionMorph(morph, target, durationMs));

    // Transition bones - eyes have 2 bindings (EYE_L, EYE_R), others have 1
    for (const binding of bindings) {
      const axis = binding.channel === 'rx' ? 'pitch' : binding.channel === 'ry' ? 'yaw' : 'roll';
      handles.push(this.transitionBoneRotation(
        binding.node,
        axis,
        target * binding.scale,
        binding.maxDegrees ?? 0,
        durationMs
      ));
    }

    return this.combineHandles(handles);
  };

  /** Smoothly tween a morph to a target value */
  transitionMorph = (key: string, to: number, durationMs = 120): TransitionHandle => {
    const transitionKey = `morph_${key}`;
    const from = this.getMorphValue(key);
    const target = clamp01(to);
    return this.addTransition(
      transitionKey,
      from,
      target,
      durationMs,
      (value) => this.setMorph(key, value)
    );
  };

  /**
   * Smoothly transition a composite bone rotation axis.
   * Value should already have scale applied. maxDegrees from binding.
   */
  private transitionBoneRotation = (
    nodeKey: string,
    axis: 'pitch' | 'yaw' | 'roll',
    to: number,
    maxDegrees: number,
    durationMs = 200
  ): TransitionHandle => {
    const transitionKey = `bone_${nodeKey}_${axis}`;
    const from = this.rotations[nodeKey]?.[axis]?.value ?? 0;
    const target = Math.max(-1, Math.min(1, to));
    return this.addTransition(
      transitionKey,
      from,
      target,
      durationMs,
      (value) => this.updateBoneRotation(nodeKey, axis, value, maxDegrees)
    );
  };

  /**
   * Combine multiple TransitionHandles into one.
   * The combined promise resolves when ALL transitions complete.
   */
  private combineHandles(handles: TransitionHandle[]): TransitionHandle {
    if (handles.length === 0) {
      return { promise: Promise.resolve(), pause: () => {}, resume: () => {}, cancel: () => {} };
    }
    if (handles.length === 1) {
      return handles[0];
    }
    return {
      promise: Promise.all(handles.map(h => h.promise)).then(() => {}),
      pause: () => handles.forEach(h => h.pause()),
      resume: () => handles.forEach(h => h.resume()),
      cancel: () => handles.forEach(h => h.cancel()),
    };
  }

  // ============================================================================
  // VISEME SYSTEM - Separate from AU System
  //
  // Visemes apply morph targets ONLY (no jaw bone rotation).
  // Jaw movement should be controlled separately via AU 26 if needed.
  // - setViseme() / transitionViseme() apply morph targets only
  // - The AnimationScheduler routes viseme curve IDs (0-14) to transitionViseme()
  // ============================================================================

  /** Track current viseme values for transitions */
  private visemeValues: number[] = new Array(15).fill(0);

  /**
   * Set viseme value immediately (no transition)
   * Applies viseme morph target only (no jaw bone rotation)
   *
   * @param visemeIndex - Viseme index (0-14) corresponding to VISEME_KEYS
   * @param value - Target value in [0, 1]
   * @param _jawScale - Unused, kept for API compatibility
   */
  setViseme = (visemeIndex: number, value: number, _jawScale: number = 1.0) => {
    if (visemeIndex < 0 || visemeIndex >= VISEME_KEYS.length) return;

    const val = clamp01(value);
    this.visemeValues[visemeIndex] = val;

    // Apply viseme morph only (no jaw bone rotation)
    const morphKey = VISEME_KEYS[visemeIndex];
    this.setMorph(morphKey, val);
  };

  /**
   * Smoothly transition a viseme value
   * Applies viseme morph target only (no jaw bone rotation)
   *
   * @param visemeIndex - Viseme index (0-14) corresponding to VISEME_KEYS
   * @param to - Target value in [0, 1]
   * @param durationMs - Transition duration in milliseconds (default: 80ms)
   * @param _jawScale - Unused, kept for API compatibility
   */
  transitionViseme = (visemeIndex: number, to: number, durationMs = 80, _jawScale: number = 1.0): TransitionHandle => {
    if (visemeIndex < 0 || visemeIndex >= VISEME_KEYS.length) {
      return { promise: Promise.resolve(), pause: () => {}, resume: () => {}, cancel: () => {} };
    }

    const morphKey = VISEME_KEYS[visemeIndex];
    this.visemeValues[visemeIndex] = clamp01(to);

    // Just call transitionMorph - it handles the transition
    return this.transitionMorph(morphKey, to, durationMs);
  };

  /**
   * Set a continuum AU pair immediately (no animation).
   * Only calls setAU for ONE AU based on sign to avoid bone overwrite.
   */
  setContinuum = (negAU: number, posAU: number, continuumValue: number) => {
    const value = Math.max(-1, Math.min(1, continuumValue));

    if (value < 0) {
      this.setAU(negAU, Math.abs(value));
    } else if (value > 0) {
      this.setAU(posAU, value);
    } else {
      this.setAU(posAU, 0);
    }
  };

  /**
   * Smoothly transition a continuum AU pair.
   * Only calls setAU for ONE AU based on sign to avoid bone overwrite.
   */
  transitionContinuum = (negAU: number, posAU: number, continuumValue: number, durationMs = 200): TransitionHandle => {
    const target = Math.max(-1, Math.min(1, continuumValue));
    const driverKey = `continuum_${negAU}_${posAU}`;

    const currentNeg = this.auValues[negAU] ?? 0;
    const currentPos = this.auValues[posAU] ?? 0;
    const currentContinuum = currentPos - currentNeg;

    return this.addTransition(
      driverKey,
      currentContinuum,
      target,
      durationMs,
      (value) => this.setContinuum(negAU, posAU, value)
    );
  };

  /** Advance internal transition tweens by deltaSeconds (called from ThreeProvider RAF loop). */
  update(deltaSeconds: number) {
    const dtSeconds = Math.max(0, deltaSeconds || 0);
    if (dtSeconds <= 0 || this.isPaused) return;

    // Unified transitions (AU, morph, composite movements)
    this.animation.tick(dtSeconds);

    // Flush pending composite rotations (deferred from setAU calls)
    // Also triggers hair updates when HEAD changes
    this.flushPendingComposites();

    // Wind/idle hair animations (only when enabled)
    this.updateHairWindIdle(dtSeconds);
  }

  /** Apply all pending composite rotations and clear the set */
  private flushPendingComposites() {
    if (this.pendingCompositeNodes.size === 0) return;

    // Check if HEAD changed - triggers hair physics update
    const headChanged = this.pendingCompositeNodes.has('HEAD');

    for (const nodeKey of this.pendingCompositeNodes) {
      this.applyCompositeRotation(nodeKey as 'JAW' | 'HEAD' | 'EYE_L' | 'EYE_R' | 'TONGUE');
    }
    this.pendingCompositeNodes.clear();

    // Update hair when head rotation changes
    if (headChanged && this.hairPhysicsEnabled) {
      this.updateHairForHeadChange();
    }
  }

  /**
   * Add or replace a transition for the given key.
   * If a transition with the same key exists, it is cancelled and replaced.
   * @returns TransitionHandle with { promise, pause, resume, cancel }
   */
  private addTransition(
    key: string,
    from: number,
    to: number,
    durationMs: number,
    apply: (value: number) => void,
    easing?: (t: number) => number
  ): TransitionHandle {
    return this.animation.addTransition(
      key,
      from,
      to,
      durationMs,
      apply,
      easing
    );
  }

  /** Clear all running transitions (used when playback rate changes to prevent timing conflicts). */
  clearTransitions() {
    this.animation.clearTransitions();
  }

  /** Pause all active transitions (they will resume when update() is called again). */
  pause() {
    this.isPaused = true;
  }

  /** Resume all paused transitions. */
  resume() {
    this.isPaused = false;
  }

  /** Get current pause state. */
  getPaused(): boolean {
    return this.isPaused;
  }

  /** Get count of active transitions (useful for debugging). */
  getActiveTransitionCount(): number {
    return this.animation.getActiveTransitionCount();
  }

  private meshes: THREE.Mesh[] = [];
  private model: THREE.Object3D | null = null;
  // Cache: object name → array of matching objects (avoids repeated traversals)
  private objectNameCache = new Map<string, THREE.Object3D[]>();
  // Direct reference to registered hair objects (avoids model lookup race condition)
  private registeredHairObjects = new Map<string, THREE.Object3D>();

  // Hair physics state - spring-damper simulation for secondary motion
  private hairPhysicsEnabled = false;
  private hairPhysicsConfig = {
    stiffness: 7.5,
    damping: 0.18,
    inertia: 3.5,
    gravity: 12,
    responseScale: 2.5,
    idleSwayAmount: 0.12,
    idleSwaySpeed: 1.0,
    windStrength: 0,
    windDirectionX: 1.0,
    windDirectionZ: 0,
    windTurbulence: 0.3,
    windFrequency: 1.4,
  };
  // State for wind/idle animations (these need continuous updates)
  private hairWindIdleState = {
    windTime: 0,
    idlePhase: 0,
    smoothedWindX: 0,
    smoothedWindZ: 0,
  };

  /** Get all mesh info for UI display (traverses full model, not just morph meshes) */
  getMeshList = (): Array<{ name: string; visible: boolean; category: string; morphCount: number }> => {
    if (!this.model) return [];
    const result: Array<{ name: string; visible: boolean; category: string; morphCount: number }> = [];
    this.model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const info = CC4_MESHES[mesh.name];
        result.push({
          name: mesh.name,
          visible: mesh.visible,
          category: info?.category || 'other',
          morphCount: info?.morphCount ?? (mesh.morphTargetInfluences?.length || 0),
        });
      }
    });
    return result;
  };

  /** Set mesh visibility by name (searches full model) */
  setMeshVisible = (meshName: string, visible: boolean) => {
    if (!this.model) return;
    this.model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name === meshName) {
        obj.visible = visible;
      }
    });
  };

  /** Set visibility for all meshes of a category */
  setCategoryVisible = (category: string, visible: boolean) => {
    if (!this.model) return;
    this.model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const info = CC4_MESHES[obj.name];
        if (info?.category === category) {
          obj.visible = visible;
        }
      }
    });
  };
  private bones: ResolvedBones = {};

  // --- Mix weight system ---
  // Bones always apply at 100%. Mix weight controls the morph overlay:
  // 0 = bone only (no morph), 1 = bone + full morph overlay
  private mixWeights: Record<number, number> = { ...AU_MIX_DEFAULTS };

  // --- Balance system for bilateral AUs ---
  // Controls left/right asymmetry for AUs with separate L/R morphs (blink, smile, etc.)
  // -1 = left only, 0 = both sides equally, +1 = right only
  private auBalances: Record<number, number> = {};

  setAUMixWeight = (id: number, weight: number) => {
    this.mixWeights[id] = clamp01(weight);

    // Reapply just this AU's morph with the new mix weight
    const v = this.auValues[id] ?? 0;
    if (v > 0) this.applyBothSides(id, v);

    // Mark affected bones as pending
    const boneBindings = BONE_AU_TO_BINDINGS[id];
    if (boneBindings) {
      for (const binding of boneBindings) {
        this.pendingCompositeNodes.add(binding.node);
      }
    }
  };

  getAUMixWeight = (id: number): number => {
    // Return stored mix weight, or default from AU_MIX_DEFAULTS, or 1.0 (full bone)
    return this.mixWeights[id] ?? AU_MIX_DEFAULTS[id] ?? 1.0;
  };

  /**
   * Set the left/right balance for a bilateral AU.
   * @param id - AU ID
   * @param balance - Value from -1 (left only) to +1 (right only), 0 = both sides equally
   */
  setAUBalance = (id: number, balance: number) => {
    this.auBalances[id] = Math.max(-1, Math.min(1, balance));

    // Re-apply the AU with current value and new balance
    const currentValue = this.auValues[id] ?? 0;
    if (currentValue > 0) {
      this.applyBothSides(id, currentValue, this.auBalances[id]);
    }
  };

  /**
   * Get the current left/right balance for an AU.
   * @returns Balance from -1 (left only) to +1 (right only), default 0 (both sides)
   */
  getAUBalance = (id: number): number => {
    return this.auBalances[id] ?? 0;
  };

  /**
   * Reset all facial animation to neutral state.
   * This resets both blend shapes (morphs) AND bone rotations.
   */
  resetToNeutral = () => {
    // 1. Clear all AU values
    this.auValues = {};

    // 2. Reset all composite bone rotation state
    const zero = { value: 0, maxDegrees: 0 };
    this.rotations = {
      JAW: { pitch: { ...zero }, yaw: { ...zero }, roll: { ...zero } },
      HEAD: { pitch: { ...zero }, yaw: { ...zero }, roll: { ...zero } },
      EYE_L: { pitch: { ...zero }, yaw: { ...zero }, roll: { ...zero } },
      EYE_R: { pitch: { ...zero }, yaw: { ...zero }, roll: { ...zero } },
      TONGUE: { pitch: { ...zero }, yaw: { ...zero }, roll: { ...zero } }
    };

    // 3. Clear all active transitions
    this.clearTransitions();

    // 4. Mark all composite bones as pending (they'll reset to base in flushPendingComposites)
    (['HEAD', 'EYE_L', 'EYE_R', 'JAW', 'TONGUE'] as const).forEach(node => {
      this.pendingCompositeNodes.add(node);
    });

    // 5. Zero out all morphs directly
    for (const m of this.meshes) {
      const infl: any = (m as any).morphTargetInfluences;
      if (!infl) continue;
      for (let i = 0; i < infl.length; i++) {
        infl[i] = 0;
      }
    }

    // 6. Reset all bones to their base transforms
    Object.values(this.bones).forEach((entry) => {
      if (!entry) return;
      entry.obj.position.copy(entry.basePos);
      entry.obj.quaternion.copy(entry.baseQuat);
    });
  };

  hasBoneBinding = (id: number) => BONE_DRIVEN_AUS.has(id);

  onReady = ({ meshes, model, scene, renderer, skyboxTexture, composer }: {
    meshes: THREE.Mesh[];
    model?: THREE.Object3D;
    scene?: THREE.Scene;
    renderer?: THREE.WebGLRenderer;
    skyboxTexture?: THREE.Texture;
    composer?: EffectComposer;
  }) => {
    this.meshes = meshes;
    this.objectNameCache.clear();

    if (scene) this.scene = scene;
    if (renderer) this.renderer = renderer;
    if (skyboxTexture) this.skyboxTexture = skyboxTexture;
    if (composer) this.composer = composer;

    if (model) {
      this.model = model;
      this.bones = this.resolveBones(model);
      this.logResolvedOnce(this.bones);
      this.rigReady = true;
      this.missingBoneWarnings.clear();
      this.setupMeshRenderOrder(model);

      // Defer hair registry to next frame
      this.registeredHairObjects.clear();
      requestAnimationFrame(() => {
        if (!this.model) return;
        this.model.traverse((obj) => {
          const info = CC4_MESHES[obj.name];
          if (info?.category === 'hair' || info?.category === 'eyebrow') {
            this.registeredHairObjects.set(obj.name, obj);
          }
        });
      });
    }

  };

  /** Morphs **/
  setMorph = (key: string, v: number) => {
    const val = clamp01(v);
    const isEyeOcclusionMorph = key.startsWith('EO ');
    for (const m of this.meshes) {
      const name = (m.name || '').toLowerCase();
      // Skip occlusion/tearline meshes UNLESS this is an eye occlusion morph
      if (!isEyeOcclusionMorph && (name.includes('occlusion') || name.includes('tearline'))) continue;
      // For eye occlusion morphs, only include occlusion meshes
      if (isEyeOcclusionMorph && !name.includes('occlusion')) continue;
      const dict: any = (m as any).morphTargetDictionary;
      const infl: any = (m as any).morphTargetInfluences;
      if (!dict || !infl) continue;
      const idx = dict[key];
      if (idx !== undefined) infl[idx] = val;
    }
  };

  /**
   * Set a morph on a specific subset of meshes.
   * This avoids iterating over the entire scene for hair-only updates.
   */
  setMorphOnMeshes = (meshNames: string[], key: string, v: number) => {
    if (!meshNames || meshNames.length === 0) {
      this.setMorph(key, v);
      return;
    }

    const val = clamp01(v);
    const nameSet = new Set(meshNames.map((n) => (n || '').toLowerCase()));

    for (const m of this.meshes) {
      const name = (m.name || '').toLowerCase();
      if (!nameSet.has(name)) continue;
      const dict: any = (m as any).morphTargetDictionary;
      const infl: any = (m as any).morphTargetInfluences;
      if (!dict || !infl) continue;
      const idx = dict[key];
      if (idx !== undefined) infl[idx] = val;
    }
  };

  applyMorphs = (keys: string[], v: number) => {
    const val = clamp01(v);
    const foundMorphs: string[] = [];
    const notFoundMorphs: string[] = [];

    for (const k of keys) {
      const isEyeOcclusionMorph = k.startsWith('EO ');
      for (const m of this.meshes) {
        const name = (m.name || '').toLowerCase();
        // Skip occlusion/tearline meshes UNLESS this is an eye occlusion morph
        if (!isEyeOcclusionMorph && (name.includes('occlusion') || name.includes('tearline'))) continue;
        // For eye occlusion morphs, only include occlusion meshes
        if (isEyeOcclusionMorph && !name.includes('occlusion')) continue;
        const dict: any = (m as any).morphTargetDictionary;
        const infl: any = (m as any).morphTargetInfluences;
        if (!dict || !infl) continue;
        const idx = dict[k];
        if (idx !== undefined) {
          infl[idx] = val;
          if (!foundMorphs.includes(k)) foundMorphs.push(k);
        } else {
          if (!notFoundMorphs.includes(k)) notFoundMorphs.push(k);
        }
      }
    }

  };

  /**
   * Set an AU value immediately (no transition).
   *
   * @param id - AU ID (number) or string with side suffix ('12L', '12R')
   * @param v - Intensity value (0-1)
   * @param balance - Optional left/right balance: -1 = left only, 0 = both equally, +1 = right only
   */
  setAU = (id: number | string, v: number, balance?: number) => {
    if (typeof id === 'string') {
      const match = id.match(/^(\d+)([LR])$/i);
      if (match) {
        // Legacy string format: '12L' → setAU(12, v, -1), '12R' → setAU(12, v, +1)
        const au = Number(match[1]);
        const side = match[2].toUpperCase() as 'L' | 'R';
        const sideBalance = side === 'L' ? -1 : 1;
        this.setAU(au, v, sideBalance);
        return;
      }
      const n = Number(id);
      if (!Number.isNaN(n)) {
        this.setAU(n, v, balance);
      }
      return;
    }

    // Get balance from parameter or stored value
    const effectiveBalance = balance ?? this.auBalances[id] ?? 0;

    // Store balance if explicitly provided
    if (balance !== undefined) {
      this.auBalances[id] = Math.max(-1, Math.min(1, balance));
    }

    this.auValues[id] = v;

    // Apply morphs (with balance for bilateral morphs)
    this.applyBothSides(id, v, effectiveBalance);

    // Apply bones - channel tells us axis, scale gives direction
    const bindings = BONE_AU_TO_BINDINGS[id];
    if (bindings) {
      for (const binding of bindings) {
        const axis = binding.channel === 'rx' ? 'pitch' : binding.channel === 'ry' ? 'yaw' : 'roll';
        this.updateBoneRotation(binding.node, axis, v * binding.scale, binding.maxDegrees ?? 0);
      }
    }
  };

  /** Engine internals **/
  /**
   * Apply morphs for an AU, with mix weight scaling for mixed AUs.
   *
   * ⚠️ CRITICAL MIX WEIGHT BEHAVIOR:
   * - For mixed AUs (bones + morphs): morphValue = v * mixWeight
   *   - mixWeight = 0.0 → morphValue = 0 (no morph, bones only)
   *   - mixWeight = 1.0 → morphValue = v (full morph + bones)
   * - For morph-only AUs: morphValue = v (always 100%)
   *
   * Note: Bones are NOT scaled here - they're handled separately in applyCompositeMotion
   * See: MIX_WEIGHT_SYSTEM.md for detailed explanation
   */
  /**
   * Apply morphs for an AU, with mix weight scaling and optional left/right balance.
   *
   * @param id - AU ID
   * @param v - Intensity value (0-1)
   * @param balance - Left/right balance: -1 = left only, 0 = both equally, +1 = right only
   *
   * Balance scaling:
   * - balance = -1: leftScale = 1.0, rightScale = 0.0
   * - balance =  0: leftScale = 1.0, rightScale = 1.0 (default)
   * - balance = +1: leftScale = 0.0, rightScale = 1.0
   */
  private applyBothSides = (id: number, v: number, balance: number = 0) => {
    // For head and eye AUs that aren't left/right split, apply all keys directly
    const globalAUs = new Set([31, 32, 33, 54, 61, 62, 63, 64]);
    const keys = AU_TO_MORPHS[id] || [];

    // ⚠️ CRITICAL: Scale morphs by mixWeight (NOT bones - they're handled elsewhere)
    // For mixed AUs: morphValue = v * mixWeight
    // mixWeight = 0.0 → no morph (bone only)
    // mixWeight = 1.0 → full morph (bone + morph)
    const mixWeight = MIXED_AUS.has(id) ? this.getAUMixWeight(id) : 1.0;
    const morphValue = v * mixWeight;

    if (globalAUs.has(id)) {
      // Global AUs (head, eyes) don't have L/R split - apply uniformly
      this.applyMorphs(keys, morphValue);
    } else {
      const leftKeys = keys.filter(k => /(_L|Left)$/.test(k));
      const rightKeys = keys.filter(k => /(_R|Right)$/.test(k));
      if (leftKeys.length || rightKeys.length) {
        // Calculate left/right scales based on balance
        // balance = -1: left = 1, right = 0
        // balance =  0: left = 1, right = 1
        // balance = +1: left = 0, right = 1
        const leftScale = balance >= 0 ? 1 - balance : 1;
        const rightScale = balance <= 0 ? 1 + balance : 1;

        this.applyMorphs(leftKeys, morphValue * leftScale);
        this.applyMorphs(rightKeys, morphValue * rightScale);
      } else if (keys.length) {
        // No L/R split - apply uniformly
        this.applyMorphs(keys, morphValue);
      }
    }
  };

  /**
   * Update rotation state for a specific axis of a composite bone.
   * Value should already have scale applied (signed direction).
   * maxDegrees is stored for use in applyCompositeRotation.
   */
  private updateBoneRotation(
    nodeKey: string,
    axis: 'pitch' | 'yaw' | 'roll',
    value: number,
    maxDegrees: number
  ) {
    if (!this.rotations[nodeKey]) return; // Skip unknown bones
    this.rotations[nodeKey][axis] = {
      value: Math.max(-1, Math.min(1, value)),
      maxDegrees
    };
    this.pendingCompositeNodes.add(nodeKey);
  }

  /**
   * Apply the complete composite rotation for a bone.
   * Combines pitch/yaw/roll from rotation state into a single quaternion.
   * All values and maxDegrees are already stored in rotations state.
   */
  private applyCompositeRotation(nodeKey: 'JAW' | 'HEAD' | 'EYE_L' | 'EYE_R' | 'TONGUE') {
    const entry = this.bones[nodeKey];
    if (!entry || !this.model) {
      if (!entry && this.rigReady && !this.missingBoneWarnings.has(nodeKey)) {
        this.missingBoneWarnings.add(nodeKey);
      }
      return;
    }

    const { obj, basePos, baseQuat } = entry;
    const rotState = this.rotations[nodeKey];

    // Build composite quaternion from individual axes
    // pitch=rx, yaw=ry, roll=rz
    const compositeQ = new THREE.Quaternion().copy(baseQuat);

    // Apply yaw (ry = Y_AXIS)
    if (rotState.yaw.value !== 0 && rotState.yaw.maxDegrees > 0) {
      const radians = deg2rad(rotState.yaw.maxDegrees) * rotState.yaw.value;
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, radians);
      compositeQ.multiply(deltaQ);
    }

    // Apply pitch (rx = X_AXIS)
    if (rotState.pitch.value !== 0 && rotState.pitch.maxDegrees > 0) {
      const radians = deg2rad(rotState.pitch.maxDegrees) * rotState.pitch.value;
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(X_AXIS, radians);
      compositeQ.multiply(deltaQ);
    }

    // Apply roll (rz = Z_AXIS)
    if (rotState.roll.value !== 0 && rotState.roll.maxDegrees > 0) {
      const radians = deg2rad(rotState.roll.maxDegrees) * rotState.roll.value;
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, radians);
      compositeQ.multiply(deltaQ);
    }

    // Apply composite rotation
    obj.position.copy(basePos);
    obj.quaternion.copy(compositeQ);
    obj.updateMatrixWorld(false);
    this.model.updateMatrixWorld(true);
  }

  /** Resolve CC4 bones using explicit node names (no heuristics). */
  private resolveBones = (root: THREE.Object3D): ResolvedBones => {
    const resolved: ResolvedBones = {};

    const snapshot = (obj: THREE.Object3D): NodeBase => ({
      obj,
      basePos: obj.position.clone(),
      baseQuat: obj.quaternion.clone(),
      baseEuler: new THREE.Euler().setFromQuaternion(obj.quaternion.clone(), obj.rotation.order),
    });

    // Build name→object map in a single traverse (instead of multiple getObjectByName calls)
    const boneNames = new Set([
      CC4_BONE_NODES.EYE_L, CC4_BONE_NODES.EYE_R, CC4_BONE_NODES.JAW,
      CC4_BONE_NODES.HEAD, CC4_BONE_NODES.NECK, CC4_BONE_NODES.TONGUE,
      CC4_BONE_NODES.NECK_TWIST, CC4_EYE_MESH_NODES.LEFT, CC4_EYE_MESH_NODES.RIGHT
    ].filter(Boolean) as string[]);

    const nodeMap = new Map<string, THREE.Object3D>();
    root.traverse((obj) => {
      if (obj.name && boneNames.has(obj.name)) {
        nodeMap.set(obj.name, obj);
      }
    });

    const findNode = (name?: string | null): THREE.Object3D | null => {
      if (!name) return null;
      return nodeMap.get(name) || null;
    };

    const register = (key: BoneKeys, primary?: string | null, fallback?: string | null) => {
      if (resolved[key]) return;
      const node = findNode(primary) || findNode(fallback || undefined);
      if (node) resolved[key] = snapshot(node);
    };

    register('EYE_L', CC4_BONE_NODES.EYE_L, CC4_EYE_MESH_NODES.LEFT);
    register('EYE_R', CC4_BONE_NODES.EYE_R, CC4_EYE_MESH_NODES.RIGHT);
    register('JAW', CC4_BONE_NODES.JAW);
    register('HEAD', CC4_BONE_NODES.HEAD);
    register('NECK', CC4_BONE_NODES.NECK);
    register('TONGUE', CC4_BONE_NODES.TONGUE);

    const neckTwist = findNode(CC4_BONE_NODES.NECK_TWIST);
    if (neckTwist) (resolved as any).NECK2 = snapshot(neckTwist);

    return resolved;
  };

  // ========================================
  // Hair & Eyebrow Color Control
  // ========================================

  /**
   * Set up render order for all meshes to ensure proper layering.
   * Eyes render first (behind), then face/body, then hair (on top).
   * This prevents eyes from showing through transparent hair.
   * Also populates registeredHairObjects for hair physics.
   */
  private setupMeshRenderOrder(model: THREE.Object3D) {
    this.registeredHairObjects.clear();

    model.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const info = CC4_MESHES[mesh.name];
      const category = info?.category;

      // Render order hierarchy:
      // -10: Eyes (render first, behind everything)
      //  -5: Eye occlusion, tear lines
      //   0: Body, teeth, tongue (default)
      //   5: Eyebrows (above face)
      //  10: Hair (render last, on top of everything)
      switch (category) {
        case 'eye':
        case 'cornea':
          mesh.renderOrder = -10;
          break;
        case 'eyeOcclusion':
        case 'tearLine':
          mesh.renderOrder = -5;
          break;
        case 'eyebrow':
          mesh.renderOrder = 5;
          this.registeredHairObjects.set(obj.name, obj);
          break;
        case 'hair':
          mesh.renderOrder = 10;
          this.registeredHairObjects.set(obj.name, obj);
          break;
        // body, teeth, tongue, etc. stay at default 0
      }
    });
  }

  /**
   * Apply color to a hair or eyebrow mesh
   */
  setHairColor(mesh: THREE.Mesh, baseColor: string, emissive: string, emissiveIntensity: number, isEyebrow: boolean = false) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((mat) => {
      const standardMat = mat as THREE.MeshStandardMaterial;

      // Set base color
      if (standardMat.color !== undefined) {
        standardMat.color.set(baseColor);
      }

      // Set emissive glow
      if (standardMat.emissive !== undefined) {
        standardMat.emissive.set(emissive);
        standardMat.emissiveIntensity = emissiveIntensity;
      }
    });

    // Set renderOrder: eyebrows=5, hair=10 (consistent with setupMeshRenderOrder)
    mesh.renderOrder = isEyebrow ? 5 : 10;
  }

  /**
   * Create or remove wireframe outline for a mesh
   */
  setHairOutline(mesh: THREE.Mesh, show: boolean, color: string, opacity: number): THREE.LineSegments | undefined {
    // Remove existing wireframe if present
    const existingWireframe = mesh.children.find(
      (child) => child.name === `${mesh.name}_wireframe`
    ) as THREE.LineSegments | undefined;

    if (existingWireframe) {
      mesh.remove(existingWireframe);
      existingWireframe.geometry.dispose();
      (existingWireframe.material as THREE.Material).dispose();
    }

    // Add wireframe if requested
    if (show) {
      const wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 2,
        transparent: true,
        opacity: opacity,
      });
      const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      wireframe.name = `${mesh.name}_wireframe`;
      mesh.add(wireframe);
      return wireframe;
    }

    return undefined;
  }


  /**
   * Get registered hair objects (populated in onReady from CC4_MESHES)
   */
  getRegisteredHairObjects(): THREE.Object3D[] {
    return Array.from(this.registeredHairObjects.values());
  }

  /**
   * Register hair objects and return engine-agnostic metadata.
   * Classification is handled by shapeDict (single source of truth).
   * Also stores direct references to avoid model lookup race conditions.
   */
  registerHairObjects(objects: THREE.Object3D[]): Array<{
    name: string;
    isEyebrow: boolean;
    isMesh: boolean;
  }> {
    // Store direct references for immediate access (before onReady sets this.model)
    this.registeredHairObjects.clear();
    this.cachedHairMeshNames = null; // Invalidate cache
    objects.forEach(obj => {
      this.registeredHairObjects.set(obj.name, obj);
    });

    return objects.map((obj) => {
      const isMesh = (obj as THREE.Mesh).isMesh || false;
      const info = CC4_MESHES[obj.name];
      const isEyebrow = info?.category === 'eyebrow';

      if (isMesh) {
        const mesh = obj as THREE.Mesh;
        // Eyebrows=5, hair=10 (consistent with setupMeshRenderOrder)
        mesh.renderOrder = isEyebrow ? 5 : 10;
      }

      return {
        name: obj.name,
        isEyebrow,
        isMesh,
      };
    });
  }

  /**
   * Apply hair state to scene objects by name
   * This method handles all Three.js-specific operations for applying hair state
   * NOTE: Handles objects with _1, _2, etc suffixes (e.g. Side_part_wavy_1, Side_part_wavy_2)
   */
  applyHairStateToObject(
    objectName: string,
    state: {
      color: { baseColor: string; emissive: string; emissiveIntensity: number };
      outline: { show: boolean; color: string; opacity: number };
      visible?: boolean;
      scale?: number;
      position?: [number, number, number];
      isEyebrow?: boolean;
    }
  ): THREE.LineSegments | undefined {
    // Use registered hair objects (built in onReady from CC4_MESHES)
    const registeredObj = this.registeredHairObjects.get(objectName);
    if (!registeredObj) {
      // Not a registered hair object - skip silently (may be called before onReady)
      return undefined;
    }

    const matchingObjects = [registeredObj];

    let lastOutline: THREE.LineSegments | undefined;

    // Apply state to all matching objects
    matchingObjects.forEach((object) => {
      // Apply visibility
      if (state.visible !== undefined) {
        object.visible = state.visible;
      }

      // Apply scale
      if (state.scale !== undefined) {
        object.scale.setScalar(state.scale);
      }

      // Apply position
      if (state.position) {
        const [x, y, z] = state.position;
        object.position.set(x, y, z);
      }

      // Apply color if it's a mesh
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;
        this.setHairColor(
          mesh,
          state.color.baseColor,
          state.color.emissive,
          state.color.emissiveIntensity,
          state.isEyebrow || false
        );

        // Apply outline
        lastOutline = this.setHairOutline(
          mesh,
          state.outline.show,
          state.outline.color,
          state.outline.opacity
        );
      }
    });

    return lastOutline;
  }

  /**
   * Get available hair morph targets from a hair object
   * Returns array of morph target names
   */
  getHairMorphTargets(objectName: string): string[] {
    const object = this.model?.getObjectByName(objectName);
    if (!object || !(object as THREE.Mesh).isMesh) return [];

    const mesh = object as THREE.Mesh;
    const dict = (mesh as any).morphTargetDictionary;
    if (!dict) return [];

    return Object.keys(dict);
  }

  // ========================================
  // Hair Physics System
  // ========================================

  /** Enable or disable hair physics simulation */
  setHairPhysicsEnabled(enabled: boolean) {
    this.hairPhysicsEnabled = enabled;
    if (!enabled) {
      // Reset hair morphs to neutral via transitions
      const duration = 200;
      this.transitionHairMorph('L_Hair_Left', 0, duration);
      this.transitionHairMorph('L_Hair_Right', 0, duration);
      this.transitionHairMorph('L_Hair_Front', 0, duration);
      this.transitionHairMorph('Fluffy_Right', 0, duration);
      this.transitionHairMorph('Fluffy_Bottom_ALL', 0, duration);
    }
  }

  /** Update hair physics configuration */
  setHairPhysicsConfig(config: Partial<typeof this.hairPhysicsConfig>) {
    this.hairPhysicsConfig = { ...this.hairPhysicsConfig, ...config };
  }

  /** Get current hair physics config (for UI) */
  getHairPhysicsConfig() {
    return { ...this.hairPhysicsConfig };
  }

  /**
   * Lightweight per-frame update for wind and idle sway.
   * Only runs when wind or idle is enabled. Much cheaper than full physics.
   */
  private updateHairWindIdle(dt: number) {
    if (!this.hairPhysicsEnabled) return;
    if (this.registeredHairObjects.size === 0) return;

    const cfg = this.hairPhysicsConfig;
    const st = this.hairWindIdleState;

    // Skip if neither wind nor idle is active
    const hasWind = cfg.windStrength > 0;
    const hasIdle = cfg.idleSwayAmount > 0;
    if (!hasWind && !hasIdle) return;

    // Update time-based state
    st.idlePhase += dt * cfg.idleSwaySpeed;
    st.windTime += dt;

    // Calculate wind contribution
    let windOffset = 0;
    if (hasWind) {
      const primaryWave = Math.sin(st.windTime * cfg.windFrequency);
      const secondaryWave = Math.sin(st.windTime * cfg.windFrequency * 1.7) * 0.3;
      const waveStrength = primaryWave + secondaryWave;

      const targetWind = cfg.windDirectionX * waveStrength * cfg.windStrength * 0.1;
      const smoothFactor = 1 - Math.exp(-dt * 8);
      st.smoothedWindX += (targetWind - st.smoothedWindX) * smoothFactor;
      windOffset = st.smoothedWindX;
    }

    // Calculate idle sway contribution
    let idleOffset = 0;
    if (hasIdle) {
      idleOffset = Math.sin(st.idlePhase * Math.PI * 2) * cfg.idleSwayAmount;
    }

    // Combined horizontal offset for left/right morphs
    const horizontal = windOffset + idleOffset;

    // Calculate all morph values (same as updateHairForHeadChange)
    const leftValue = clamp01(horizontal > 0 ? horizontal : 0);
    const rightValue = clamp01(horizontal < 0 ? -horizontal : 0);
    const fluffyRightValue = clamp01(rightValue * 0.7);
    const movementIntensity = Math.abs(horizontal);
    const fluffyBottomValue = clamp01(movementIntensity * 0.25);

    // Only update if there's meaningful change
    if (Math.abs(horizontal) > 0.001) {
      const duration = 50; // Short for responsive feel
      this.transitionHairMorph('L_Hair_Left', leftValue, duration);
      this.transitionHairMorph('L_Hair_Right', rightValue, duration);
      this.transitionHairMorph('Fluffy_Right', fluffyRightValue, duration);
      this.transitionHairMorph('Fluffy_Bottom_ALL', fluffyBottomValue, duration);
      // Note: L_Hair_Front is driven by head pitch, not wind/idle
    }
  }

  /**
   * Event-driven hair update - called when HEAD rotation changes.
   * Calculates target morph values and schedules transitions.
   * No per-frame simulation - uses transition system for smooth interpolation.
   */
  private updateHairForHeadChange() {
    if (this.registeredHairObjects.size === 0) return;

    const cfg = this.hairPhysicsConfig;
    const headYaw = this.rotations.HEAD?.yaw?.value ?? 0;
    const headPitch = this.rotations.HEAD?.pitch?.value ?? 0;

    // Calculate hair offset based on head position
    // Hair swings opposite to head rotation (inertia effect)
    const horizontal = -headYaw * cfg.inertia * cfg.responseScale;
    const vertical = headPitch * cfg.gravity * 0.1 * cfg.responseScale;

    // Map to morph targets
    const leftValue = clamp01(horizontal > 0 ? horizontal : 0);
    const rightValue = clamp01(horizontal < 0 ? -horizontal : 0);
    const frontValue = clamp01(vertical * 0.5);
    const fluffyRightValue = clamp01(rightValue * 0.7);
    const movementIntensity = Math.abs(horizontal) + Math.abs(vertical);
    const fluffyBottomValue = clamp01(movementIntensity * 0.25);

    // Schedule transitions for each hair morph (spring-like easing via transition duration)
    const duration = 150; // ms - short for responsive feel
    this.transitionHairMorph('L_Hair_Left', leftValue, duration);
    this.transitionHairMorph('L_Hair_Right', rightValue, duration);
    this.transitionHairMorph('L_Hair_Front', frontValue, duration);
    this.transitionHairMorph('Fluffy_Right', fluffyRightValue, duration);
    this.transitionHairMorph('Fluffy_Bottom_ALL', fluffyBottomValue, duration);
  }

  /**
   * Transition a hair morph target to a value.
   * Only applies to registered hair meshes (not eyebrows).
   */
  private transitionHairMorph(morphKey: string, to: number, durationMs: number) {
    const transitionKey = `hair_${morphKey}`;
    const from = this.getHairMorphValue(morphKey);

    // Get hair mesh names (cached)
    const hairMeshNames = this.getHairMeshNames();
    if (hairMeshNames.length === 0) return;

    this.addTransition(
      transitionKey,
      from,
      to,
      durationMs,
      (value) => this.setMorphOnMeshes(hairMeshNames, morphKey, value)
    );
  }

  /** Get current value of a hair morph (from first hair mesh) */
  private getHairMorphValue(morphKey: string): number {
    const hairMeshNames = this.getHairMeshNames();
    if (hairMeshNames.length === 0) return 0;

    const meshName = hairMeshNames[0];
    const obj = this.registeredHairObjects.get(meshName);
    if (!obj || !(obj as THREE.Mesh).isMesh) return 0;

    const mesh = obj as THREE.Mesh;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dict || !influences) return 0;

    const index = dict[morphKey];
    return index !== undefined ? influences[index] : 0;
  }

  /** Get cached list of hair mesh names (excludes eyebrows) */
  private cachedHairMeshNames: string[] | null = null;
  private getHairMeshNames(): string[] {
    if (this.cachedHairMeshNames) return this.cachedHairMeshNames;

    const names: string[] = [];
    this.registeredHairObjects.forEach((_, name) => {
      const info = CC4_MESHES[name];
      if (info?.category === 'hair') {
        names.push(name);
      }
    });
    this.cachedHairMeshNames = names;
    return names;
  }

  /**
   * Get current head rotation values for hair physics
   * Returns { yaw, pitch, roll } in range [-1, 1]
   */
  getHeadRotation(): { yaw: number; pitch: number; roll: number } {
    return {
      yaw: this.rotations.HEAD?.yaw?.value ?? 0,
      pitch: this.rotations.HEAD?.pitch?.value ?? 0,
      roll: this.rotations.HEAD?.roll?.value ?? 0
    };
  }

  // ========================================
  // End Hair & Eyebrow Control
  // ========================================

  private logResolvedOnce = (_bones: ResolvedBones) => {
    // Debug logging disabled for performance
    // Call engine.logShapeKeys() and engine.logResolvedBones() manually if needed
  };

  // ============================================================================
  // SKYBOX CONTROL METHODS
  // ============================================================================

  /** Rotate skybox - not supported with scene.background texture approach */
  setSkyboxRotation = (_degrees: number) => {
    // Rotation not supported - would require upgrading Three.js or using a skybox mesh
  };

  /** Set skybox blur (0-1) */
  setSkyboxBlur = (blur: number) => {
    if (this.scene) {
      this.scene.backgroundBlurriness = Math.max(0, Math.min(1, blur));
    }
  };

  /** Set skybox intensity (0-2) */
  setSkyboxIntensity = (intensity: number) => {
    if (this.scene) {
      this.scene.backgroundIntensity = Math.max(0, Math.min(2, intensity));
    }
  };

  /** Check if skybox is ready - checks if scene has background */
  isSkyboxReady = (): boolean => {
    return this.scene !== null && this.scene.background !== null;
  };

  /** Set skybox texture reference (called when texture finishes loading) */
  setSkyboxTexture = (texture: THREE.Texture) => {
    this.skyboxTexture = texture;
  };

  // ============================================================================
  // POST-PROCESSING CONTROL METHODS
  // ============================================================================

  /** Set tone mapping type */
  setToneMapping = (type: THREE.ToneMapping) => {
    if (this.renderer) {
      this.renderer.toneMapping = type;
    }
  };

  /** Get current tone mapping type */
  getToneMapping = (): THREE.ToneMapping => {
    return this.renderer?.toneMapping ?? THREE.NoToneMapping;
  };

  /** Set tone mapping exposure (0.1-3) */
  setExposure = (exposure: number) => {
    if (this.renderer) {
      this.renderer.toneMappingExposure = Math.max(0.1, Math.min(3, exposure));
    }
  };

  /** Get current exposure */
  getExposure = (): number => {
    return this.renderer?.toneMappingExposure ?? 1;
  };

  /** Set environment intensity for materials (0-3) */
  setEnvironmentIntensity = (intensity: number) => {
    if (this.scene) {
      (this.scene as any).environmentIntensity = Math.max(0, Math.min(3, intensity));
    }
  };

  /** Get current environment intensity */
  getEnvironmentIntensity = (): number => {
    return (this.scene as any)?.environmentIntensity ?? 1;
  };

  /** Check if renderer is ready for post-processing controls */
  isRendererReady = (): boolean => {
    return this.renderer !== null;
  };

  // ============================================================================
  // POST-PROCESSING EFFECTS
  // ============================================================================

  /** Get current post-processing effect */
  getPostEffect = (): PostEffect => {
    return this.currentEffect;
  };

  /** Set post-processing effect */
  setPostEffect = (effect: PostEffect) => {
    if (!this.composer || !this.renderer) {
      console.warn('[EngineThree] Cannot set post effect - composer or renderer not ready');
      return;
    }

    // Remove current effect pass if exists
    if (this.effectPass) {
      this.composer.removePass(this.effectPass);
      this.effectPass = null;
    }

    this.currentEffect = effect;

    if (effect === 'none') {
      return;
    }

    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const p = this.effectParams;

    // Create the appropriate pass based on effect type
    switch (effect) {
      case 'bloom': {
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          p.bloom.strength,
          p.bloom.radius,
          p.bloom.threshold
        );
        this.effectPass = bloomPass;
        break;
      }
      case 'film': {
        const filmPass = new FilmPass(p.film.intensity);
        this.effectPass = filmPass;
        break;
      }
      case 'glitch': {
        const glitchPass = new GlitchPass();
        glitchPass.goWild = p.glitch.wild;
        this.effectPass = glitchPass;
        break;
      }
      case 'halftone': {
        const halftonePass = new HalftonePass(width, height, {
          shape: 1,
          radius: p.halftone.radius,
          rotateR: Math.PI / 12,
          rotateB: Math.PI / 12 * 2,
          rotateG: Math.PI / 12 * 3,
          scatter: p.halftone.scatter,
          blending: 1,
          blendingMode: 1,
          greyscale: p.halftone.greyscale,
        });
        this.effectPass = halftonePass;
        break;
      }
      case 'dotScreen': {
        const dotScreenPass = new DotScreenPass(
          new THREE.Vector2(0, 0),
          p.dotScreen.angle,
          p.dotScreen.scale
        );
        this.effectPass = dotScreenPass;
        break;
      }
      case 'vignette': {
        const vignettePass = new ShaderPass(VignetteShader);
        vignettePass.uniforms['offset'].value = p.vignette.offset;
        vignettePass.uniforms['darkness'].value = p.vignette.darkness;
        this.effectPass = vignettePass;
        break;
      }
      case 'sepia': {
        const sepiaPass = new ShaderPass(SepiaShader);
        sepiaPass.uniforms['amount'].value = p.sepia.amount;
        this.effectPass = sepiaPass;
        break;
      }
    }

    if (this.effectPass) {
      this.composer.addPass(this.effectPass);
    }
  };

  /** Get effect parameters for a specific effect */
  getEffectParams = <T extends keyof EffectParams>(effect: T): EffectParams[T] => {
    return { ...this.effectParams[effect] };
  };

  /** Set effect parameters and update the effect if it's currently active */
  setEffectParams = <T extends keyof EffectParams>(effect: T, params: Partial<EffectParams[T]>) => {
    this.effectParams[effect] = { ...this.effectParams[effect], ...params } as EffectParams[T];

    // If this effect is currently active, update the pass directly
    if (this.currentEffect === effect && this.effectPass) {
      this.updateEffectPass(effect);
    }
  };

  /** Update the current effect pass with stored parameters */
  private updateEffectPass = (effect: keyof EffectParams) => {
    if (!this.effectPass) return;

    const p = this.effectParams;

    switch (effect) {
      case 'bloom': {
        const pass = this.effectPass as UnrealBloomPass;
        pass.strength = p.bloom.strength;
        pass.radius = p.bloom.radius;
        pass.threshold = p.bloom.threshold;
        break;
      }
      case 'film': {
        const pass = this.effectPass as FilmPass;
        (pass as any).uniforms.intensity.value = p.film.intensity;
        break;
      }
      case 'glitch': {
        const pass = this.effectPass as GlitchPass;
        pass.goWild = p.glitch.wild;
        break;
      }
      case 'halftone': {
        const pass = this.effectPass as HalftonePass;
        (pass as any).uniforms.radius.value = p.halftone.radius;
        (pass as any).uniforms.scatter.value = p.halftone.scatter;
        (pass as any).uniforms.greyscale.value = p.halftone.greyscale ? 1 : 0;
        break;
      }
      case 'dotScreen': {
        const pass = this.effectPass as DotScreenPass;
        (pass as any).uniforms.scale.value = p.dotScreen.scale;
        (pass as any).uniforms.angle.value = p.dotScreen.angle;
        break;
      }
      case 'vignette': {
        const pass = this.effectPass as ShaderPass;
        pass.uniforms['offset'].value = p.vignette.offset;
        pass.uniforms['darkness'].value = p.vignette.darkness;
        break;
      }
      case 'sepia': {
        const pass = this.effectPass as ShaderPass;
        pass.uniforms['amount'].value = p.sepia.amount;
        break;
      }
    }
  };

  /** Check if composer is ready for effects */
  isComposerReady = (): boolean => {
    return this.composer !== null;
  };
}

function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
