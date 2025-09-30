// Engine-level ARKit/CC-style mapping & metadata (mapping only)
// - AU_TO_MORPHS: FACS AU (number) -> GLB/Three morph target keys (strings)
// - MORPH_VARIANTS: fallback morph keys if the primary key is absent on a mesh (vendor/name drift)
// - ALIASES: backward-compatible alias to MORPH_VARIANTS for existing code
// - VISEME_KEYS: viseme morphs found in your GLB
// - AU_INFO: metadata for UI/Docs (names, muscles, wikipedia links)

// =====================
// FACS -> Morph mapping
// =====================
export const AU_TO_MORPHS: Record<number, string[]> = {
  // ----- Brows / Forehead -----
  1: ['Brow_Raise_Inner_L','Brow_Raise_Inner_R'],
  2: ['Brow_Raise_Outer_L','Brow_Raise_Outer_R'],
  4: ['Brow_Drop_L','Brow_Drop_R'],

  // ----- Eyes / Lids -----
  5: ['Eye_Wide_L','Eye_Wide_R'],
  6: ['Cheek_Raise_L','Cheek_Raise_R'],
  7: ['Eye_Squint_L','Eye_Squint_R'],
  43: ['Eye_Blink_L','Eye_Blink_R'],

  // ----- Nose / Midface -----
  9: ['Nose_Sneer_L','Nose_Sneer_R'],
  34: ['Cheek_Puff_L','Cheek_Puff_R'], // convenience

  // ----- Mouth / Lips -----
  8:  ['Mouth_Press_L','Mouth_Press_R','Mouth_Close'],
  10: ['Mouth_Up_Upper_L','Mouth_Up_Upper_R'],
  11: ['Mouth_Dimple_L','Mouth_Dimple_R'],
  12: ['Mouth_Smile_L','Mouth_Smile_R'],
  13: ['Mouth_Stretch_L','Mouth_Stretch_R'],
  14: ['Mouth_Dimple_L','Mouth_Dimple_R'],
  15: ['Mouth_Frown_L','Mouth_Frown_R'],
  16: ['Mouth_Down_Lower_L','Mouth_Down_Lower_R'],
  17: ['Mouth_Shrug_Lower'],
  18: ['Mouth_Pucker'],
  20: ['Mouth_Stretch_L','Mouth_Stretch_R'],
  22: ['Mouth_Funnel'],
  23: ['Mouth_Press_L','Mouth_Press_R'],
  24: ['Mouth_Press_L','Mouth_Press_R'],
  25: ['Jaw_Open','Mouth_Close'],
  26: ['Jaw_Open'],
  27: ['Jaw_Open'],
  28: ['Mouth_Roll_In_Upper','Mouth_Roll_In_Lower'],

  // ----- Tongue -----
  19: ['Tongue_Out'],
  36: ['Tongue_Bulge_L','Tongue_Bulge_R'],

  // ----- Jaw / Head (convenience) -----
  29: ['Jaw_Forward'],
  30: ['Jaw_L','Jaw_R'],
  31: ['Head_Turn_L'],
  32: ['Head_Turn_R'],
  33: ['Head_Turn_Up'],
  54: ['Head_Turn_Down'],
  55: ['Head_Tilt_L'],
  56: ['Head_Tilt_R'],

  // ----- Eye Direction (convenience) -----
  61: ['Eye_L_Look_L','Eye_R_Look_L'],
  62: ['Eye_L_Look_R','Eye_R_Look_R'],
  63: ['Eye_L_Look_Up','Eye_R_Look_Up'],
  64: ['Eye_L_Look_Down','Eye_R_Look_Down'],
};

