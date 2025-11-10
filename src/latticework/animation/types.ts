// Unified types for the Animation Agency (Machine + Service + Scheduler)

// ---------- Core curve types ----------
export type CurvePoint = { time: number; intensity: number };
export type CurvesMap = Record<string, CurvePoint[]>;

// ---------- Snippet (authoring form) ----------
export type AUKeyframe = { t: number; id: number; v: number };
export type VisemeKeyframe = { t: number; key: string; v: number };

/**
 * Authoring-time snippet: either AU or Viseme keyframes arrays.
 * Duration is calculated programmatically from the keyframes.
 * This is what editors/loaders typically produce/consume.
 */
export type Snippet = {
  name?: string;
  loop?: boolean;

  // Category & blending
  snippetCategory?: 'auSnippet' | 'visemeSnippet' | 'default';
  snippetPriority?: number;        // higher wins ties
  snippetPlaybackRate?: number;    // default 1
  snippetIntensityScale?: number;  // default 1

  // Keyframes (one or both may appear)
  au?: AUKeyframe[];
  viseme?: VisemeKeyframe[];

  // Optional normalized map (some sources already have it)
  curves?: CurvesMap;
};

// A normalized snippet that the machine/scheduler keep in context
export type NormalizedSnippet = {
  name: string;
  curves: CurvesMap;
  isPlaying: boolean;
  loop: boolean;

  snippetPlaybackRate: number;
  snippetIntensityScale: number;
  snippetCategory: 'auSnippet' | 'visemeSnippet' | 'default';
  snippetPriority: number;

  // Playback bookkeeping (UI/engine parity)
  currentTime: number;
  startWallTime: number;
  cursor: Record<string, number>;
};

// ---------- Animation machine context ----------
export interface AnimContext {
  animations: NormalizedSnippet[];

  // live blend-shape values for UI & inspection
  currentAUs: Record<string | number, number>;
  currentVisemes: Record<string, number>;

  // scheduler → UI easing markers
  scheduledTransitions?: string[];

  // manual slider overrides
  manualOverrides: Record<string | number, number>;
}

// ---------- Events (Bethos-style parity) ----------
export interface LoadAnimationEvent {
  type: 'LOAD_ANIMATION';
  data?: Partial<NormalizedSnippet> & Partial<Snippet> & {
    curves?: Record<string, Array<
      | { time: number; intensity: number }
      | { t?: number; v?: number; time?: number; intensity?: number }
    >>;
  };
}
export interface RemoveAnimationEvent { type: 'REMOVE_ANIMATION'; name: string; }
export interface PlayAllEvent    { type: 'PLAY_ALL' }
export interface PauseAllEvent   { type: 'PAUSE_ALL' }
export interface StopAllEvent    { type: 'STOP_ALL' }

export interface CurveChangedEvent {
  type: 'CURVE_CHANGED';
  nameOrId: string;              // snippet name or identifier
  auId: string | number;         // curve id
  curve: CurvePoint[];           // replacement curve
}

export interface KeyframeHitEvent {
  type: 'KEYFRAME_HIT';
  data: Array<{
    tAbs: number;
    snippet: NormalizedSnippet;
    curveId: string;
    kfIdx: number;
  }>;
}

export interface UIProgressEvent { type: 'UI_PROGRESS' }

export interface ManualSetEvent {
  type: 'MANUAL_SET';
  id: string | number;
  value: number;
  isViseme?: boolean;
}
export interface ManualClearEvent { type: 'MANUAL_CLEAR'; id: string | number; }

export type AnimEvent =
  | LoadAnimationEvent
  | RemoveAnimationEvent
  | PlayAllEvent
  | PauseAllEvent
  | StopAllEvent
  | CurveChangedEvent
  | KeyframeHitEvent
  | UIProgressEvent
  | ManualSetEvent
  | ManualClearEvent;

// ---------- Host capabilities passed into the Service/Scheduler ----------
export type HostCaps = {
  applyAU: (id: number | string, v: number) => void;
  setMorph: (key: string, v: number) => void;
  transitionAU?: (id: number | string, v: number, dur?: number) => void;
  transitionMorph?: (key: string, v: number, dur?: number) => void;
  /** Called when a non-looping snippet naturally finishes (not user-stopped). */
  onSnippetEnd?: (name: string) => void;
};

// ---------- Scheduler plumbing ----------
export type RuntimeSched = { name: string; startsAt: number; offset: number; enabled: boolean };
export type ScheduleOpts = { startInSec?: number; startAtSec?: number; offsetSec?: number; priority?: number };

// ---------- Narrow utilities ----------
export const isNumericId = (s: string) => /^\d+$/.test(s);
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));