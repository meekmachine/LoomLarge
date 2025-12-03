import * as THREE from 'three';
import { SpringValue } from '@react-spring/core';
import {
  AU_TO_MORPHS,
  BONE_AU_TO_BINDINGS,
  COMPOSITE_ROTATIONS,
  CC4_BONE_NODES,
  CC4_EYE_MESH_NODES
} from './arkit/shapeDict';
import {
  BONE_DRIVEN_AUS,
  EYE_AXIS,
  MIXED_AUS,
  AU_TO_COMPOSITE_MAP
} from './EngineThree';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const deg2rad = (d: number) => (d * Math.PI) / 180;

type BoneKeys = 'EYE_L' | 'EYE_R' | 'JAW' | 'HEAD' | 'NECK' | 'TONGUE';

type NodeBase = {
  obj: THREE.Object3D;
  basePos: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  baseEuler: THREE.Euler;
};

type ResolvedBones = Partial<Record<BoneKeys, NodeBase>>;

/**
 * EngineFour - React Three Fiber compatible engine
 * Implements the same Engine interface as EngineThree but designed to work
 * with React Three Fiber's reactive model and hooks system
 */
export class EngineFour {
  private auValues: Record<number, number> = {};
  private transitions: Array<{
    kind: 'au' | 'morph';
    id: number | string;
    key?: string;
    from: number;
    to: number;
    elapsed: number;
    dur: number;
    ease: (t: number) => number;
  }> = [];

  // Unified rotation state tracking for composite bones
  private boneRotations = {
    JAW: { pitch: 0, yaw: 0, roll: 0 },
    HEAD: { pitch: 0, yaw: 0, roll: 0 },
    EYE_L: { pitch: 0, yaw: 0, roll: 0 },
    EYE_R: { pitch: 0, yaw: 0, roll: 0 },
    TONGUE: { pitch: 0, yaw: 0, roll: 0 }
  };

  // Track current eye and head positions for composite motion
  private currentEyeYaw: number = 0;
  private currentEyePitch: number = 0;
  private currentHeadYaw: number = 0;
  private currentHeadPitch: number = 0;
  private currentHeadRoll: number = 0;
  private isPaused: boolean = false;
  private easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  private meshes: THREE.Mesh[] = [];
  private model: THREE.Object3D | null = null;
  private bones: ResolvedBones = {};
  private mixWeights: Record<number, number> = {};

  // Spring values for smooth continuum transitions (react-spring based)
  private eyeYawSpring: SpringValue<number>;
  private eyePitchSpring: SpringValue<number>;
  private headYawSpring: SpringValue<number>;
  private headPitchSpring: SpringValue<number>;
  private headRollSpring: SpringValue<number>;
  private jawYawSpring: SpringValue<number>;
  private tongueYawSpring: SpringValue<number>;
  private tonguePitchSpring: SpringValue<number>;

  // Callback for external state updates (React state, etc.)
  private onStateChange?: () => void;

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange;

