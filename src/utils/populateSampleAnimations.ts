/**
 * Sample animations for emotion, speaking, and viseme categories
 * Format matches the latticework animation agency snippet JSONs
 * Uses "au" array with { id, t, v } format that normalize() converts to curves
 */

// Emotion animations - expressive facial movements
const emotionAnimations = {
  happy_smile: {
    name: 'happy_smile',
    duration: 2.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: 10,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU12 - Lip Corner Puller (smile)
      { id: 12, t: 0.0, v: 0.0 },
      { id: 12, t: 0.3, v: 0.85 },
      { id: 12, t: 1.5, v: 0.85 },
      { id: 12, t: 2.0, v: 0.0 },
      // AU6 - Cheek Raiser
      { id: 6, t: 0.0, v: 0.0 },
      { id: 6, t: 0.4, v: 0.6 },
      { id: 6, t: 1.5, v: 0.6 },
      { id: 6, t: 2.0, v: 0.0 }
    ]
  },

  sad_frown: {
    name: 'sad_frown',
    duration: 2.5,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: 10,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU1 - Inner Brow Raiser
      { id: 1, t: 0.0, v: 0.0 },
      { id: 1, t: 0.5, v: 0.7 },
      { id: 1, t: 2.0, v: 0.7 },
      { id: 1, t: 2.5, v: 0.0 },
      // AU15 - Lip Corner Depressor
      { id: 15, t: 0.0, v: 0.0 },
      { id: 15, t: 0.6, v: 0.5 },
      { id: 15, t: 2.0, v: 0.5 },
      { id: 15, t: 2.5, v: 0.0 },
      // AU17 - Chin Raiser
      { id: 17, t: 0.0, v: 0.0 },
      { id: 17, t: 0.7, v: 0.3 },
      { id: 17, t: 2.0, v: 0.3 },
      { id: 17, t: 2.5, v: 0.0 }
    ]
  },

  angry_scowl: {
    name: 'angry_scowl',
    duration: 2.2,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: 10,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU4 - Brow Lowerer
      { id: 4, t: 0.0, v: 0.0 },
      { id: 4, t: 0.3, v: 0.9 },
      { id: 4, t: 1.8, v: 0.9 },
      { id: 4, t: 2.2, v: 0.0 },
      // AU7 - Lid Tightener
      { id: 7, t: 0.0, v: 0.0 },
      { id: 7, t: 0.4, v: 0.5 },
      { id: 7, t: 1.8, v: 0.5 },
      { id: 7, t: 2.2, v: 0.0 },
      // AU23 - Lip Tightener
      { id: 23, t: 0.0, v: 0.0 },
      { id: 23, t: 0.5, v: 0.6 },
      { id: 23, t: 1.8, v: 0.6 },
      { id: 23, t: 2.2, v: 0.0 }
    ]
  },

  surprised_shock: {
    name: 'surprised_shock',
    duration: 2.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: 10,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU1 - Inner Brow Raiser
      { id: 1, t: 0.0, v: 0.0 },
      { id: 1, t: 0.15, v: 0.9 },
      { id: 1, t: 1.5, v: 0.9 },
      { id: 1, t: 2.0, v: 0.0 },
      // AU2 - Outer Brow Raiser
      { id: 2, t: 0.0, v: 0.0 },
      { id: 2, t: 0.15, v: 0.8 },
      { id: 2, t: 1.5, v: 0.8 },
      { id: 2, t: 2.0, v: 0.0 },
      // AU5 - Upper Lid Raiser
      { id: 5, t: 0.0, v: 0.0 },
      { id: 5, t: 0.12, v: 0.7 },
      { id: 5, t: 1.5, v: 0.7 },
      { id: 5, t: 2.0, v: 0.0 },
      // AU26 - Jaw Drop
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.18, v: 0.4 },
      { id: 26, t: 1.5, v: 0.4 },
      { id: 26, t: 2.0, v: 0.0 }
    ]
  },

  disgust_wrinkle: {
    name: 'disgust_wrinkle',
    duration: 1.8,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: 10,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU9 - Nose Wrinkler
      { id: 9, t: 0.0, v: 0.0 },
      { id: 9, t: 0.3, v: 0.8 },
      { id: 9, t: 1.3, v: 0.8 },
      { id: 9, t: 1.8, v: 0.0 },
      // AU10 - Upper Lip Raiser
      { id: 10, t: 0.0, v: 0.0 },
      { id: 10, t: 0.35, v: 0.6 },
      { id: 10, t: 1.3, v: 0.6 },
      { id: 10, t: 1.8, v: 0.0 }
    ]
  }
};

