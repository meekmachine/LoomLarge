/**
 * LoomLarge - AU Mapping Types
 *
 * Type definitions for configurable Action Unit mappings.
 * Allows the engine to work with different character rigs (CC4, Mixamo, etc.)
 */

import type { BoneBinding, AUInfo } from '../core/types';

/**
 * AUMappingConfig - Complete configuration for AU-to-morph/bone mappings
 *
 * This is the main configuration object that defines how Action Units
 * map to morph targets and bone transformations for a specific rig type.
 */
export interface AUMappingConfig {
  /** AU ID to morph target names (e.g., AU 12 → ['Mouth_Smile_L', 'Mouth_Smile_R']) */
  auToMorphs: Record<number, string[]>;

  /** AU ID to bone bindings (e.g., AU 51 → [{ node: 'HEAD', channel: 'ry', scale: 1, maxDegrees: 30 }]) */
  auToBones: Record<number, BoneBinding[]>;

  /** Bone key to actual node name in the model (e.g., 'HEAD' → 'CC_Base_Head') */
  boneNodes: Record<string, string>;

  /** Morph category to mesh names (e.g., 'face' → ['CC_Base_Body_1']) */
  morphToMesh: Record<string, string[]>;

  /** Viseme keys in order (typically 15 phoneme positions) */
  visemeKeys: string[];

  /** Optional: Default mix weights for bone/morph blending (0 = morph only, 1 = bone only) */
  auMixDefaults?: Record<number, number>;

  /** Optional: AU metadata (names, muscle basis, etc.) */
  auInfo?: Record<string, AUInfo>;

  /** Optional: Eye mesh node fallbacks (some rigs use mesh nodes instead of bone nodes) */
  eyeMeshNodes?: {
    LEFT: string;
    RIGHT: string;
  };
}

/**
 * Helper type for mesh categories in morphToMesh
 */
export type MorphCategory = 'face' | 'viseme' | 'eye' | 'tearLine' | 'tongue' | 'hair';
