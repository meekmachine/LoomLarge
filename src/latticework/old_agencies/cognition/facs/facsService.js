// facsService.js
import { interpret } from 'xstate';
import { createFacsMachine } from './facsMachine.js';

// We might also import & init our scheduler, if you want
import { initFacsScheduler, scheduleAU, scheduleViseme } from './facsScheduler.js';

/** 
 * We'll keep a global reference to the interpreted facsService. 
 */
export let facsService = null;

/**
 * initFacsService(engine):
 *   - If already created, returns existing service.
 *   - Otherwise, creates the machine with 'engine' => interprets & starts it.
 *   - Also calls initFacsScheduler() if you want to use scheduled transitions.
 */
export function initFacsService(engine) {
  if (facsService) {
    console.warn('[facsService] => Already initialized, returning existing service.');
    return facsService;
  }

  console.log('[facsService] => Initializing with engine:', engine);

  // 1) Create the machine
  const machine = createFacsMachine(engine);

  // 2) Interpret & start
  facsService = interpret(machine)
    .onTransition((state) => {
      if (state.changed) {
        console.log('[facsService] => State changed:', state.value, state.context);
      }
    })
    .start();

  console.log('[facsService] => Machine started.');

  // 3) (Optional) Init scheduler
  initFacsScheduler();

  // By default operate in pure Viseme mode (no AU fallback)
  facsService.send({ type: 'SET_VISEME_MODE', value: false });

  return facsService;
}

// ---------------------------------------------------------------------------
// Immediate (non-delayed) events
// ---------------------------------------------------------------------------
export function setAU(auId, intensity=0, notes='') {
  facsService?.send({ type: 'SET_AU', auId, intensity, notes });
}

export function setViseme(visemeId, intensity=0, duration=0, notes='') {
  facsService?.send({ type: 'SET_VISEME', visemeId, intensity, duration, notes });
}

export function neutral() {
  facsService?.send({ type: 'NEUTRAL' });
}

export function neutralVisemes() {
  facsService?.send({ type: 'NEUTRAL_VISEMES' });
}

export function setVisemeMode(boolVal) {
  facsService?.send({ type: 'SET_VISEME_MODE', value: boolVal });
}

export function applyFacsJson(jsonStr) {
  facsService?.send({ type: 'APPLY_JSON', json: jsonStr });
}

// ---------------------------------------------------------------------------
// Scheduled transitions => call the scheduler
// ---------------------------------------------------------------------------
export function transitionAU(auId, intensity=0, delay=0, notes='') {
  scheduleAU(auId, intensity, delay, notes);
}

export function transitionViseme(visemeId, intensity=0, duration=0, delay=0, notes='') {
  scheduleViseme(visemeId, intensity, duration, delay, notes);
}