// Speaking animations - mouth movements for speech
const speakingAnimations = {
  talk_gentle: {
    name: 'talk_gentle',
    duration: 1.0,
    loop: true,
    snippetCategory: 'auSnippet',
    snippetPriority: 5,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU26 - Jaw Drop (gentle talking rhythm)
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.15, v: 0.2 },
      { id: 26, t: 0.3, v: 0.1 },
      { id: 26, t: 0.45, v: 0.25 },
      { id: 26, t: 0.6, v: 0.1 },
      { id: 26, t: 0.75, v: 0.2 },
      { id: 26, t: 1.0, v: 0.0 },
      // AU12 - Subtle smile while talking
      { id: 12, t: 0.0, v: 0.2 },
      { id: 12, t: 1.0, v: 0.2 }
    ]
  },

  talk_excited: {
    name: 'talk_excited',
    duration: 0.8,
    loop: true,
    snippetCategory: 'auSnippet',
    snippetPriority: 5,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU26 - Jaw Drop (faster, wider movement)
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.1, v: 0.4 },
      { id: 26, t: 0.2, v: 0.2 },
      { id: 26, t: 0.35, v: 0.5 },
      { id: 26, t: 0.5, v: 0.1 },
      { id: 26, t: 0.65, v: 0.4 },
      { id: 26, t: 0.8, v: 0.0 },
      // AU12 - Smile
      { id: 12, t: 0.0, v: 0.35 },
      { id: 12, t: 0.8, v: 0.35 },
      // AU2 - Brow raise for emphasis
      { id: 2, t: 0.0, v: 0.0 },
      { id: 2, t: 0.2, v: 0.4 },
      { id: 2, t: 0.6, v: 0.4 },
      { id: 2, t: 0.8, v: 0.0 }
    ]
  },

  talk_whisper: {
    name: 'talk_whisper',
    duration: 1.2,
    loop: true,
    snippetCategory: 'auSnippet',
    snippetPriority: 5,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU26 - Very minimal jaw movement
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.25, v: 0.08 },
      { id: 26, t: 0.5, v: 0.05 },
      { id: 26, t: 0.75, v: 0.1 },
      { id: 26, t: 1.2, v: 0.0 },
      // AU18 - Subtle lip pucker
      { id: 18, t: 0.0, v: 0.15 },
      { id: 18, t: 1.2, v: 0.15 }
    ]
  },

  talk_shout: {
    name: 'talk_shout',
    duration: 0.6,
    loop: true,
    snippetCategory: 'auSnippet',
    snippetPriority: 5,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU26 - Wide jaw opening
      { id: 26, t: 0.0, v: 0.2 },
      { id: 26, t: 0.15, v: 0.7 },
      { id: 26, t: 0.35, v: 0.3 },
      { id: 26, t: 0.6, v: 0.2 },
      // AU20 - Lip Stretcher
      { id: 20, t: 0.0, v: 0.3 },
      { id: 20, t: 0.15, v: 0.5 },
      { id: 20, t: 0.6, v: 0.3 }
    ]
  }
};

