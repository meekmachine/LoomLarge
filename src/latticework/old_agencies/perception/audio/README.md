////////////////////////////////////////////////////////////////////////////////
// 4) README.md
////////////////////////////////////////////////////////////////////////////////
# Transcription Agency (VISOS)

This folder implements a **Transcription Agency** that uses **XState** for managing recognition states and **RxJS** for possible streaming or integration with other services. It filters out the agent’s own speech using a fuzzy logic approach (or potentially boundary-based if integrated with a TTS boundary$).

## Files

1. **transcriptionMachine.js**  
   - Defines a minimal XState machine:
     - States: `off`, `listening`, `error`.  
     - On `START_LISTENING`, we move to `listening` and **invoke** `transcriptionProcess`.  
     - On `STOP_LISTENING`, we go to `off`.  
     - If recognition ends unexpectedly and we haven't manually stopped, we `RECOGNITION_ENDED` => re-enter `listening` (auto-restart).

2. **transcriptionSchedulerMachine.js** (Optional)  
   - If you want a separate machine to orchestrate “start recognition → onend => restart,” you can store that logic here.  
   - The example shows states `ready`, `recognizing`, `restart`. But in many cases, you can fold this logic into the main machine.

3. **transcriptionService.js**  
   - Wires up the `transcriptionMachine`.  
   - Provides `startListening()`, `stopListening()`, and publishes recognized transcripts to a callback (`onTranscript`).  
   - Subscribes to `agentSpeech$` (from TTS) to set or clear agent words, so partial and final recognized chunks matching the agent text can be ignored.  
   - Exposes a “transcriptionProcess” callback that uses `SpeechRecognition` or `webkitSpeechRecognition` with no “magic intervals.”  
     - If recognition ends, it dispatches `'RECOGNITION_ENDED'` so the machine can decide whether to restart or stop.

4. **transcriptionProcess** (Inlined)  
   - A callback invoked by XState’s “invoke.”  
   - Starts continuous speech recognition with Web Speech API, filters out partial/final chunks if they fuzzy-match the agent’s last word or phrase above a similarity threshold.  
   - On `onend`, immediately sends `'RECOGNITION_ENDED'` if not manually stopped (no “300 ms” delay).

## How It Works

1. **User calls** `startListening()` on the service => machine goes `off` → `listening`.  
2. **Machine invokes** `transcriptionProcess`, which starts recognition.  
3. **AgentSpeech** events can set or clear `currentAgentWord` or `lastAgentSpeech`, letting the fuzzy logic ignore recognized text that’s too similar.  
4. **If recognition ends** unexpectedly, we send `'RECOGNITION_ENDED'`. The machine sees if `manuallyStopped === false`; if so, it re-enters `listening` (immediate auto-restart).  
5. **If user calls** `stopListening()`, it sets `manuallyStopped = true` and transitions to `off`. That also stops recognition.  
6. **No magic intervals**: no “sleep(300).” All restarts or stops are purely event-driven.

## Benefits

- **Fully event-driven**: No leftover timeouts for onend restarts.  
- **Immediate user interrupt**: `stopListening()` halts recognition at once.  
- **Agent speech filter**: Fuzzy logic or boundary-based ignoring ensures we only capture real user speech.  
- **Easily extended**: You can add partial chunk merging, time-based gating, or boundary$ integration without rewriting everything.

---