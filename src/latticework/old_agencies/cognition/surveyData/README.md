
# Survey Data Agency

This agency is responsible for maintaining the core state of the survey responses. It does not deal with conversation logic or spoken interaction. It is deliberately simple and serves as the canonical source for:

- The current question index
- The set of answers given so far

## Files

### surveyDataMachine.js

Defines a simple XState machine `surveyDataMachine` with the following state and context:
- State:
  - `inProgress`: the survey is ongoing
  - `finished`: the survey is complete
- Context:
  - `index`: the index of the current question
  - `answers`: an object mapping question indices to canonical answers

It handles these events:
- `SET_ANSWER` → sets the answer for the current index
- `NEXT` → increments the index
- `PREVIOUS` → decrements the index (bounded at 0)
- `END` → marks the survey as finished

Also exports:
- `SURVEY_TEXT`: question text list from `surveyQuestions.json`
- `SURVEY_OPTIONS`: list of options for each question

### surveyDataService.js

Initializes and starts an interpreter of the surveyDataMachine and provides a simple API:
- `setAnswer(text)`
- `nextQuestion()`
- `endSurvey()`
- `subscribe(listener)`

## Current Bugs / Issues

- No explicit check exists for answering out of bounds (this is assumed to be handled by the caller).
- Does not support asynchronous updates or dynamic questions.
- Coupled tightly to JSON-defined questions (could refactor for better modularity).

## Next Steps

- Add ability to track skipped questions explicitly.
- Record timestamps for answer submissions.
- Support resetting the survey state from an external trigger.