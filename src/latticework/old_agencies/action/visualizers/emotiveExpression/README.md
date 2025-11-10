

# Emotive Expression Service Documentation

The **Emotive Expression Service** provides a simple API for queuing and playing facial emotion snippets based on emojis or explicit calls. It leverages the shared **Animation Service** and a dedicated XState scheduler for sequencing.

---

## 1. Architecture Overview

The Emotive Expression Service has three main parts:

1. **Service API** (`emotiveExpressionService.js`)
   - Exposes functions to queue emotions (`handleWordBoundary`, `handleEmotion`), stop playback (`stop`), and clean up (`dispose`).
   - Internally uses `createAnimationService()` to load and play emotion snippets via the Animation Agency.
   - Subscribes to snippet-end events to advance through a queue of emotions.

2. **State Machine** (`emotiveExpressionMachine.js`)
   - Manages a FIFO queue of emotion items (`snippetKey`, `playbackRate`, `intensityScale`).
   - States:
     - **idle**: waits for `QUEUE_EMOTION` and then `START_PLAY`.
     - **expressing**: loads/plays a snippet; on snippet end or `STOP`, transitions back to `idle`.
   - Actions:
     - `assignSnippet`: saves snippet parameters.
     - `startSnippet`: loads the snippet from `localStorage`, calls `animationService.loadFromLocal`, and plays via `Animation Service`.
     - `stopSnippet` / `removeSnippet`: stops playback and cleans up temporary storage.

3. **Scheduler** (`emotiveSchedulerMachine.js`)
   - A small scheduler machine that triggers the next emotion in the queue.
   - Supports optional `offsetMs` delays between items and ensures one snippet plays at a time.

---

## 2. Installation & Initialization

```js
import { initEmotiveExpressionService } from './emotiveExpressionService';

const emotiveService = initEmotiveExpressionService();
```

No additional parameters are required. The service will automatically:

- Use emojis in `handleWordBoundary` to map to snippet keys.
- Load and play snippets from `localStorage` under `emotionAnimationsList/<key>`.
- Clean up temporary storage (`myAnimationTMP`) on completion.

---

## 3. API Reference

### `handleWordBoundary(text: string)`
Parses emojis in the given text and queues corresponding emotions:

```js
// Queues any emojis found in "Happy 😊 day"
emotiveService.handleWordBoundary("Happy 😊 day");
```

### `handleEmotion(snippetKey: string, playbackRate?: number, intensityScale?: number)`
Directly queue and play a named emotion snippet:

```js
// Queue the "angry" animation at double speed and half intensity
emotiveService.handleEmotion('angry', 2.0, 0.5);
```

### `stop()`
Immediately stops the current emotion playback and clears the queue.

```js
emotiveService.stop();
```

### `dispose()`
Stops playback, unsubscribes from the Animation Service, and frees resources.

```js
emotiveService.dispose();
```

---

## 4. Snippet Storage & Naming

Emotion snippets must be stored in `localStorage` under the key:

```
emotionAnimationsList/<snippetKey>
```

Each entry should be a JSON string with the same schema as used by the Animation Service (fields: `name`, `curves`, optional playback settings). The service will:

- Read the JSON.
- Assign `name`, `isPlaying`, `loop` flags.
- Load into the Animation Service under the temporary key `myAnimationTMP`.

---

## 5. Integration with Animation Agency

Emotive Expression Service uses the **Animation Agency** to:

1. Load snippets (`animationService.loadFromLocal`).
2. Control playback (`animationService.play()`, `.stop()`).
3. Sequence snippets in the machine until the queue is empty.


Refer to the Animation Agency README for deeper details on snippet handling, scrubbing, and AU curve management.

---

## 6. Supported Emojis

The Emotive Expression Service recognizes the following emoji-to-emotion mappings by default:

| Emoji | Emotion Key |
|-------|-------------|
| 😞    | sad         |
| 😢    | sad         |
| 😡    | angry       |
| 😱    | anxious     |
| 🙂    | calm        |
| 😅    | relieved    |
| 😔    | hopeless    |
| 😠    | stressed    |

