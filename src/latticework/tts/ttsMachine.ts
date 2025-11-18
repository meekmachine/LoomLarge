/**
 * TTS State Machine (XState)
 * Manages Text-to-Speech state: idle → loading → speaking → idle
 */

import { setup, assign } from 'xstate';
import type { TimelineEvent } from './types';

export interface TTSContext {
  // Current speech state
  currentText: string | null;
  currentTimeline: TimelineEvent[];

  // Word tracking
  wordIndex: number;
  totalWords: number;

  // Timeline execution
  timelineStartTime: number;

  // Configuration
  config: {
    rate: number;
    pitch: number;
    volume: number;
    voiceName: string;
    engine: 'webSpeech' | 'sapi';
  };

  // Error tracking
  error: string | null;
}

export type TTSEvent =
  | { type: 'SPEAK'; text: string }
  | { type: 'SPEECH_LOADED'; timeline: TimelineEvent[] }
  | { type: 'SPEECH_STARTED' }
  | { type: 'WORD_BOUNDARY'; word: string; charIndex: number }
  | { type: 'SPEECH_ENDED' }
  | { type: 'ERROR'; error: string }
  | { type: 'STOP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'UPDATE_CONFIG'; config: Partial<TTSContext['config']> };

export const ttsMachine = setup({
  types: {} as {
    context: TTSContext;
    events: TTSEvent;
  },

  actions: {
    setText: assign({
      currentText: ({ event }) => {
        if (event.type === 'SPEAK') {
          return event.text;
        }
        return null;
      },
      error: null,
    }),

    setTimeline: assign({
      currentTimeline: ({ event }) => {
        if (event.type === 'SPEECH_LOADED') {
          return event.timeline;
        }
        return [];
      },
    }),

    startSpeech: assign({
      wordIndex: 0,
      timelineStartTime: Date.now(),
    }),

    processWord: assign({
      wordIndex: ({ context }) => context.wordIndex + 1,
    }),

    endSpeech: assign({
      currentText: null,
      currentTimeline: [],
      wordIndex: 0,
      timelineStartTime: 0,
    }),

    setError: assign({
      error: ({ event }) => {
        if (event.type === 'ERROR') {
          return event.error;
        }
        return null;
      },
    }),

    clearError: assign({
      error: null,
    }),

    updateConfig: assign({
      config: ({ context, event }) => {
        if (event.type === 'UPDATE_CONFIG') {
          return {
            ...context.config,
            ...event.config,
          };
        }
        return context.config;
      },
    }),
  },
}).createMachine({
  id: 'tts',

  initial: 'idle',

  context: {
    currentText: null,
    currentTimeline: [],
    wordIndex: 0,
    totalWords: 0,
    timelineStartTime: 0,
    config: {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceName: '',
      engine: 'webSpeech',
    },
    error: null,
  },

  states: {
    idle: {
      on: {
        SPEAK: {
          target: 'loading',
          actions: ['setText', 'clearError'],
        },
        UPDATE_CONFIG: {
          actions: ['updateConfig'],
        },
      },
    },

    loading: {
      on: {
        SPEECH_LOADED: {
          target: 'speaking',
          actions: ['setTimeline'],
        },
        ERROR: {
          target: 'error',
          actions: ['setError'],
        },
        STOP: {
          target: 'idle',
          actions: ['endSpeech'],
        },
      },
    },

    speaking: {
      entry: ['startSpeech'],

      on: {
        WORD_BOUNDARY: {
          actions: ['processWord'],
        },
        SPEECH_ENDED: {
          target: 'idle',
          actions: ['endSpeech'],
        },
        ERROR: {
          target: 'error',
          actions: ['setError'],
        },
        STOP: {
          target: 'idle',
          actions: ['endSpeech'],
        },
        PAUSE: {
          target: 'paused',
        },
      },
    },

    paused: {
      on: {
        RESUME: {
          target: 'speaking',
        },
        STOP: {
          target: 'idle',
          actions: ['endSpeech'],
        },
      },
    },

    error: {
      on: {
        SPEAK: {
          target: 'loading',
          actions: ['setText', 'clearError'],
        },
        STOP: {
          target: 'idle',
          actions: ['endSpeech', 'clearError'],
        },
      },
    },
  },
});
