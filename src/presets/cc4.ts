/**
 * LoomLarge - Character Creator 4 (CC4) Preset
 *
 * Pre-configured AU mappings for Reallusion Character Creator 4 models.
 * This is the default preset and provides comprehensive FACS support.
 */

import type { AUMappingConfig } from '../mappings/types';
import type { BoneBinding, AUInfo } from '../core/types';

/** AU ID to morph target names */
const AU_TO_MORPHS: Record<number, string[]> = {
  // Brows / Forehead
  1: ['Brow_Raise_Inner_L', 'Brow_Raise_Inner_R'],
  2: ['Brow_Raise_Outer_L', 'Brow_Raise_Outer_R'],
  4: ['Brow_Drop_L', 'Brow_Drop_R'],

  // Eyes / Lids
  5: ['Eye_Wide_L', 'Eye_Wide_R'],
  6: ['Cheek_Raise_L', 'Cheek_Raise_R'],
  7: ['Eye_Squint_L', 'Eye_Squint_R'],
  43: ['Eye_Blink_L', 'Eye_Blink_R'],

  // Nose / Midface
  9: ['Nose_Sneer_L', 'Nose_Sneer_R'],
  34: ['Cheek_Puff_L', 'Cheek_Puff_R'],

  // Mouth / Lips
  8: ['Mouth_Press_L', 'Mouth_Press_R', 'Mouth_Close'],
  10: ['Nose_Sneer_L', 'Nose_Sneer_R'],
  11: ['Mouth_Up_Upper_L', 'Mouth_Up_Upper_R'],
  12: ['Mouth_Smile_L', 'Mouth_Smile_R'],
  13: ['Mouth_Dimple_L', 'Mouth_Dimple_R'],
  14: ['Mouth_Press_L', 'Mouth_Press_R'],
  15: ['Mouth_Frown_L', 'Mouth_Frown_R'],
  16: ['Mouth_Down_Lower_L', 'Mouth_Down_Lower_R'],
  17: ['Mouth_Shrug_Lower'],
  18: ['Mouth_Pucker'],
  20: ['Mouth_Stretch_L', 'Mouth_Stretch_R'],
  22: ['Mouth_Funnel'],
  23: ['Mouth_Press_L', 'Mouth_Press_R'],
  24: ['Mouth_Press_L', 'Mouth_Press_R'],
  25: ['Jaw_Open'],
  26: ['Jaw_Open'],
  27: ['Jaw_Open'],
  28: ['Mouth_Roll_In_Upper', 'Mouth_Roll_In_Lower'],
  32: ['Mouth_Roll_In_Lower'],

  // Tongue
  19: ['Tongue_Out'],
  36: ['Tongue_Bulge_L', 'Tongue_Bulge_R'],
  37: ['Tongue_Up'],
  38: ['Tongue_Down'],
  39: ['Tongue_L'],
  40: ['Tongue_R'],
  41: [],
  42: [],
  73: ['Tongue_Narrow'],
  74: ['Tongue_Wide'],
  75: ['Tongue_Roll'],
  76: ['Tongue_Tip_Up'],
  77: ['Tongue_Tip_Down'],

  // Jaw
  29: ['Jaw_Forward'],
  30: ['Jaw_L'],
  31: [],
  35: ['Jaw_R'],

  // Head position (M51-M56)
  51: ['Head_Turn_L'],
  52: ['Head_Turn_R'],
  53: ['Head_Turn_Up'],
  54: ['Head_Turn_Down'],
  55: ['Head_Tilt_L'],
  56: ['Head_Tilt_R'],

  // Eye Direction
  61: ['Eye_L_Look_L', 'Eye_R_Look_L'],
  62: ['Eye_L_Look_R', 'Eye_R_Look_R'],
  63: ['Eye_L_Look_Up', 'Eye_R_Look_Up'],
  64: ['Eye_L_Look_Down', 'Eye_R_Look_Down'],
  65: ['Eye_L_Look_L'],
  66: ['Eye_L_Look_R'],
  67: ['Eye_L_Look_Up'],
  68: ['Eye_L_Look_Down'],
  69: ['Eye_R_Look_L'],
  70: ['Eye_R_Look_R'],
  71: ['Eye_R_Look_Up'],
  72: ['Eye_R_Look_Down'],

  // Eye occlusion morphs (EO)
  80: ['EO Bulge L', 'EO Bulge R'],
  81: ['EO Depth L', 'EO Depth R'],
  82: ['EO Inner Depth L', 'EO Inner Depth R'],
  83: ['EO Inner Height L', 'EO Inner Height R'],
  84: ['EO Inner Width L', 'EO Inner Width R'],
  85: ['EO Outer Depth L', 'EO Outer Depth R'],
  86: ['EO Outer Height L', 'EO Outer Height R'],
  87: ['EO Outer Width L', 'EO Outer Width R'],
  88: ['EO Upper Depth L', 'EO Upper Depth R'],
  89: ['EO Lower Depth L', 'EO Lower Depth R'],
  90: ['EO Center Upper Depth L', 'EO Center Upper Depth R'],
  91: ['EO Center Upper Height L', 'EO Center Upper Height R'],
  92: ['EO Center Lower Depth L', 'EO Center Lower Depth R'],
  93: ['EO Center Lower Height L', 'EO Center Lower Height R'],
  94: ['EO Inner Upper Depth L', 'EO Inner Upper Depth R'],
  95: ['EO Inner Upper Height L', 'EO Inner Upper Height R'],
  96: ['EO Inner Lower Depth L', 'EO Inner Lower Depth R'],
  97: ['EO Inner Lower Height L', 'EO Inner Lower Height R'],
  98: ['EO Outer Upper Depth L', 'EO Outer Upper Depth R'],
  99: ['EO Outer Upper Height L', 'EO Outer Upper Height R'],
  100: ['EO Outer Lower Depth L', 'EO Outer Lower Depth R'],
  101: ['EO Outer Lower Height L', 'EO Outer Lower Height R'],
  102: ['EO Duct Depth L', 'EO Duct Depth R'],
};

