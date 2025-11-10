

# Survey Conversation Agency

This agency manages the interactive logic layer between the survey engine and the spoken or UI-based interaction. It uses an XState state machine to manage the flow of questions, user answers, and system prompts.

## Files

### surveyConversationMachine.js

A complex state machine that controls the progression through the survey stages:

- States:
  - `idle`: before survey begins
  - `asking`: system speaks a question
  - `listening`: waits for user input
  - `reflecting`: acknowledges user response
  - `reviewing`: plays back prior question and response
  - `finished`: end of survey

- Context includes:
  - `idx`: current question index
  - `partialAnswer` / `lastAnswer`
  - `skipRequested`, `reviewRequested`
  - `timerRef`: reference to child timer machine

### surveyConversationService.js

Orchestrates the agent behavior:
- Initializes surveyDataService and surveyConversationMachine
- Manages user speech events and TTS agent utterances
- Contains `makeSurveyFlow`, which yields utterances and flow control directives based on survey state
- Routes UI-triggered answers into the conversation machine

### surveyScheduler.js

Defines a scheduler state machine to manage stage-specific timeouts for asking, listening, and reflecting phases.

## Current Bugs / Issues

- In some cases, after a `REFLECT_SPOKEN`, the conversation does not transition to the next question.
- Timeout behavior can feel abrupt or repetitive — smoothing transitions is planned.
- TTS sometimes overlaps with UI-triggered question changes.
- Needs better handling when the user gives an unexpected answer or falls silent.

## Next Steps

- Refactor `makeSurveyFlow` into a reusable generator with context-aware branching.
- Ensure consistent behavior when interrupting or skipping via UI or speech.
- Link `surveyScheduler` tightly with the parent machine's lifecycle.
- Add explicit flag to track whether a question was answered or skipped.