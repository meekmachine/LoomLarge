# TTS Agency Architecture

## Problem Statement

The current TTS service is monolithic and directly manages:
- Text-to-speech execution (Web Speech API or SAPI)
- Timeline management
- Word boundary detection
- Lip-sync coordination (inline viseme curve generation)
- Prosodic gesture coordination (inline brow/head animations)

This creates several issues:
1. **No state machine**: State management is ad-hoc with status strings
2. **No scheduler separation**: Timeline execution mixed with service logic
3. **Direct agency coupling**: TTS directly schedules lip-sync and prosodic snippets instead of delegating
4. **Incorrect terminology**: Uses `animationManager` instead of `animationAgency`
5. **Poor coordination**: Agencies don't properly manage their own state

## Target Architecture

Following the **Society of Mind** pattern used by Lip-Sync and Prosodic agencies:

```
┌──────────────────────────────────────────────────────────────┐
│                       TTS Agency                             │
│                                                              │
│  ┌────────────────┐                                         │
│  │  TTSService    │  ← Public API (Factory)                 │
│  │  (Factory)     │                                         │
│  └────────┬───────┘                                         │
│           │                                                 │
│   ┌───────▼──────┐          ┌──────────────────────┐       │
│   │  TTSMachine  │          │   TTSScheduler       │       │
│   │   (XState)   │◄─────────┤  (Timeline Exec +    │       │
│   │              │          │   Speech Control)    │       │
│   └──────┬───────┘          └──────────┬───────────┘       │
│          │                             │                   │
│          │                             │                   │
│          ▼                             ▼                   │
│   State Management           Coordinate Agencies:          │
│   (idle/loading/             - LipSyncService.processWord()│
│    speaking/paused)          - ProsodicService.pulse()     │
└──────────────────────────────────────────────────────────────┘
```

### Comparison with Current vs Target

| Aspect | Current (Monolithic) | Target (Agency Pattern) |
|--------|---------------------|------------------------|
| **State Management** | Manual status strings | XState machine (idle/loading/speaking/paused) |
| **Scheduler** | Inline timeline execution | Separate `TTSScheduler` class |
| **Lip-Sync** | Directly schedules viseme snippets | Delegates to `LipSyncService.processWord()` |
| **Prosodic** | Directly schedules gesture snippets | Delegates to `ProsodicService.pulse()` |
| **Terminology** | `animationManager` | `animationAgency` |
| **Separation of Concerns** | ❌ Everything in one class | ✅ Machine + Scheduler + Service |
| **Agency Coordination** | ❌ Direct coupling | ✅ Proper delegation |

## Architecture Components

### 1. TTSMachine (XState)

**File:** [`ttsMachine.ts`](ttsMachine.ts)

**Responsibilities:**
- Manage TTS state: `idle` → `loading` → `speaking` → `idle`
- Track speech progress (word index, timeline start time)
- Handle pause/resume state transitions
- Store configuration (rate, pitch, volume, voice, engine)
- Track errors

**States:**
- `idle`: No speech active, ready to speak
- `loading`: Preparing speech (parsing text, building timeline, loading SAPI audio)
- `speaking`: Speech in progress, processing word boundaries
- `paused`: Speech paused, can resume
- `error`: Speech failed, can retry

**Events:**
- `SPEAK`: Start new speech
- `SPEECH_LOADED`: Timeline ready, transition to speaking
- `WORD_BOUNDARY`: Process word during speech
- `SPEECH_ENDED`: Speech completed, return to idle
- `ERROR`: Speech failed
- `STOP`: Force stop
- `PAUSE`: Pause current speech
- `RESUME`: Resume paused speech
- `UPDATE_CONFIG`: Update TTS configuration

**Context:**
```typescript
{
  currentText: string | null;
  currentTimeline: TimelineEvent[];
  wordIndex: number;
  timelineStartTime: number;
  config: {
    rate: number;
    pitch: number;
    volume: number;
    voiceName: string;
    engine: 'webSpeech' | 'sapi';
  };
  error: string | null;
}
```

### 2. TTSScheduler

**File:** [`ttsScheduler.ts`](ttsScheduler.ts)

**Responsibilities:**
- Execute speech using Web Speech API or SAPI
- Manage voice selection and loading
- Execute timeline events (words, visemes, emojis, phonemes)
- Coordinate with agencies via callbacks
- Handle playback control (pause/resume/stop)

**Key Methods:**
- `scheduleWebSpeech(text, timeline)`: Use Web Speech API
- `scheduleSAPI(audioData, timeline)`: Use SAPI with pre-recorded audio
- `getVoices()`: Get available voices
- `setVoice(name)`: Set voice by name
- `stop()`: Stop current speech
- `pause()`: Pause speech
- `resume()`: Resume speech
- `dispose()`: Cleanup