You may extend or modify this mapping in `parseAllEmojis` within the service code.

---

## 7. API Reference & Examples

### Initialization

```js
import { initEmotiveExpressionService } from './emotiveExpressionService';
const emotiveService = initEmotiveExpressionService();
```

### Methods

| Method                                 | Description                                                                                         | Usage Example                                      |
|----------------------------------------|-----------------------------------------------------------------------------------------------------|----------------------------------------------------|
| `handleWordBoundary(text: string)`     | Parses emojis in `text` and queues corresponding emotion snippets.                                  | `emotiveService.handleWordBoundary('Hi 😄!');`      |
| `handleEmotion(key: string, rate?, scale?)` | Directly queue and play an emotion snippet by key, with optional playback rate and intensity scale. | `emotiveService.handleEmotion('angry', 1.5, 0.8);` |
| `stop(): void`                         | Immediately stops any playing emotion and clears the queue.                                         | `emotiveService.stop();`                          |
| `dispose(): void`                      | Stops playback, unsubscribes from internal services, and frees resources.                            | `emotiveService.dispose();`                       |

### Full Workflow Example

```js
// 1. Initialize service
const emotiveService = initEmotiveExpressionService();

// 2. Queue via text with emojis
emotiveService.handleWordBoundary('Feeling happy 😊');

// 3. Or queue directly by snippet key
emotiveService.handleEmotion('sad', 0.8, 1.2);

// 4. Stop all if needed
emotiveService.stop();

// 5. Cleanup when component unmounts
emotiveService.dispose();
```

---

## 8. Architecture & Interaction

The Emotive Expression Service is composed of three cooperating layers:

1. **Service (`emotiveExpressionService.js`)**
   - Exposes the public API (methods above).
   - Creates and holds references to:
     - **Animation Service** (singleton for loading and playing animations).
     - **XState Machine** (via `emotiveSchedulerMachine`) for queuing and sequencing.
   - Subscribes to Animation Service transitions to detect when a snippet finishes.
   - Starts the machine’s scheduler when queuing items.

2. **Machine (`emotiveExpressionMachine.js`)**
   - Implements a FIFO queue of emotion items.
   - States:
     - **idle**: awaiting `QUEUE_EMOTION` or explicit `PLAY_EMOTION` events.
     - **expressing**: loads and plays the current emotion snippet.
   - Actions:
     - `assignSnippet`: stores snippet parameters.
     - `startSnippet`: calls Animation Service to load/play the snippet.
     - `stopSnippet` / `removeSnippet`: stops playback and cleans up.
     - On snippet-end (`ANIMATION_DONE`), transitions back to `idle` or proceeds to next queue item.

3. **Scheduler (`emotiveSchedulerMachine.js`)**
   - Controls the timing between queued emotions:
     - **delaying**: optional pause before playing the next snippet.
     - **playing**: waits for `DONE_ITEM` from the Animation Service before moving on.
   - Ensures only one snippet plays at a time.
   - Coordinates with the service to dispatch `START_PLAY` and process `DONE_ITEM` events.

**Flow Diagram:**

```
[EmotiveService.handleWordBoundary]       [EmotiveService.handleEmotion]
                ↓                                    ↓
     Service sends QUEUE_EMOTION       Service sends QUEUE_EMOTION
                ↓                                    ↓
           [Scheduler.idle] —START_PLAY→ [Scheduler.delaying]
                ↓                                    ↓
      after offset delay (if any)     —NEXT_OFFSET→ [Scheduler.playing]
                ↓                                    ↓
          Scheduler action goPlay:    service.load/play & subscribe
            calls machine START_PLAY   Animation Service → Machine: ANIMATION_DONE
                ↓                                    ↓
         [Machine.expressing] ← ANIMATION_DONE — go to checkQueue
                ↓
       Transition back to idle or loop
```

These layers work together so that:
- **Service** methods immediately enqueue or control emotions.
- **Machine** ensures correct sequential loading/playing and responds to snippet-end callbacks.
- **Scheduler** governs delays and transitions between queue items, guaranteeing smooth, ordered expression.