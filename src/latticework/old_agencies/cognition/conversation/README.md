

# Conversation Service Documentation

The **Conversation Service** offers a unified framework for managing spoken or text-based conversational flows. It ties together:

- A **transcription service** for capturing user speech (partial and final)
- An **XState state machine** (`conversationMachine.js`) to manage dialog states and transitions
- A **TTS/dialog service** for speaking agent responses and emitting completion events

---

## 1. Architecture Overview

1. **Service Layer** (`conversationService.js`)
   - Initializes and interprets the XState `conversationMachine`.
   - Exposes methods:
     - `start()` – begins listening and conversation flow.
     - `stop()` – stops transcription, TTS, and machine.
     - `getState()` – retrieves the current machine state.
   - Hooks into transcription/TTS callbacks to send events to the machine.

2. **State Machine** (`conversationMachine.js`)
   - **States**:
     - `idle` → waiting for `START_CONVERSATION`
     - `listening` → handling `PARTIAL_USER_SPEECH` and `FINAL_USER_SPEECH`
     - `thinking` → awaiting `AGENT_RESPONSE` or `NO_RESPONSE`
     - `talking` → streaming TTS until `AGENT_DONE` or `USER_INTERRUPTED`
     - `interrupted` → capturing immediate follow-up then returning to `thinking`
   - **Events**: `START_CONVERSATION`, `PARTIAL_USER_SPEECH`, `FINAL_USER_SPEECH`, `AGENT_RESPONSE`, `AGENT_DONE`, `USER_INTERRUPTED`, `RESUME`, `NO_RESPONSE`
   - **Actions**: assign user/agent text to context, manage transitions on interruptions.

3. **Transcription & TTS Integration**
   - A transcription engine (e.g. Web Speech API) sends partial and final transcripts to the service.
   - A TTS engine speaks agent replies and emits `AGENT_DONE` when complete.

---

## 2. Installation & Initialization

```js
import { initConversationService } from './conversationService';
import { yourTtsService } from './yourTtsImplementation';

const convoService = initConversationService({
  chatFlowGenerator,    // generator yielding agent text responses
  ttsService: yourTtsService,
  onUserSpeechPartial: (txt, isInterrupted) => { /* UI update */ },
  onUserSpeechFinal:   (txt, isInterrupted) => { /* UI update */ },
  onAgentUtterance:    (txt) => { /* UI update */ }
});

convoService.start();

// Later, to stop:
convoService.stop();
```

---

## 3. Public API

| Method                    | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| `start(): void`           | Begin transcription, machine, and TTS dialogue.              |
| `stop(): void`            | Stop all services and reset state.                           |
| `getState(): State`       | Retrieve the current XState machine state object.            |
| `service`: Interpreter     | Exposes the raw XState service for advanced subscriptions.   |

---

## 4. Conversation Flow Example

1. **User speaks** → service sends `PARTIAL_USER_SPEECH` events, then `FINAL_USER_SPEECH`.
2. **Machine** transitions to `thinking`, invokes `chatFlowGenerator`.
3. **Agent response** → generator yields text, service sends `AGENT_RESPONSE`, then enters `talking`.
4. **TTS** speaks text, on completion sends `AGENT_DONE`, machine returns to `listening`.
5. To **interrupt**, user speech during `talking` triggers `USER_INTERRUPTED` and moves to `interrupted`.

---

## 5. Future Work: Pure XState Scheduling

Currently, timeouts and debouncing (e.g., ignoring quick partials) rely on external `setTimeout` calls within the service. A more declarative approach would:

- Use XState’s **`after`** transitions and **`delays`** to debounce or ignore short utterances.
- Model TTS and transcription as **invoked services** (`invoke`) returning Promises or Observables.
- Replace manual `setTimeout` logic with **machine-driven** timers, improving testability and clarity.

Such a refactor would centralize all timing and cancellation logic within the XState machine itself.

---

*Last updated: May 2025*
*eEVA Workbench — Conversation Service*