**Host Callbacks:**
```typescript
{
  onWordBoundary: (word, wordIndex) => void;
  onViseme: (visemeId, duration) => void;
  onEmoji: (emoji) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onError: (error) => void;
}
```

### 3. TTSService (Refactored)

**File:** [`ttsService.ts`](ttsService.ts) (to be refactored)

**Responsibilities:**
- Create machine + scheduler
- Provide simple public API
- Parse text and build timelines
- Coordinate with LipSync and Prosodic agencies
- Handle callbacks for external consumers

**Agency Coordination Strategy:**
The TTS service should **delegate** to other agencies, not directly schedule animations:

```typescript
// OLD (direct scheduling - BAD):
this.animationManager.schedule({
  name: 'lipsync:hello',
  curves: { '1': [...], '26': [...] },
  snippetPriority: 50,
});

// NEW (delegation - GOOD):
this.lipSyncService.processWord('hello', wordIndex);
// LipSyncService handles its own snippet scheduling internally
```

**Why delegation is better:**
1. **Separation of Concerns**: Each agency manages its own domain
2. **State Management**: LipSyncService knows if it's already speaking
3. **Configuration**: LipSyncService has its own config (jaw activation, intensity)
4. **Cleanup**: Each agency manages its own snippet lifecycle

## Agency Coordination Flow

### Initialization

```typescript
// Create animation agency (central animation service)
const animationAgency = createAnimationService(engine);

// Create LipSync agency
const lipSyncService = createLipSyncService(
  { jawActivation: 1.5, lipsyncIntensity: 1.0 },
  {},
  {
    scheduleSnippet: (snippet) => animationAgency.schedule(snippet),
    removeSnippet: (name) => animationAgency.remove(name),
  }
);

// Create Prosodic agency
const prosodicService = createProsodicService(
  { browPriority: 30, headPriority: 30 },
  {},
  {
    scheduleSnippet: (snippet) => animationAgency.schedule(snippet),
    removeSnippet: (name) => animationAgency.remove(name),
  }
);

// Create TTS agency (coordinates with LipSync and Prosodic)
const ttsService = createTTSService(
  {
    engine: 'webSpeech',
    rate: 1.0,
    lipSyncService,        // Pass LipSync agency
    prosodicService,       // Pass Prosodic agency
  },
  {
    onStart: () => console.log('Speech started'),
    onEnd: () => console.log('Speech ended'),
  }
);
```

### Speech Flow

```
User calls: ttsService.speak("Hello world")
    ↓
1. TTSMachine: idle → SPEAK → loading
    ↓
2. TTSService: Parse text, build timeline
    ↓
3. TTSMachine: loading → SPEECH_LOADED → speaking
    ↓
4. TTSScheduler: scheduleWebSpeech(text, timeline)
   - synthesis.speak(utterance)
   - executeTimeline(timeline)
    ↓
5. Web Speech API: onboundary fired for each word
    ↓
6. TTSScheduler: onWordBoundary callback
    ↓
7. TTSService: Coordinate agencies
   - lipSyncService.processWord("Hello", 0)
   - prosodicService.pulse(0)
    ↓
8. LipSyncService (internal):
   - LipSyncMachine: idle → START_SPEECH → speaking
   - Extract phonemes: "Hello" → ['HH', 'EH', 'L', 'OW']
   - Map to visemes + jaw curves
   - LipSyncScheduler.scheduleWord()
   - animationAgency.schedule(visemeSnippet)
    ↓
9. ProsodicService (internal):
   - ProsodicMachine: idle → START_SPEAKING → speaking (if first word)
   - ProsodicScheduler.pulse(wordIndex)
   - Trigger brow raise every Nth word
   - animationAgency.schedule(browSnippet)
    ↓
10. Web Speech API: onend fired
    ↓
11. TTSScheduler: onSpeechEnd callback
    ↓
12. TTSMachine: speaking → SPEECH_ENDED → idle
    ↓
13. LipSyncService: endSpeech()
    - LipSyncMachine: speaking → END_SPEECH → ending → idle
    - Schedule neutral return snippet
    ↓
14. ProsodicService: stopTalking()
    - ProsodicMachine: speaking → STOP_SPEAKING → fading → idle
    - Gradual fade-out of gestures
```

## Benefits of Agency Pattern

### 1. State Machine Benefits
- **Predictable state transitions**: Can't go from `idle` to `speaking` without `loading`
- **Error recovery**: Clear error state with retry capability
- **Testing**: Easy to test state transitions in isolation
- **Visualization**: Can visualize state diagram in XState tools