// -----------------------
// Morph name variants (fallbacks per vendor/export)
// -----------------------
export const MORPH_VARIANTS: Record<string, string[]> = {
  // Smiles
  'Mouth_Smile_L': ['mouthSmileLeft','MouthSmileLeft','smileLeft','Smile_L'],
  'Mouth_Smile_R': ['mouthSmileRight','MouthSmileRight','smileRight','Smile_R'],
  // Frown / depressor
  'Mouth_Frown_L': ['mouthFrownLeft','MouthFrownLeft','frownLeft'],
  'Mouth_Frown_R': ['mouthFrownRight','MouthFrownRight','frownRight'],
  // Press / tightener
  'Mouth_Press_L': ['mouthPressLeft','MouthPressLeft','Mouth_Tightener_L','lipTightenerLeft'],
  'Mouth_Press_R': ['mouthPressRight','MouthPressRight','Mouth_Tightener_R','lipTightenerRight'],
  // Funnel / pucker
  'Mouth_Funnel':  ['mouthFunnel','MouthFunneler','LipFunnel','funnel'],
  'Mouth_Pucker':  ['mouthPucker','LipPucker','pucker'],
  // Roll in / lip suck
  'Mouth_Roll_In_Upper': ['mouthRollInUpper','LipRollInUpper'],
  'Mouth_Roll_In_Lower': ['mouthRollInLower','LipRollInLower'],
  // Upper/lower lip raise/depress
  'Mouth_Up_Upper_L': ['upperLipUpLeft','UpperLipRaiseLeft'],
  'Mouth_Up_Upper_R': ['upperLipUpRight','UpperLipRaiseRight'],
  'Mouth_Down_Lower_L': ['lowerLipDownLeft','LowerLipDepressLeft'],
  'Mouth_Down_Lower_R': ['lowerLipDownRight','LowerLipDepressRight'],
  // Stretcher / risorius
  'Mouth_Stretch_L': ['mouthStretchLeft','LipStretcherLeft'],
  'Mouth_Stretch_R': ['mouthStretchRight','LipStretcherRight'],
  // Dimple
  'Mouth_Dimple_L': ['mouthDimpleLeft','DimplerLeft'],
  'Mouth_Dimple_R': ['mouthDimpleRight','DimplerRight'],
  // Eye blink/squint
  'Eye_Blink_L': ['eyeBlinkLeft','blinkLeft'],
  'Eye_Blink_R': ['eyeBlinkRight','blinkRight'],
  'Eye_Squint_L': ['eyeSquintLeft','squintLeft'],
  'Eye_Squint_R': ['eyeSquintRight','squintRight'],
  'Eye_Wide_L':   ['eyeWideLeft','eyesWideLeft'],
  'Eye_Wide_R':   ['eyeWideRight','eyesWideRight'],
  // Look directions
  'Eye_L_Look_L':   ['eyeLeftLookLeft','eyesLeftLookLeft'],
  'Eye_R_Look_L':   ['eyeRightLookLeft','eyesRightLookLeft'],
  'Eye_L_Look_R':   ['eyeLeftLookRight','eyesLeftLookRight'],
  'Eye_R_Look_R':   ['eyeRightLookRight','eyesRightLookRight'],
  'Eye_L_Look_Up':  ['eyeLeftLookUp','eyesLeftLookUp'],
  'Eye_R_Look_Up':  ['eyeRightLookUp','eyesRightLookUp'],
  'Eye_L_Look_Down':['eyeLeftLookDown','eyesLeftLookDown'],
  'Eye_R_Look_Down':['eyeRightLookDown','eyesRightLookDown'],
  // Brows
  'Brow_Raise_Inner_L': ['innerBrowRaiseLeft','browRaiseInnerLeft'],
  'Brow_Raise_Inner_R': ['innerBrowRaiseRight','browRaiseInnerRight'],
  'Brow_Raise_Outer_L': ['outerBrowRaiseLeft','browRaiseOuterLeft'],
  'Brow_Raise_Outer_R': ['outerBrowRaiseRight','browRaiseOuterRight'],
  'Brow_Drop_L':        ['browLowerLeft','corrugatorLeft'],
  'Brow_Drop_R':        ['browLowerRight','corrugatorRight'],
  // Nose / cheeks
  'Nose_Sneer_L': ['noseSneerLeft','sneerLeft'],
  'Nose_Sneer_R': ['noseSneerRight','sneerRight'],
  'Cheek_Puff_L': ['cheekPuffLeft','puffLeft'],
  'Cheek_Puff_R': ['cheekPuffRight','puffRight'],
  // Jaw/tongue
  'Jaw_Open':    ['jawOpen','Mouth_Open'],
  'Jaw_Forward': ['jawForward','jawThrust'],
  'Jaw_L':       ['jawLeft','jawSideLeft'],
  'Jaw_R':       ['jawRight','jawSideRight'],
  'Tongue_Out':  ['tongueOut','tongueShow'],
  'Tongue_Bulge_L': ['tongueBulgeLeft'],
  'Tongue_Bulge_R': ['tongueBulgeRight'],
  // Head (if morph-based on a rig)
  'Head_Turn_L':   ['headTurnLeft'],
  'Head_Turn_R':   ['headTurnRight'],
  'Head_Turn_Up':  ['headUp'],
  'Head_Turn_Down':['headDown'],
};

// Back-compat: some code still imports ALIASES; point it to MORPH_VARIANTS.
export const ALIASES: Record<string, string[]> = MORPH_VARIANTS;