/** Viseme morph target keys */
const VISEME_KEYS: string[] = [
  'EE', 'Er', 'IH', 'Ah', 'Oh', 'W_OO', 'S_Z', 'Ch_J', 'F_V',
  'TH', 'T_L_D_N', 'B_M_P', 'K_G_H_NG', 'AE', 'R'
];

/** AU ID to bone bindings */
const BONE_AU_TO_BINDINGS: Record<number, BoneBinding[]> = {
  // Head turn and tilt (M51-M56)
  51: [{ node: 'HEAD', channel: 'ry', scale: 1, maxDegrees: 30 }],
  52: [{ node: 'HEAD', channel: 'ry', scale: -1, maxDegrees: 30 }],
  53: [{ node: 'HEAD', channel: 'rx', scale: -1, maxDegrees: 20 }],
  54: [{ node: 'HEAD', channel: 'rx', scale: 1, maxDegrees: 20 }],
  55: [{ node: 'HEAD', channel: 'rz', scale: -1, maxDegrees: 15 }],
  56: [{ node: 'HEAD', channel: 'rz', scale: 1, maxDegrees: 15 }],

  // Eyes
  61: [
    { node: 'EYE_L', channel: 'rz', scale: 1, maxDegrees: 32 },
    { node: 'EYE_R', channel: 'rz', scale: 1, maxDegrees: 32 },
  ],
  62: [
    { node: 'EYE_L', channel: 'rz', scale: -1, maxDegrees: 32 },
    { node: 'EYE_R', channel: 'rz', scale: -1, maxDegrees: 32 },
  ],
  63: [
    { node: 'EYE_L', channel: 'rx', scale: -1, maxDegrees: 32 },
    { node: 'EYE_R', channel: 'rx', scale: -1, maxDegrees: 32 },
  ],
  64: [
    { node: 'EYE_L', channel: 'rx', scale: 1, maxDegrees: 32 },
    { node: 'EYE_R', channel: 'rx', scale: 1, maxDegrees: 32 },
  ],
  65: [{ node: 'EYE_L', channel: 'rz', scale: -1, maxDegrees: 15 }],
  66: [{ node: 'EYE_L', channel: 'rz', scale: 1, maxDegrees: 15 }],
  67: [{ node: 'EYE_L', channel: 'rx', scale: -1, maxDegrees: 12 }],
  68: [{ node: 'EYE_L', channel: 'rx', scale: 1, maxDegrees: 12 }],
  69: [{ node: 'EYE_R', channel: 'rz', scale: -1, maxDegrees: 15 }],
  70: [{ node: 'EYE_R', channel: 'rz', scale: 1, maxDegrees: 15 }],
  71: [{ node: 'EYE_R', channel: 'rx', scale: -1, maxDegrees: 12 }],
  72: [{ node: 'EYE_R', channel: 'rx', scale: 1, maxDegrees: 12 }],

  // Jaw
  8: [{ node: 'JAW', channel: 'rz', scale: 1, maxDegrees: 8 }],
  25: [{ node: 'JAW', channel: 'rz', scale: 1, maxDegrees: 5.84 }],
  26: [{ node: 'JAW', channel: 'rz', scale: 1, maxDegrees: 28 }],
  27: [{ node: 'JAW', channel: 'rz', scale: 1, maxDegrees: 32 }],
  29: [{ node: 'JAW', channel: 'tz', scale: -1, maxUnits: 0.02 }],
  30: [{ node: 'JAW', channel: 'ry', scale: -1, maxDegrees: 5 }],
  35: [{ node: 'JAW', channel: 'ry', scale: 1, maxDegrees: 5 }],

  // Tongue
  19: [{ node: 'TONGUE', channel: 'tz', scale: -1, maxUnits: 0.008 }],
  37: [{ node: 'TONGUE', channel: 'rz', scale: -1, maxDegrees: 45 }],
  38: [{ node: 'TONGUE', channel: 'rz', scale: 1, maxDegrees: 45 }],
  39: [{ node: 'TONGUE', channel: 'ry', scale: -1, maxDegrees: 10 }],
  40: [{ node: 'TONGUE', channel: 'ry', scale: 1, maxDegrees: 10 }],
  41: [{ node: 'TONGUE', channel: 'rx', scale: -1, maxDegrees: 20 }],
  42: [{ node: 'TONGUE', channel: 'rx', scale: 1, maxDegrees: 20 }],
};