### 2. Scheduler Separation Benefits
- **Testability**: Can test timeline execution independently
- **Modularity**: Easy to swap Web Speech API for SAPI
- **Clarity**: Clear separation between "what" (machine) and "how" (scheduler)

### 3. Agency Delegation Benefits
- **Encapsulation**: Each agency manages its own state and animations
- **Reusability**: LipSync/Prosodic can be used independently
- **Maintainability**: Changes to lip-sync logic don't affect TTS
- **Coordination**: Clear interfaces between agencies

## Migration Strategy

### Phase 1: Create Machine + Scheduler (DONE)
- ✅ Created `ttsMachine.ts` with XState
- ✅ Created `ttsScheduler.ts` for timeline execution

### Phase 2: Refactor TTSService
- [ ] Update `TTSConfig` to use `lipSyncService` and `prosodicService`
- [ ] Remove inline lip-sync curve generation (delegate to LipSyncService)
- [ ] Remove inline prosodic curve generation (delegate to ProsodicService)
- [ ] Use machine for state management
- [ ] Use scheduler for timeline execution
- [ ] Fix terminology: `animationManager` → `animationAgency`

### Phase 3: Update Types
- [ ] Remove direct animation scheduling from TTSConfig
- [ ] Add LipSyncService and ProsodicService to config
- [ ] Update callbacks to match new flow

### Phase 4: Update Documentation
- [ ] Update README with new architecture
- [ ] Add architecture diagram
- [ ] Document agency coordination flow
- [ ] Add examples of proper usage

### Phase 5: Testing
- [ ] Test state machine transitions
- [ ] Test scheduler with Web Speech API
- [ ] Test scheduler with SAPI
- [ ] Test agency coordination (TTS → LipSync → Prosodic → AnimationAgency)
- [ ] Test cleanup and resource management

## Implementation Notes

### Avoiding Direct Animation Scheduling

**BAD (current approach):**
```typescript
// TTS directly schedules lip-sync animations
handleWordBoundary(word) {
  const visemes = extractVisemes(word);
  const curves = buildCurves(visemes);
  this.animationManager.schedule({
    name: `lipsync:${word}`,
    curves,
    snippetPriority: 50,
  });
}
```

**GOOD (delegation approach):**
```typescript
// TTS delegates to LipSync agency
handleWordBoundary(word, wordIndex) {
  // LipSync handles its own state, scheduling, and cleanup
  this.lipSyncService.processWord(word, wordIndex);

  // Prosodic handles its own gesture patterns
  this.prosodicService.pulse(wordIndex);
}
```

### Configuration Example

```typescript
const ttsConfig = {
  engine: 'webSpeech',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voiceName: 'Google US English',

  // Agency references (NOT animation agency!)
  lipSyncService: lipSyncServiceInstance,
  prosodicService: prosodicServiceInstance,
};
```

### Callback Flow

```typescript
const ttsCallbacks = {
  onStart: () => {
    // TTS starts → Tell agencies to prepare
    lipSyncService.startSpeech();
    prosodicService.startTalking();
  },

  onEnd: () => {
    // TTS ends → Tell agencies to cleanup
    lipSyncService.endSpeech();  // Schedules neutral return
    prosodicService.stopTalking(); // Gradual fade-out
  },

  onError: (error) => {
    // TTS error → Stop all agencies
    lipSyncService.stop();
    prosodicService.stop();
  },
};
```

## Priority Hierarchy

When all agencies are active, animation priorities are:

1. **Neutral Return**: 60 (cleanup animations)
2. **Lip-Sync Visemes**: 50 (mouth shapes)
3. **Prosodic Gestures**: 30 (brow raises, head nods)
4. **Eye/Head Tracking**: 20 (gaze direction)
5. **Emotional Expressions**: 1 (baseline mood)

This ensures lip-sync is never overridden by gestures or expressions.

## Testing Strategy

### Unit Tests
- TTSMachine state transitions
- TTSScheduler timeline execution
- Voice loading and selection
- Error handling

### Integration Tests
- TTS → LipSync coordination
- TTS → Prosodic coordination
- TTS → LipSync → AnimationAgency flow
- Cleanup on speech end/error

### E2E Tests
- Complete speech flow: speak() → word boundaries → agencies → animations
- Pause/resume behavior
- Stop behavior
- Multiple sequential speeches

## Conclusion

By refactoring TTS to follow the **Agency Pattern** (Machine + Scheduler + Service), we achieve:

1. **Proper state management** with XState
2. **Clear separation** between state, scheduling, and coordination
3. **Delegation** to specialized agencies instead of direct animation scheduling
4. **Maintainability** through modular, testable components
5. **Consistency** with LipSync and Prosodic agency architecture

This aligns with the **Society of Mind** philosophy where each agency has a clear responsibility and communicates through well-defined interfaces.