// ----------------
// Viseme key list
// ----------------
export const VISEME_KEYS: string[] = [
  'EE','Er','IH','Ah','Oh','W_OO','S_Z','Ch_J','F_V','TH','T_L_D_N','B_M_P','K_G_H_NG','AE','R'
];

// ======================
// AU metadata (subset)
// ======================
export interface AUInfo {
  id: string;
  name: string;
  muscularBasis?: string;
  links?: string[];
  faceSection?: string;
  faceArea?: string;
}

export const AU_INFO: Record<string, AUInfo> = {
  '1':  { id:'1',  name:'Inner Brow Raiser', muscularBasis:'frontalis (pars medialis)', links:['https://en.wikipedia.org/wiki/Frontalis_muscle'], faceSection:'Forehead', faceArea:'Upper' },
  '1L': { id:'1L', name:'Inner Brow Raiser L', faceSection:'Forehead', faceArea:'Upper' },
  '1R': { id:'1R', name:'Inner Brow Raiser R', faceSection:'Forehead', faceArea:'Upper' },
  '2':  { id:'2',  name:'Outer Brow Raiser', muscularBasis:'frontalis (pars lateralis)', links:['https://en.wikipedia.org/wiki/Frontalis_muscle'], faceSection:'Forehead', faceArea:'Upper' },
  '2L': { id:'2L', name:'Outer Brow Raiser L', faceSection:'Forehead', faceArea:'Upper' },
  '2R': { id:'2R', name:'Outer Brow Raiser R', faceSection:'Forehead', faceArea:'Upper' },
  '4':  { id:'4',  name:'Brow Lowerer', muscularBasis:'corrugator/depressor supercilii', links:['https://en.wikipedia.org/wiki/Corrugator_supercilii'], faceSection:'Brow area', faceArea:'Upper' },
  '5':  { id:'5',  name:'Upper Lid Raiser', muscularBasis:'levator palpebrae superioris', links:['https://en.wikipedia.org/wiki/Levator_palpebrae_superioris'], faceSection:'Eyelids', faceArea:'Upper' },
  '6':  { id:'6',  name:'Cheek Raiser', muscularBasis:'orbicularis oculi (pars orbitalis)', links:['https://en.wikipedia.org/wiki/Orbicularis_oculi'], faceSection:'Cheeks', faceArea:'Upper' },
  '7':  { id:'7',  name:'Lid Tightener', muscularBasis:'orbicularis oculi (pars palpebralis)', links:['https://en.wikipedia.org/wiki/Orbicularis_oculi'], faceSection:'Eyelids', faceArea:'Upper' },
  '43': { id:'43', name:'Eyes Closed', muscularBasis:'orbicularis oculi', links:['https://en.wikipedia.org/wiki/Orbicularis_oculi_muscle'], faceSection:'Eyelids', faceArea:'Upper' },
  '9':  { id:'9', name:'Nose Wrinkler', muscularBasis:'levator labii superioris alaeque nasi', links:['https://en.wikipedia.org/wiki/Levator_labii_superioris_alaeque_nasi'], faceSection:'Nose', faceArea:'Upper' },
  '34': { id:'34', name:'Cheek Puff', faceSection:'Cheeks', faceArea:'Lower' },
  '8':  { id:'8',  name:'Lips Toward Each Other', muscularBasis:'orbicularis oris', links:['https://en.wikipedia.org/wiki/Orbicularis_oris'], faceSection:'Mouth', faceArea:'Lower' },
  '10': { id:'10', name:'Upper Lip Raiser', muscularBasis:'levator labii superioris', links:['https://en.wikipedia.org/wiki/Levator_labii_superioris'], faceSection:'Mouth', faceArea:'Lower' },
  '11': { id:'11', name:'Nasolabial Deepener', muscularBasis:'zygomaticus minor', links:['https://en.wikipedia.org/wiki/Zygomaticus_minor'], faceSection:'Cheeks', faceArea:'Lower' },
  '12': { id:'12', name:'Lip Corner Puller', muscularBasis:'zygomaticus major', links:['https://en.wikipedia.org/wiki/Zygomaticus_major'], faceSection:'Mouth', faceArea:'Lower' },
  '12L':{ id:'12L',name:'Lip Corner Puller L', faceSection:'Mouth', faceArea:'Lower' },
  '12R':{ id:'12R',name:'Lip Corner Puller R', faceSection:'Mouth', faceArea:'Lower' },
  '13': { id:'13', name:'Sharp Lip Puller', muscularBasis:'levator anguli oris', links:['https://en.wikipedia.org/wiki/Levator_anguli_oris'], faceSection:'Mouth', faceArea:'Lower' },
  '14': { id:'14', name:'Dimpler', muscularBasis:'buccinator', links:['https://en.wikipedia.org/wiki/Buccinator'], faceSection:'Cheeks', faceArea:'Lower' },
  '15': { id:'15', name:'Lip Corner Depressor', muscularBasis:'depressor anguli oris', links:['https://en.wikipedia.org/wiki/Depressor_anguli_oris'], faceSection:'Mouth', faceArea:'Lower' },
  '16': { id:'16', name:'Lower Lip Depressor', muscularBasis:'depressor labii inferioris', links:['https://en.wikipedia.org/wiki/Depressor_labii_inferioris'], faceSection:'Mouth', faceArea:'Lower' },
  '17': { id:'17', name:'Chin Raiser', muscularBasis:'mentalis', links:['https://en.wikipedia.org/wiki/Mentalis'], faceSection:'Chin', faceArea:'Lower' },
  '18': { id:'18', name:'Lip Pucker', faceSection:'Mouth', faceArea:'Lower' },
  '19': { id:'19', name:'Tongue Show', faceSection:'Mouth', faceArea:'Lower' },
  '20': { id:'20', name:'Lip Stretcher', muscularBasis:'risorius + platysma', links:['https://en.wikipedia.org/wiki/Risorius','https://en.wikipedia.org/wiki/Platysma'], faceSection:'Mouth', faceArea:'Lower' },
  '22': { id:'22', name:'Lip Funneler', muscularBasis:'orbicularis oris', links:['https://en.wikipedia.org/wiki/Orbicularis_oris'], faceSection:'Mouth', faceArea:'Lower' },
  '23': { id:'23', name:'Lip Tightener', muscularBasis:'orbicularis oris', faceSection:'Mouth', faceArea:'Lower' },
  '24': { id:'24', name:'Lip Presser', muscularBasis:'orbicularis oris', faceSection:'Mouth', faceArea:'Lower' },
  '25': { id:'25', name:'Lips Part', faceSection:'Mouth', faceArea:'Lower' },
  '26': { id:'26', name:'Jaw Drop', muscularBasis:'masseter (relax temporalis)', links:['https://en.wikipedia.org/wiki/Masseter_muscle'], faceSection:'Jaw', faceArea:'Lower' },
  '27': { id:'27', name:'Mouth Stretch', muscularBasis:'pterygoids + digastric', links:['https://en.wikipedia.org/wiki/Pterygoid_bone','https://en.wikipedia.org/wiki/Digastric_muscle'], faceSection:'Mouth', faceArea:'Lower' },
  '28': { id:'28', name:'Lip Suck', muscularBasis:'orbicularis oris', faceSection:'Mouth', faceArea:'Lower' },
  '29': { id:'29', name:'Jaw Thrust', faceSection:'Jaw', faceArea:'Lower' },
  '30L':{ id:'30L', name:'Jaw Sideways Left', faceSection:'Jaw', faceArea:'Lower' },
  '30R':{ id:'30R', name:'Jaw Sideways Right', faceSection:'Jaw', faceArea:'Lower' },
  '51': { id:'51', name:'Head Turn Left', faceSection:'Head', faceArea:'Upper' },
  '52': { id:'52', name:'Head Turn Right', faceSection:'Head', faceArea:'Upper' },
  '53': { id:'53', name:'Head Up', faceSection:'Head', faceArea:'Upper' },
  '54': { id:'54', name:'Head Down', faceSection:'Head', faceArea:'Upper' },
  '55': { id:'55', name:'Head Tilt Left', faceSection:'Head', faceArea:'Upper' },
  '56': { id:'56', name:'Head Tilt Right', faceSection:'Head', faceArea:'Upper' },
  '57': { id:'57', name:'Head Forward', faceSection:'Head', faceArea:'Upper' },
  '58': { id:'58', name:'Head Backward', faceSection:'Head', faceArea:'Upper' },
  '61': { id:'61', name:'Eyes Turn Left', faceSection:'Eyes', faceArea:'Upper' },
  '62': { id:'62', name:'Eyes Turn Right', faceSection:'Eyes', faceArea:'Upper' },
  '63': { id:'63', name:'Eyes Up', faceSection:'Eyes', faceArea:'Upper' },
  '64': { id:'64', name:'Eyes Down', faceSection:'Eyes', faceArea:'Upper' },
};