/** CC4 bone node names */
const CC4_BONE_NODES: Record<string, string> = {
  EYE_L: 'CC_Base_L_Eye',
  EYE_R: 'CC_Base_R_Eye',
  HEAD: 'CC_Base_Head',
  NECK: 'CC_Base_NeckTwist01',
  JAW: 'CC_Base_JawRoot',
  TONGUE: 'CC_Base_Tongue01',
};

/** CC4 eye mesh node fallbacks */
const CC4_EYE_MESH_NODES = {
  LEFT: 'CC_Base_Eye',
  RIGHT: 'CC_Base_Eye_1',
};

/** Morph category to mesh mapping */
const MORPH_TO_MESH: Record<string, string[]> = {
  face: ['CC_Base_Body_1', 'Male_Bushy_1', 'Male_Bushy_2'],
  viseme: ['CC_Base_Body_1'],
  eye: ['CC_Base_EyeOcclusion_1', 'CC_Base_EyeOcclusion_2'],
  tearLine: ['CC_Base_TearLine_1', 'CC_Base_TearLine_2'],
  tongue: ['CC_Base_Tongue'],
  hair: ['Side_part_wavy_1', 'Side_part_wavy_2'],
};

/** Default mix weights */
const AU_MIX_DEFAULTS: Record<number, number> = {
  31: 0.7, 32: 0.7, 33: 0.7, 54: 0.7, 55: 0.7, 56: 0.7,
  61: 0.5, 62: 0.5, 63: 0.5, 64: 0.5,
  25: 0.5, 26: 0.5, 27: 0.5,
  30: 0.5, 35: 0.5,
};

