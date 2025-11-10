# FACS Agency (With Central Scheduler)

This repository/folder provides a **Facial Animation** system for applying FACS Action Units (AUs) and Visemes in a Unity-based environment (or any 3D engine). It features:

1. **facsMachine** – The XState machine holding AU/Viseme states and applying collision logic.  
2. **facsService** – A high-level service to initialize and interact with the machine, offering direct methods (`setAU`, `setViseme`, etc.).  
3. **facsScheduler** – A queue-based state machine for *centralized* delayed events (instead of scattered `setTimeout`s), letting you schedule `SET_AU` or `SET_VISEME` calls at a given time offset.

---

## Table of Contents

1. [Overview](#overview)  
2. [Architecture](#architecture)  
3. [Installation & Setup](#installation--setup)  
4. [Usage & Interface](#usage--interface)  
5. [Collision Logic](#collision-logic)  
6. [Using AUs for Visemes](#using-aus-for-visemes)  
7. [Testing](#testing)  
8. [Known Limitations](#known-limitations)  

---

## Overview

- **Tracks** intensities for FACS-based AUs and Visemes.  
- **Applies collisions** (e.g., blink overrides wink).  
- Optionally **maps visemes** to recommended AUs (instead of direct blendshapes).  
- Uses **XState** to handle stateful logic in a robust, maintainable way.  
- **Schedules** events via `facsScheduler`, avoiding manual `setTimeout` calls.

---

## Architecture

1. **facsMachine**  
   - Holds `auStates` (one for each AU) and `visemeStates`.  
   - Applies collisions in `assignAUCollisions` using a function `applyCollisionsNoClamp`.  
   - Has a **guard** for “use AUs for visemes.” If true, a `SET_VISEME` event updates recommended AUs; otherwise, it updates a direct viseme blend shape.

2. **facsService**  
   - Interprets and starts the `facsMachine`.  
   - Exposes convenience methods: `setAU`, `setViseme`, `neutral`, etc.  
   - Optionally initializes the `facsScheduler`.

3. **facsScheduler**  
   - A queue-based XState machine that receives `SCHEDULE_TRANSITION` events with a `type`, a `delay`, and a `payload`.  
   - After the delay, it sends the original event (`type` + `payload`) to the `facsMachine`.  
   - This centralizes all timed logic (like “set Blink to 80% after 500ms”).

---

## Installation & Setup

1. **Copy** the three files—`facsMachine.js`, `facsService.js`, `facsScheduler.js`—into your project.  
2. **Ensure** you have a **shapeDict.js** with:
   - **ActionUnitsList**: Each AU can have a `collisions` array (either strings or objects, e.g. `{ partner:'45', type:'inverseDial', threshold:50, synergy:1.0 }`).  
   - **VisemesList**: If you want to map visemes to AUs, define `recommendedAUs: { auId: intensity, ... }`.  
3. **Provide** a `facslib.js` that implements a `FacsLib` class with methods like:
   ```js
   setTargetAU(auId, intensity, lOrR, smoothTime) {
     // calls Unity or your 3D engine
   }
   setTargetViseme(visemeId, intensity, smoothTime) {
     // ...
   }
   updateEngine() {
     // ...
   }

   #Using AUs for Visemes
	•	If setVisemeMode(true), then a SET_VISEME event calls assignVisemeAUStates, which:
	1.	Updates the viseme’s intensity in visemeStates.
	2.	Looks up recommendedAUs from shapeDict for that viseme.
	3.	Sets each recommended AU’s intensity (scaled by the viseme’s intensity).
	•	If setVisemeMode(false), SET_VISEME directly updates the viseme blend shape instead (e.g., facsLib.setTargetViseme(...)).