    // Initialize spring values with onChange handlers that apply the composite motion
    this.eyeYawSpring = new SpringValue(0, {
      onChange: (v) => {
        this.currentEyeYaw = v.value;
        this.applyEyeComposite(this.currentEyeYaw, this.currentEyePitch);
      }
    });
    this.eyePitchSpring = new SpringValue(0, {
      onChange: (v) => {
        this.currentEyePitch = v.value;
        this.applyEyeComposite(this.currentEyeYaw, this.currentEyePitch);
      }
    });
    this.headYawSpring = new SpringValue(0, {
      onChange: (v) => {
        this.currentHeadYaw = v.value;
        this.applyHeadComposite(this.currentHeadYaw, this.currentHeadPitch, this.currentHeadRoll);
      }
    });
    this.headPitchSpring = new SpringValue(0, {
      onChange: (v) => {
        this.currentHeadPitch = v.value;
        this.applyHeadComposite(this.currentHeadYaw, this.currentHeadPitch, this.currentHeadRoll);
      }
    });
    this.headRollSpring = new SpringValue(0, {
      onChange: (v) => {
        this.currentHeadRoll = v.value;
        this.applyHeadComposite(this.currentHeadYaw, this.currentHeadPitch, this.currentHeadRoll);
      }
    });
    this.jawYawSpring = new SpringValue(0, {
      onChange: (v) => {
        this.boneRotations.JAW.yaw = v.value;
        this.applyCompositeBone('JAW');
      }
    });
    this.tongueYawSpring = new SpringValue(0, {
      onChange: (v) => {
        this.boneRotations.TONGUE.yaw = v.value;
        this.applyCompositeBone('TONGUE');
      }
    });
    this.tonguePitchSpring = new SpringValue(0, {
      onChange: (v) => {
        this.boneRotations.TONGUE.pitch = v.value;
        this.applyCompositeBone('TONGUE');
      }
    });
  }

  /** Advance all active transitions by delta time (called from external RAF loop or useFrame) */
  private advanceTransitionsByMs = (dtMs: number) => {
    if (!this.transitions.length || this.isPaused) return;

    this.transitions = this.transitions.filter((tr) => {
      tr.elapsed += dtMs;
      const p = Math.min(1, Math.max(0, tr.elapsed / Math.max(1, tr.dur)));
      const v = tr.from + (tr.to - tr.from) * tr.ease(p);

      if (tr.kind === 'au') this.setAU(tr.id, v);
      else if (tr.kind === 'morph' && tr.key) this.setMorph(tr.key, v);

      return p < 1; // Keep transition if not complete
    });

    // Notify external listeners of state change
    this.onStateChange?.();
  };

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

  /** Smoothly tween an AU to a target value */
  transitionAU = (id: number | string, to: number, durationMs = 200) => {
    // Cancel any existing transition for this AU to prevent conflicts
    this.transitions = this.transitions.filter((t) => !(t.kind === 'au' && t.id === id));

    const from =
      typeof id === 'string'
        ? this.auValues[Number(id.replace(/[^\d]/g, ''))] ?? 0
        : this.auValues[id] ?? 0;

    this.transitions.push({
      kind: 'au',
      id,
      from,
      to,
      elapsed: 0,
      dur: Math.max(1, durationMs),
      ease: this.easeInOutQuad
    });

    this.onStateChange?.();
  };

  /** Smoothly tween a morph target */
  transitionMorph = (key: string, to: number, durationMs = 200) => {
    this.transitions = this.transitions.filter((t) => !(t.kind === 'morph' && t.key === key));

    const from = this.getMorphValue(key);
    this.transitions.push({
      kind: 'morph',
      id: key,
      key,
      from,
      to,
      elapsed: 0,
      dur: Math.max(1, durationMs),
      ease: this.easeInOutQuad
    });

    this.onStateChange?.();
  };

  /** Set AU immediately without transition */
  setAU = (id: number | string, value: number) => {
    const numId = typeof id === 'string' ? Number(id.replace(/[^\d]/g, '')) : id;
    this.auValues[numId] = value;
    this.applyAU(numId, value);
    this.onStateChange?.();
  };

  /** Apply AU to model (main logic) */
  applyAU = (id: number, value: number) => {
    // 1) If AU has composite mapping, update boneRotations and apply composite
    const compMap = AU_TO_COMPOSITE_MAP[id];
    if (compMap && COMPOSITE_ROTATIONS[compMap.boneName]) {
      const rotState = this.boneRotations[compMap.boneName as BoneKeys];
      if (rotState && compMap.axis in rotState) {
        (rotState as any)[compMap.axis] = value;
        this.applyCompositeBone(compMap.boneName as BoneKeys);
      }
    }

    // 2) Check mix weight
    const mixWeight = this.mixWeights[id] ?? 0.5;

    // 3) Apply morph component
    const morphNames = AU_TO_MORPHS[id];
    if (morphNames && morphNames.length > 0) {
      const morphVal = value * (1 - mixWeight);
      morphNames.forEach((mName) => this.setMorph(mName, morphVal));
    }

    // 4) Apply bone component
    const boneBindings = BONE_AU_TO_BINDINGS[id];
    if (boneBindings && boneBindings.length > 0) {
      const boneVal = value * mixWeight;
      boneBindings.forEach((b) => {
        const bone = this.bones[b.node as BoneKeys];
        if (!bone) return;

        // Eye axis override for CC rigs (same logic as EngineThree)
        let binding = { ...b };
        if (id >= 61 && id <= 62) {
          binding = { ...binding, channel: EYE_AXIS.yaw };
        } else if (id >= 63 && id <= 64) {
          binding = { ...binding, channel: EYE_AXIS.pitch };
        }

        const absVal = Math.abs(boneVal);
        const sign = boneVal >= 0 ? 1 : -1;

        // Apply rotation or translation based on channel
        if (binding.channel.startsWith('r')) {
          // Rotation channel
          const maxDeg = binding.maxDegrees || 30;
          const radians = deg2rad(maxDeg) * absVal * binding.scale * sign;
          const axis =
            binding.channel === 'rx' ? X_AXIS : binding.channel === 'ry' ? Y_AXIS : Z_AXIS;
          const q = new THREE.Quaternion().setFromAxisAngle(axis, radians);
          bone.obj.quaternion.copy(bone.baseQuat).multiply(q);
        } else if (binding.channel.startsWith('t')) {
          // Translation channel
          const maxUnits = binding.maxUnits || 1;
          const offset = maxUnits * absVal * binding.scale * sign;
          const vec = new THREE.Vector3();
          if (binding.channel === 'tx') vec.x = offset;
          else if (binding.channel === 'ty') vec.y = offset;
          else if (binding.channel === 'tz') vec.z = offset;
          bone.obj.position.copy(bone.basePos).add(vec);
        }
      });
    }
  };

  /** Apply composite bone rotation (pitch, yaw, roll) */
  private applyCompositeBone = (boneName: BoneKeys) => {
    const bone = this.bones[boneName];
    if (!bone) return;

    const rotState = this.boneRotations[boneName];
    const rotConfig = COMPOSITE_ROTATIONS.find(c => c.node === boneName);
    if (!rotConfig) return;

    // Map rotState axes to actual bone axes (rx/ry/rz) defined in shapeDict
    let rx = 0, ry = 0, rz = 0;
    const toRad = (v: number) => deg2rad(v * 30); // use 30deg span for continuum

    if (rotConfig.pitch) {
      const r = toRad(rotState.pitch);
      if (rotConfig.pitch.axis === 'rx') rx = r;
      else if (rotConfig.pitch.axis === 'ry') ry = r;
      else if (rotConfig.pitch.axis === 'rz') rz = r;
    }
    if (rotConfig.yaw) {
      const r = toRad(rotState.yaw);
      if (rotConfig.yaw.axis === 'rx') rx = r;
      else if (rotConfig.yaw.axis === 'ry') ry = r;
      else if (rotConfig.yaw.axis === 'rz') rz = r;
    }
    if (rotConfig.roll) {
      const r = toRad(rotState.roll);
      if (rotConfig.roll.axis === 'rx') rx = r;
      else if (rotConfig.roll.axis === 'ry') ry = r;
      else if (rotConfig.roll.axis === 'rz') rz = r;
    }

    const euler = new THREE.Euler(rx, ry, rz, 'XYZ');

    const q = new THREE.Quaternion().setFromEuler(euler);
    bone.obj.quaternion.copy(bone.baseQuat).multiply(q);
  };

  // --- Composite helpers (mirrors EngineThree) ---
  private applyMorphs(names: string[], value: number) {
    const v = Math.max(0, Math.min(1, value));
    for (const name of names) {
      this.setMorph(name, v);
    }
  }

  private applyBoneComposite(
    ids: { leftId: number; rightId: number; upId: number; downId: number; tiltLeftId?: number; tiltRightId?: number },
    vals: { yaw: number; pitch: number; roll?: number }
  ) {
    if (!this.model) return;

    const yawId = vals.yaw < 0 ? ids.leftId : vals.yaw > 0 ? ids.rightId : null;
    const pitchId = vals.pitch < 0 ? ids.downId : vals.pitch > 0 ? ids.upId : null;
    const roll = vals.roll ?? 0;
    const tiltId = roll < 0 ? ids.tiltLeftId : roll > 0 ? ids.tiltRightId : null;

    if (!yawId && !pitchId && !tiltId) return;

    type R = { rx?: number; ry?: number; rz?: number; tx?: number; ty?: number; tz?: number; base: NodeBase };
    const perNode = new Map<THREE.Object3D, R>();

    const selected: Array<{ id: number; v: number; bindings: any[] }> = [];
    if (yawId) selected.push({ id: yawId, v: Math.abs(vals.yaw), bindings: BONE_AU_TO_BINDINGS[yawId] || [] });
    if (pitchId) selected.push({ id: pitchId, v: Math.abs(vals.pitch), bindings: BONE_AU_TO_BINDINGS[pitchId] || [] });
    if (tiltId) selected.push({ id: tiltId, v: Math.abs(roll), bindings: BONE_AU_TO_BINDINGS[tiltId] || [] });

    for (const sel of selected) {
      for (const raw of sel.bindings) {
        const b = { ...raw };
        if (sel.id >= 61 && sel.id <= 62) {
          b.channel = EYE_AXIS.yaw;
        } else if (sel.id >= 63 && sel.id <= 64) {
          b.channel = EYE_AXIS.pitch;
        }

        const entry = this.bones[b.node as keyof ResolvedBones];
        if (!entry) continue;

        const signed = Math.min(1, Math.max(-1, sel.v * (b.scale ?? 1)));
        const radians = b.maxDegrees ? deg2rad(b.maxDegrees) * signed : 0;
        const units = b.maxUnits ? b.maxUnits * signed : 0;

        let agg = perNode.get(entry.obj);
        if (!agg) {
          agg = { base: entry };
          perNode.set(entry.obj, agg);
        }
        if (b.channel === 'rx' || b.channel === 'ry' || b.channel === 'rz') {
          agg[b.channel] = (agg[b.channel] ?? 0) + radians;
        } else {
          agg[b.channel] = (agg[b.channel] ?? 0) + units;
        }
      }
    }

    perNode.forEach((agg, obj) => {
      const { base } = agg;
      obj.position.copy(base.basePos);
      if (agg.tx || agg.ty || agg.tz) {
        const dir = new THREE.Vector3(agg.tx ?? 0, agg.ty ?? 0, agg.tz ?? 0);
        dir.applyQuaternion(base.baseQuat);
        obj.position.add(dir);
      }

      const q = new THREE.Quaternion();
      const qx = new THREE.Quaternion();
      const qy = new THREE.Quaternion();
      const qz = new THREE.Quaternion();

      qx.setFromAxisAngle(X_AXIS, agg.rx ?? 0);
      qy.setFromAxisAngle(Y_AXIS, agg.ry ?? 0);
      qz.setFromAxisAngle(Z_AXIS, agg.rz ?? 0);

      q.copy(base.baseQuat).multiply(qy).multiply(qx).multiply(qz);
      obj.quaternion.copy(q);
      obj.updateMatrixWorld(false);
    });
  }

  private applyCompositeMotion(
    baseYawId: number,
    basePitchId: number,
    yaw: number,
    pitch: number,
    downIdOverride?: number,
    tiltIds?: { left: number; right: number },
    roll?: number
  ) {
    const yawMix = this.getAUMixWeight(baseYawId);
    const pitchMix = this.getAUMixWeight(basePitchId);

    const leftId = baseYawId;
    const rightId = baseYawId + 1;
    const upId = basePitchId;
    const downId = downIdOverride ?? basePitchId + 21;

    const yawBone = -yaw;
    const yawAbs = Math.abs(yawBone);
    const pitchAbs = Math.abs(pitch);

    const rollVal = roll ?? 0;
    const rollAbs = Math.abs(rollVal);
    const tiltLeftId = tiltIds?.left;
    const tiltRightId = tiltIds?.right;

    this.applyBoneComposite(
      { leftId, rightId, upId, downId, tiltLeftId, tiltRightId },
      { yaw: yawBone, pitch, roll: rollVal }
    );

    this.applyMorphs(AU_TO_MORPHS[leftId] || [], yaw < 0 ? Math.abs(yaw) * yawMix : 0);
    this.applyMorphs(AU_TO_MORPHS[rightId] || [], yaw > 0 ? Math.abs(yaw) * yawMix : 0);
    this.applyMorphs(AU_TO_MORPHS[downId] || [], pitch < 0 ? pitchAbs * pitchMix : 0);
    this.applyMorphs(AU_TO_MORPHS[upId] || [], pitch > 0 ? pitchAbs * pitchMix : 0);
    if (tiltLeftId && tiltRightId) {
      this.applyMorphs(AU_TO_MORPHS[tiltLeftId] || [], rollVal < 0 ? rollAbs * this.getAUMixWeight(tiltLeftId) : 0);
      this.applyMorphs(AU_TO_MORPHS[tiltRightId] || [], rollVal > 0 ? rollAbs * this.getAUMixWeight(tiltRightId) : 0);
    }
    this.model?.updateMatrixWorld(true);
  }

  /** Set morph target directly */
  setMorph = (name: string, value: number) => {
    for (const m of this.meshes) {
      const dict: any = (m as any).morphTargetDictionary;
      const infl: any = (m as any).morphTargetInfluences;
      if (!dict || !infl) continue;

      const idx = dict[name];
      if (idx !== undefined) {
        infl[idx] = Math.max(0, Math.min(1, value));
      }
    }
  };

  /** Initialize engine with loaded model */
  onReady = ({ meshes, model }: { meshes: THREE.Mesh[]; model: THREE.Object3D }) => {
    this.meshes = meshes;
    this.model = model;
    this.bones = this.resolveBones(model);
    console.log('[EngineFour] Initialized with', meshes.length, 'meshes and bones:', this.bones);
    this.onStateChange?.();
  };

  /** Resolve bones from model */
  private resolveBones(model: THREE.Object3D): ResolvedBones {
    const result: ResolvedBones = {};

    const snapshot = (obj: THREE.Object3D): NodeBase => ({
      obj,
      basePos: obj.position.clone(),
      baseQuat: obj.quaternion.clone(),
      baseEuler: new THREE.Euler().setFromQuaternion(obj.quaternion.clone(), obj.rotation.order),
    });

    const findNode = (name?: string | null): THREE.Object3D | undefined => {
      if (!name) return undefined;
      return model.getObjectByName(name) ?? undefined;
    };

    const register = (key: BoneKeys, primary?: string | null, fallback?: string | null) => {
      const obj = findNode(primary) || findNode(fallback || undefined);
      if (obj) {
        result[key] = snapshot(obj);
      }
    };

    register('EYE_L', CC4_BONE_NODES.EYE_L, CC4_EYE_MESH_NODES.LEFT);
    register('EYE_R', CC4_BONE_NODES.EYE_R, CC4_EYE_MESH_NODES.RIGHT);
    register('JAW', CC4_BONE_NODES.JAW);
    register('HEAD', CC4_BONE_NODES.HEAD);
    register('NECK', CC4_BONE_NODES.NECK);
    register('TONGUE', CC4_BONE_NODES.TONGUE);

    // Optional neck twist
    const neckTwist = findNode(CC4_BONE_NODES.NECK_TWIST);
    if (neckTwist) (result as any).NECK2 = snapshot(neckTwist);

    // Warn if key composites missing
    (['HEAD','EYE_L','EYE_R','JAW','TONGUE'] as const).forEach((key) => {
      if (!result[key]) {
        const expected =
          key === 'EYE_L' ? CC4_BONE_NODES.EYE_L :
          key === 'EYE_R' ? CC4_BONE_NODES.EYE_R :
          key === 'HEAD' ? CC4_BONE_NODES.HEAD :
          key === 'JAW' ? CC4_BONE_NODES.JAW :
          CC4_BONE_NODES.TONGUE;
        console.warn(`[EngineFour] Missing ${key} bone (expected node "${expected}")`);
      }
    });

    return result;
  }

  /** Update engine (called from useFrame or RAF) */
  update = (deltaSeconds: number) => {
    this.advanceTransitionsByMs(deltaSeconds * 1000);
  };

  /** Reset all morphs/bones and transitions to neutral */
  resetToNeutral = () => {
    this.auValues = {};
    this.transitions = [];

    // Reset composite rotation state
    this.boneRotations = {
      JAW: { pitch: 0, yaw: 0, roll: 0 },
      HEAD: { pitch: 0, yaw: 0, roll: 0 },
      EYE_L: { pitch: 0, yaw: 0, roll: 0 },
      EYE_R: { pitch: 0, yaw: 0, roll: 0 },
      TONGUE: { pitch: 0, yaw: 0, roll: 0 }
    };

    this.currentEyeYaw = 0;
    this.currentEyePitch = 0;
    this.currentHeadYaw = 0;
    this.currentHeadPitch = 0;
    this.currentHeadRoll = 0;

    // Zero out morph targets
    for (const m of this.meshes) {
      const infl: any = (m as any).morphTargetInfluences;
      if (infl) {
        for (let i = 0; i < infl.length; i++) infl[i] = 0;
      }
    }

    // Reset bones to bind poses if available
    for (const bone of Object.values(this.bones)) {
      if (!bone) continue;
      bone.obj.position.copy(bone.basePos);
      bone.obj.quaternion.copy(bone.baseQuat);
      bone.obj.rotation.copy(bone.baseEuler);
    }

    this.onStateChange?.();
  };

  /** Pause all transitions */
  pause = () => {
    this.isPaused = true;
  };

  /** Resume transitions */
  resume = () => {
    this.isPaused = false;
  };

  /** Clear all active transitions */
  clearTransitions = () => {
    this.transitions = [];
    this.onStateChange?.();
  };

  /** Get active transition count */
  getActiveTransitionCount = () => this.transitions.length;

  // Composite continuum helpers
  setEyesHorizontal = (value: number) => {
    this.applyEyeComposite(value, this.currentEyePitch);
  };

  setEyesVertical = (value: number) => {
    this.applyEyeComposite(this.currentEyeYaw, value);
  };

  setHeadHorizontal = (value: number) => {
    this.applyHeadComposite(value, this.currentHeadPitch, this.currentHeadRoll);
  };

  setHeadVertical = (value: number) => {
    this.applyHeadComposite(this.currentHeadYaw, value, this.currentHeadRoll);
  };

  setHeadRoll = (value: number) => {
    this.applyHeadComposite(this.currentHeadYaw, this.currentHeadPitch, value);
  };

  // Alias for backwards compatibility
  setHeadTilt = this.setHeadRoll;

  setJawHorizontal = (value: number) => {
    this.boneRotations.JAW.yaw = value;
    this.applyCompositeBone('JAW');
  };

  setTongueHorizontal = (value: number) => {
    this.boneRotations.TONGUE.yaw = value;
    this.applyCompositeBone('TONGUE');
  };

  setTongueVertical = (value: number) => {
    this.boneRotations.TONGUE.pitch = value;
    this.applyCompositeBone('TONGUE');
  };

  /** Set AU mix weight (0 = all morph, 1 = all bone) */
  setAUMixWeight = (id: number, weight: number) => {
    this.mixWeights[id] = Math.max(0, Math.min(1, weight));
    // Re-apply current value with new mix
    const currentVal = this.auValues[id] ?? 0;
    this.applyAU(id, currentVal);
  };

  getAUMixWeight = (id: number): number => {
    return this.mixWeights[id] ?? 0.5;
  };

  /** Apply composite head rotation (bones + morphs) */
  applyHeadComposite = (yaw: number, pitch: number, roll: number) => {
    this.currentHeadYaw = Math.max(-1, Math.min(1, yaw));
    this.currentHeadPitch = Math.max(-1, Math.min(1, pitch));
    this.currentHeadRoll = Math.max(-1, Math.min(1, roll));
    this.applyCompositeMotion(31, 33, this.currentHeadYaw, this.currentHeadPitch, 54, { left: 55, right: 56 }, this.currentHeadRoll);
  };

  /** Apply composite eye rotation (bones + morphs) */
  applyEyeComposite = (yaw: number, pitch: number) => {
    this.currentEyeYaw = Math.max(-1, Math.min(1, yaw));
    this.currentEyePitch = Math.max(-1, Math.min(1, pitch));
    this.applyCompositeMotion(61, 63, this.currentEyeYaw, this.currentEyePitch, 64);
  };

  // ============================================================
  // Spring-based transition methods (smooth physics-based animations)
  // ============================================================

  /** Helper to convert duration to spring config */
  private durationToSpringConfig = (durationMs: number) => {
    // Map duration to spring tension/friction for similar timing
    // Shorter durations = higher tension, lower friction
    // Longer durations = lower tension, higher friction
    const baseTension = 300;
    const baseFriction = 26;
    const durationFactor = Math.max(0.1, durationMs / 200); // 200ms as baseline
    return {
      tension: baseTension / durationFactor,
      friction: baseFriction * Math.sqrt(durationFactor),
      precision: 0.001,
    };
  };

  /** Smoothly transition eyes horizontal (yaw) over duration */
  transitionEyesHorizontal = (targetValue: number, durationMs: number = 200) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.eyeYawSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition eyes vertical (pitch) over duration */
  transitionEyesVertical = (targetValue: number, durationMs: number = 200) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.eyePitchSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition head horizontal (yaw) over duration */
  transitionHeadHorizontal = (targetValue: number, durationMs: number = 300) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.headYawSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition head vertical (pitch) over duration */
  transitionHeadVertical = (targetValue: number, durationMs: number = 300) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.headPitchSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition head roll/tilt over duration */
  transitionHeadRoll = (targetValue: number, durationMs: number = 300) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.headRollSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition jaw horizontal (yaw) over duration */
  transitionJawHorizontal = (targetValue: number, durationMs: number = 200) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.jawYawSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition tongue horizontal (yaw) over duration */
  transitionTongueHorizontal = (targetValue: number, durationMs: number = 200) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.tongueYawSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition tongue vertical (pitch) over duration */
  transitionTongueVertical = (targetValue: number, durationMs: number = 200) => {
    const target = Math.max(-1, Math.min(1, targetValue ?? 0));
    this.tonguePitchSpring.start(target, { config: this.durationToSpringConfig(durationMs) });
  };

  /** Smoothly transition both eye axes together */
  transitionEyeComposite = (targetYaw: number, targetPitch: number, durationMs: number = 200) => {
    const config = this.durationToSpringConfig(durationMs);
    const yaw = Math.max(-1, Math.min(1, targetYaw ?? 0));
    const pitch = Math.max(-1, Math.min(1, targetPitch ?? 0));
    this.eyeYawSpring.start(yaw, { config });
    this.eyePitchSpring.start(pitch, { config });
  };

  /** Smoothly transition all head axes together */
  transitionHeadComposite = (targetYaw: number, targetPitch: number, targetRoll: number = 0, durationMs: number = 300) => {
    const config = this.durationToSpringConfig(durationMs);
    const yaw = Math.max(-1, Math.min(1, targetYaw ?? 0));
    const pitch = Math.max(-1, Math.min(1, targetPitch ?? 0));
    const roll = Math.max(-1, Math.min(1, targetRoll ?? 0));
    this.headYawSpring.start(yaw, { config });
    this.headPitchSpring.start(pitch, { config });
    this.headRollSpring.start(roll, { config });
  };
}