/** AU metadata */
const AU_INFO: Record<string, AUInfo> = {
  '1': { id: '1', name: 'Inner Brow Raiser', muscularBasis: 'frontalis (pars medialis)', faceArea: 'Upper', facePart: 'Forehead' },
  '2': { id: '2', name: 'Outer Brow Raiser', muscularBasis: 'frontalis (pars lateralis)', faceArea: 'Upper', facePart: 'Forehead' },
  '4': { id: '4', name: 'Brow Lowerer', muscularBasis: 'corrugator/depressor supercilii', faceArea: 'Upper', facePart: 'Forehead' },
  '5': { id: '5', name: 'Upper Lid Raiser', muscularBasis: 'levator palpebrae superioris', faceArea: 'Upper', facePart: 'Eyelids' },
  '6': { id: '6', name: 'Cheek Raiser', muscularBasis: 'orbicularis oculi (pars orbitalis)', faceArea: 'Upper', facePart: 'Cheeks' },
  '7': { id: '7', name: 'Lid Tightener', muscularBasis: 'orbicularis oculi (pars palpebralis)', faceArea: 'Upper', facePart: 'Eyelids' },
  '9': { id: '9', name: 'Nose Wrinkler', muscularBasis: 'levator labii superioris alaeque nasi', faceArea: 'Upper', facePart: 'Nose' },
  '10': { id: '10', name: 'Upper Lip Raiser', muscularBasis: 'levator labii superioris', faceArea: 'Lower', facePart: 'Mouth' },
  '12': { id: '12', name: 'Lip Corner Puller', muscularBasis: 'zygomaticus major', faceArea: 'Lower', facePart: 'Mouth' },
  '15': { id: '15', name: 'Lip Corner Depressor', muscularBasis: 'depressor anguli oris', faceArea: 'Lower', facePart: 'Mouth' },
  '17': { id: '17', name: 'Chin Raiser', muscularBasis: 'mentalis', faceArea: 'Lower', facePart: 'Chin' },
  '18': { id: '18', name: 'Lip Pucker', faceArea: 'Lower', facePart: 'Mouth' },
  '19': { id: '19', name: 'Tongue Show', faceArea: 'Lower', facePart: 'Tongue' },
  '26': { id: '26', name: 'Jaw Drop', muscularBasis: 'masseter (relax temporalis)', faceArea: 'Lower', facePart: 'Jaw' },
  '43': { id: '43', name: 'Eyes Closed', muscularBasis: 'orbicularis oculi', faceArea: 'Upper', facePart: 'Eyelids' },
  '51': { id: '51', name: 'Head Turn Left', faceArea: 'Upper', facePart: 'Head' },
  '52': { id: '52', name: 'Head Turn Right', faceArea: 'Upper', facePart: 'Head' },
  '53': { id: '53', name: 'Head Up', faceArea: 'Upper', facePart: 'Head' },
  '54': { id: '54', name: 'Head Down', faceArea: 'Upper', facePart: 'Head' },
  '55': { id: '55', name: 'Head Tilt Left', faceArea: 'Upper', facePart: 'Head' },
  '56': { id: '56', name: 'Head Tilt Right', faceArea: 'Upper', facePart: 'Head' },
  '61': { id: '61', name: 'Eyes Turn Left', faceArea: 'Upper', facePart: 'Eyes' },
  '62': { id: '62', name: 'Eyes Turn Right', faceArea: 'Upper', facePart: 'Eyes' },
  '63': { id: '63', name: 'Eyes Up', faceArea: 'Upper', facePart: 'Eyes' },
  '64': { id: '64', name: 'Eyes Down', faceArea: 'Upper', facePart: 'Eyes' },
};

/**
 * CC4_PRESET - Complete AU mapping configuration for Character Creator 4 models
 */
export const CC4_PRESET: AUMappingConfig = {
  auToMorphs: AU_TO_MORPHS,
  auToBones: BONE_AU_TO_BINDINGS,
  boneNodes: CC4_BONE_NODES,
  morphToMesh: MORPH_TO_MESH,
  visemeKeys: VISEME_KEYS,
  auMixDefaults: AU_MIX_DEFAULTS,
  auInfo: AU_INFO,
  eyeMeshNodes: CC4_EYE_MESH_NODES,
};

export default CC4_PRESET;

// Re-export individual components for advanced usage
export {
  AU_TO_MORPHS,
  BONE_AU_TO_BINDINGS,
  CC4_BONE_NODES,
  CC4_EYE_MESH_NODES,
  MORPH_TO_MESH,
  VISEME_KEYS,
  AU_MIX_DEFAULTS,
  AU_INFO,
};