// Viseme animations - phoneme mouth shapes
const visemeAnimations = {
  ah_open: {
    name: 'ah_open',
    duration: 1.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU26 - Jaw Drop for "ah" sound
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.2, v: 0.6 },
      { id: 26, t: 0.8, v: 0.6 },
      { id: 26, t: 1.0, v: 0.0 }
    ]
  },

  ee_smile: {
    name: 'ee_smile',
    duration: 1.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU12 - Smile for "ee" sound
      { id: 12, t: 0.0, v: 0.0 },
      { id: 12, t: 0.2, v: 0.7 },
      { id: 12, t: 0.8, v: 0.7 },
      { id: 12, t: 1.0, v: 0.0 },
      // AU20 - Lip Stretcher
      { id: 20, t: 0.0, v: 0.0 },
      { id: 20, t: 0.2, v: 0.5 },
      { id: 20, t: 0.8, v: 0.5 },
      { id: 20, t: 1.0, v: 0.0 }
    ]
  },

  oh_round: {
    name: 'oh_round',
    duration: 1.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU18 - Lip Pucker for "oh" sound
      { id: 18, t: 0.0, v: 0.0 },
      { id: 18, t: 0.2, v: 0.75 },
      { id: 18, t: 0.8, v: 0.75 },
      { id: 18, t: 1.0, v: 0.0 },
      // AU26 - Small jaw drop
      { id: 26, t: 0.0, v: 0.0 },
      { id: 26, t: 0.2, v: 0.3 },
      { id: 26, t: 0.8, v: 0.3 },
      { id: 26, t: 1.0, v: 0.0 }
    ]
  },

  oo_pucker: {
    name: 'oo_pucker',
    duration: 1.0,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU18 - Strong lip pucker for "oo" sound
      { id: 18, t: 0.0, v: 0.0 },
      { id: 18, t: 0.15, v: 0.9 },
      { id: 18, t: 0.85, v: 0.9 },
      { id: 18, t: 1.0, v: 0.0 }
    ]
  },

  f_bite: {
    name: 'f_bite',
    duration: 0.8,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU16 - Lower Lip Depressor for "f" sound
      { id: 16, t: 0.0, v: 0.0 },
      { id: 16, t: 0.15, v: 0.6 },
      { id: 16, t: 0.6, v: 0.6 },
      { id: 16, t: 0.8, v: 0.0 }
    ]
  },

  m_close: {
    name: 'm_close',
    duration: 0.6,
    loop: false,
    snippetCategory: 'auSnippet',
    snippetPriority: -100,
    snippetPlaybackRate: 1,
    snippetIntensityScale: 1,
    au: [
      // AU24 - Lip Presser for "m" sound
      { id: 24, t: 0.0, v: 0.0 },
      { id: 24, t: 0.1, v: 0.7 },
      { id: 24, t: 0.5, v: 0.7 },
      { id: 24, t: 0.6, v: 0.0 }
    ]
  }
};

/**
 * Populate localStorage with sample animations
 * Call this function once to set up the sample data
 */
export function populateSampleAnimations() {
  // Save emotion animations
  const emotionKeys = Object.keys(emotionAnimations);
  localStorage.setItem('emotionAnimationsList', JSON.stringify(emotionKeys));
  emotionKeys.forEach(key => {
    localStorage.setItem(
      `emotionAnimationsList/${key}`,
      JSON.stringify(emotionAnimations[key as keyof typeof emotionAnimations])
    );
  });

  // Save speaking animations
  const speakingKeys = Object.keys(speakingAnimations);
  localStorage.setItem('speakingAnimationsList', JSON.stringify(speakingKeys));
  speakingKeys.forEach(key => {
    localStorage.setItem(
      `speakingAnimationsList/${key}`,
      JSON.stringify(speakingAnimations[key as keyof typeof speakingAnimations])
    );
  });

  // Save viseme animations
  const visemeKeys = Object.keys(visemeAnimations);
  localStorage.setItem('visemeAnimationsList', JSON.stringify(visemeKeys));
  visemeKeys.forEach(key => {
    localStorage.setItem(
      `visemeAnimationsList/${key}`,
      JSON.stringify(visemeAnimations[key as keyof typeof visemeAnimations])
    );
  });

  console.log('✅ Sample animations populated in localStorage');
  console.log(`  Emotion (${emotionKeys.length}): ${emotionKeys.join(', ')}`);
  console.log(`  Speaking (${speakingKeys.length}): ${speakingKeys.join(', ')}`);
  console.log(`  Viseme (${visemeKeys.length}): ${visemeKeys.join(', ')}`);
}

/**
 * Clear all sample animations from localStorage
 */
export function clearSampleAnimations() {
  const categories = ['emotionAnimationsList', 'speakingAnimationsList', 'visemeAnimationsList'];

  categories.forEach(category => {
    const keys = localStorage.getItem(category);
    if (keys) {
      const keyArray = JSON.parse(keys);
      keyArray.forEach((key: string) => {
        localStorage.removeItem(`${category}/${key}`);
      });
      localStorage.removeItem(category);
    }
  });

  console.log('🗑️ Sample animations cleared from localStorage');
}
