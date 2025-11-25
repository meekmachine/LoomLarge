/**
 * Hair Service
 *
 * Service layer for managing hair customization.
 * Bridges the XState machine with EngineThree for rendering updates.
 * Part of the latticework agency architecture.
 *
 * NOTE: This service is engine-agnostic - it does not import Three.js.
 * All rendering operations are delegated to EngineThree.
 */

import { createActor } from 'xstate';
import { hairMachine } from './hairMachine';
import { HairObjectRef, HairEvent, HairState } from './types';
import type { EngineThree } from '../../engine/EngineThree';
import { HairPhysicsAmmo } from './hairPhysicsAmmo';

// Hair physics configuration
interface HairPhysicsConfig {
  enabled: boolean;
  // Physics parameters (mapped to Ammo config)
  stiffness: number;      // Spring stiffness (1-20)
  damping: number;        // Air resistance (0-1)
  // Response parameters
  inertia: number;        // How much head movement affects hair (0-5)
  gravity: number;        // Gravity strength (0-40)
  responseScale: number;  // Amplification of physics to morphs (1-5)
  idleSwayAmount: number; // Subtle idle animation amplitude (0-1)
  idleSwaySpeed: number;  // Idle sway frequency
  // Wind parameters
  windStrength: number;   // Wind force strength (0-20)
  windDirectionX: number; // Wind direction X (-1 to 1)
  windDirectionZ: number; // Wind direction Z (-1 to 1)
  windTurbulence: number; // Turbulence amount (0-1)
  windFrequency: number;  // Turbulence speed (0.5-5)
}

// Hair physics state (for tracking)
interface HairPhysicsState {
  // Current morph values
  left: number;
  right: number;
  front: number;
  fluffyRight: number;
  fluffyBottom: number;
  // Time tracking
  lastUpdateTime: number;
  idlePhase: number;
}

export class HairService {
  private actor: ReturnType<typeof createActor<typeof hairMachine>>;
  private objects: HairObjectRef[] = [];
  private subscribers: Set<(state: HairState) => void> = new Set();
  private engine: EngineThree | null = null;

  // Hair physics - now using Ammo.js
  private ammoPhysics: HairPhysicsAmmo | null = null;
  private physicsConfig: HairPhysicsConfig = {
    enabled: false,
    stiffness: 5.0,        // Spring stiffness (lower = more movement)
    damping: 0.3,          // Air resistance
    inertia: 3.0,          // Head influence multiplier
    gravity: 9.8,          // Gravity
    responseScale: 2.0,    // Amplification factor for morph output
    idleSwayAmount: 0.25,  // More visible idle sway
    idleSwaySpeed: 0.8,    // Moderate sway speed
    // Wind defaults (disabled)
    windStrength: 0,
    windDirectionX: 1.0,   // Default: wind from left
    windDirectionZ: 0,
    windTurbulence: 0.3,
    windFrequency: 2.0,
  };
  private physicsState: HairPhysicsState = {
    left: 0,
    right: 0,
    front: 0,
    fluffyRight: 0,
    fluffyBottom: 0,
    lastUpdateTime: 0,
    idlePhase: 0
  };
  private physicsAnimationId: number | null = null;
  private physicsSubscribers: Set<(config: HairPhysicsConfig) => void> = new Set();

  constructor(engine?: EngineThree) {
    this.actor = createActor(hairMachine);
    this.engine = engine || null;

    // Subscribe to state changes
    this.actor.subscribe((snapshot) => {
      const state = snapshot.context.state;

      // Apply changes via engine
      this.applyStateToScene(state);

      // Notify subscribers
      this.subscribers.forEach((callback) => callback(state));
    });

    this.actor.start();
  }

  /**
   * Register hair/eyebrow objects from the scene
   * Delegates all Three.js operations to EngineThree
   */
  registerObjects(objects: any[]) {
    if (!this.engine) {
      console.warn('[HairService] No engine available for registration');
      return;
    }

    // Delegate registration to engine - returns engine-agnostic metadata
    this.objects = this.engine.registerHairObjects(objects);

    // Reset to default state
    this.actor.send({ type: 'RESET_TO_DEFAULT' } as HairEvent);

    // Apply initial state
    this.applyStateToScene(this.getState());
  }

  /**
   * Send an event to the state machine
   */
  send(event: HairEvent) {
    this.actor.send(event);
  }

  /**
   * Get current hair state
   */
  getState(): HairState {
    return this.actor.getSnapshot().context.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: HairState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Apply the current state to the scene via EngineThree
   * No direct Three.js manipulation - all operations delegated to engine
   */
  private applyStateToScene(state: HairState) {
    if (!this.engine) return;

    this.objects.forEach((objRef) => {
      const { name, isEyebrow, isMesh } = objRef;

      // Only apply to meshes
      if (!isMesh) return;

      // Select color based on object type
      const color = isEyebrow ? state.eyebrowColor : state.hairColor;

      // Get part-specific state
      const partState = state.parts[name];

      // Build state object for engine
      const objectState = {
        color: {
          baseColor: color.baseColor,
          emissive: color.emissive,
          emissiveIntensity: color.emissiveIntensity,
        },
        outline: {
          show: state.showOutline,
          color: state.outlineColor,
          opacity: state.outlineOpacity,
        },
        visible: partState?.visible ?? true,  // Default to visible if no part state
        scale: partState?.scale,
        position: partState?.position,
        isEyebrow: isEyebrow,
      };

      // Delegate all rendering to engine
      this.engine.applyHairStateToObject(name, objectState);
    });
  }

  /**
   * Animate hair using morph targets (shape keys)
   * Hair has 14 shape keys that can be animated for physics-based movement
   */
  animateHairMorph(morphKey: string, targetValue: number, durationMs: number = 300) {
    if (!this.engine) {
      console.warn('[HairService] No engine available for hair animation');
      return;
    }

    // Delegate to engine's morph animation system
    this.engine.transitionMorph(morphKey, targetValue, durationMs);
  }

  /**
   * Set hair morph instantly (no transition)
   */
  setHairMorph(morphKey: string, value: number) {
    if (!this.engine) {
      console.warn('[HairService] No engine available for hair morph');
      return;
    }

    // Debug: log morph changes (throttled)
    if (Math.random() < 0.01) {
      console.log(`[HairService] setHairMorph: ${morphKey} = ${value.toFixed(3)}`);
    }

    this.engine.setMorph(morphKey, value);
  }

  /**
   * Get list of available hair morphs from the registered hair objects
   * Returns morph target dictionary keys from the first hair mesh found
   */
  getAvailableHairMorphs(): string[] {
    if (!this.engine) {
      return [];
    }

    // Find a hair mesh (not eyebrow) from our registered objects
    const hairObj = this.objects.find(obj => !obj.isEyebrow && obj.isMesh);
    if (!hairObj) return [];

    // Use engine's public method to get morph targets
    return this.engine.getHairMorphTargets(hairObj.name);
  }

  // ==========================================
  // HAIR PHYSICS SYSTEM
  // ==========================================

  /**
   * Enable or disable hair physics simulation
   */
  setPhysicsEnabled(enabled: boolean) {
    this.physicsConfig.enabled = enabled;

    if (enabled) {
      this.startPhysicsLoop();
      console.log('[HairService] Hair physics enabled');
    } else {
      this.stopPhysicsLoop();
      // Reset morphs to neutral
      this.resetHairMorphs();
      console.log('[HairService] Hair physics disabled');
    }

    this.notifyPhysicsSubscribers();
  }

  /**
   * Check if physics is enabled
   */
  isPhysicsEnabled(): boolean {
    return this.physicsConfig.enabled;
  }

  /**
   * Update physics configuration
   */
  updatePhysicsConfig(updates: Partial<HairPhysicsConfig>) {
    this.physicsConfig = { ...this.physicsConfig, ...updates };

    // Sync to Ammo physics
    this.syncAmmoConfig();

    this.notifyPhysicsSubscribers();
  }

  /**
   * Get current physics configuration
   */
  getPhysicsConfig(): HairPhysicsConfig {
    return { ...this.physicsConfig };
  }

  /**
   * Subscribe to physics config changes
   */
  subscribeToPhysics(callback: (config: HairPhysicsConfig) => void): () => void {
    this.physicsSubscribers.add(callback);
    return () => this.physicsSubscribers.delete(callback);
  }

  private notifyPhysicsSubscribers() {
    this.physicsSubscribers.forEach(cb => cb(this.getPhysicsConfig()));
  }

  /**
   * Start the physics animation loop
   */
  private startPhysicsLoop() {
    if (this.physicsAnimationId !== null) return;

    // Initialize Ammo physics if not already
    if (!this.ammoPhysics) {
      this.ammoPhysics = new HairPhysicsAmmo();

      // Set up callback for physics updates
      this.ammoPhysics.setOnUpdate((state) => {
        // Map pendulum position to morph values
        // state.x: left/right (-1 to 1)
        // state.z: front/back (-1 to 1)

        // Add idle sway
        const idleSway = Math.sin(this.physicsState.idlePhase * Math.PI * 2) * this.physicsConfig.idleSwayAmount;

        // Amplify the physics output using configurable responseScale
        const scale = this.physicsConfig.responseScale;
        const amplifiedX = state.x * scale;
        const amplifiedZ = state.z * scale;
        const horizontal = amplifiedX + idleSway;

        // Convert to left/right morphs (values 0-1)
        const leftValue = Math.max(0, Math.min(1, horizontal > 0 ? horizontal : 0));
        const rightValue = Math.max(0, Math.min(1, horizontal < 0 ? -horizontal : 0));

        // Front: positive z means hair moved forward (gravity effect)
        // No baseline offset - only move when there's actual physics input
        const frontValue = Math.max(0, Math.min(1, amplifiedZ * 0.5));

        // Fluffy_Right: adds volume when moving right, modulated by horizontal movement
        // This creates a fuller look when hair swings to the right
        const fluffyRightValue = Math.max(0, Math.min(1, rightValue * 0.7));

        // Fluffy_Bottom_ALL: adds volume to bottom, modulated by movement intensity
        // No baseline offset - only activate when there's actual movement
        const movementIntensity = Math.abs(horizontal) + Math.abs(amplifiedZ);
        const fluffyBottomValue = Math.max(0, Math.min(1, movementIntensity * 0.25));

        // Debug logging (throttled)
        if (Math.random() < 0.02) {
          console.log(`[HairPhysics] x=${state.x.toFixed(3)} z=${state.z.toFixed(3)} → L=${leftValue.toFixed(2)} R=${rightValue.toFixed(2)} F=${frontValue.toFixed(2)} FR=${fluffyRightValue.toFixed(2)} FB=${fluffyBottomValue.toFixed(2)}`);
        }

        // Store state
        this.physicsState.left = leftValue;
        this.physicsState.right = rightValue;
        this.physicsState.front = frontValue;
        this.physicsState.fluffyRight = fluffyRightValue;
        this.physicsState.fluffyBottom = fluffyBottomValue;

        // Apply to morphs
        this.setHairMorph('L_Hair_Left', leftValue);
        this.setHairMorph('L_Hair_Right', rightValue);
        this.setHairMorph('L_Hair_Front', frontValue);
        this.setHairMorph('Fluffy_Right', fluffyRightValue);
        this.setHairMorph('Fluffy_Bottom_ALL', fluffyBottomValue);
      });
    }

    // Sync config to Ammo physics
    this.syncAmmoConfig();

    this.physicsState.lastUpdateTime = performance.now();

    const updatePhysics = () => {
      if (!this.physicsConfig.enabled) return;

      this.updateHairPhysics();
      this.physicsAnimationId = requestAnimationFrame(updatePhysics);
    };

    this.physicsAnimationId = requestAnimationFrame(updatePhysics);
  }

  /**
   * Sync HairService config to Ammo physics
   */
  private syncAmmoConfig() {
    if (!this.ammoPhysics) return;

    this.ammoPhysics.setConfig({
      stiffness: this.physicsConfig.stiffness,
      damping: this.physicsConfig.damping,
      headInfluence: this.physicsConfig.inertia,
      gravity: this.physicsConfig.gravity,
      // Wind parameters
      windStrength: this.physicsConfig.windStrength,
      windDirectionX: this.physicsConfig.windDirectionX,
      windDirectionZ: this.physicsConfig.windDirectionZ,
      windTurbulence: this.physicsConfig.windTurbulence,
      windFrequency: this.physicsConfig.windFrequency,
    });
  }

  /**
   * Stop the physics animation loop
   */
  private stopPhysicsLoop() {
    if (this.physicsAnimationId !== null) {
      cancelAnimationFrame(this.physicsAnimationId);
      this.physicsAnimationId = null;
    }

    // Reset Ammo physics
    if (this.ammoPhysics) {
      this.ammoPhysics.reset();
    }
  }

  /**
   * Reset hair morphs to neutral position
   */
  private resetHairMorphs() {
    this.setHairMorph('L_Hair_Left', 0);
    this.setHairMorph('L_Hair_Right', 0);
    this.setHairMorph('L_Hair_Front', 0);
    this.setHairMorph('Fluffy_Right', 0);
    this.setHairMorph('Fluffy_Bottom_ALL', 0);

    this.physicsState = {
      left: 0,
      right: 0,
      front: 0,
      fluffyRight: 0,
      fluffyBottom: 0,
      lastUpdateTime: 0,
      idlePhase: 0
    };

    if (this.ammoPhysics) {
      this.ammoPhysics.reset();
    }
  }

  // Frame counter for debug
  private physicsFrameCount = 0;

  /**
   * Main physics update - called every frame when physics is enabled
   * Now uses spring-damper physics
   */
  private updateHairPhysics() {
    if (!this.engine) {
      console.warn('[HairService] updateHairPhysics: No engine!');
      return;
    }

    this.physicsFrameCount++;

    const now = performance.now();
    const dt = Math.min((now - this.physicsState.lastUpdateTime) / 1000, 0.1);
    this.physicsState.lastUpdateTime = now;

    if (dt < 0.001) return;

    // Update idle sway phase
    this.physicsState.idlePhase += dt * this.physicsConfig.idleSwaySpeed;

    // Get current head rotation (-1 to 1 range)
    const headRotation = this.engine.getHeadRotation();
    const { yaw, pitch } = headRotation;

    // Debug every 60 frames
    if (this.physicsFrameCount % 60 === 0) {
      console.log(`[HairService] Physics frame ${this.physicsFrameCount}: yaw=${yaw.toFixed(3)} pitch=${pitch.toFixed(3)} ammoReady=${this.ammoPhysics?.isReady()}`);
    }

    // Update physics with head rotation
    if (this.ammoPhysics && this.ammoPhysics.isReady()) {
      this.ammoPhysics.update(dt, yaw, pitch);
    } else {
      // Fallback: simple physics if not ready
      console.warn('[HairService] Physics not ready, using fallback');
      this.updateFallbackPhysics(dt, yaw, pitch);
    }
  }

  /**
   * Fallback physics when Ammo.js is not ready
   */
  private updateFallbackPhysics(dt: number, yaw: number, pitch: number) {
    const { inertia, idleSwayAmount } = this.physicsConfig;

    // Idle sway
    const idleSway = Math.sin(this.physicsState.idlePhase * Math.PI * 2) * idleSwayAmount;

    // Head response
    const horizontal = idleSway + (-yaw * inertia * 0.3);

    // Gravity effect
    const gravityBase = 0.1 * inertia;
    const gravityFromPitch = -pitch * inertia * 0.3;
    const frontValue = Math.max(0, Math.min(1, gravityBase + gravityFromPitch));

    // Convert to morphs
    const leftValue = Math.max(0, Math.min(1, horizontal > 0 ? horizontal : 0));
    const rightValue = Math.max(0, Math.min(1, horizontal < 0 ? -horizontal : 0));

    // Fluffy_Right: adds volume when moving right
    const fluffyRightValue = Math.max(0, Math.min(1, rightValue * 0.7));

    // Fluffy_Bottom_ALL: adds volume to bottom, modulated to lesser degree
    const movementIntensity = Math.abs(horizontal) + Math.abs(frontValue);
    const fluffyBottomValue = Math.max(0, Math.min(1, movementIntensity * 0.25 + 0.1));

    // Apply
    this.setHairMorph('L_Hair_Left', leftValue);
    this.setHairMorph('L_Hair_Right', rightValue);
    this.setHairMorph('L_Hair_Front', frontValue);
    this.setHairMorph('Fluffy_Right', fluffyRightValue);
    this.setHairMorph('Fluffy_Bottom_ALL', fluffyBottomValue);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopPhysicsLoop();

    // Dispose Ammo physics
    if (this.ammoPhysics) {
      this.ammoPhysics.dispose();
      this.ammoPhysics = null;
    }

    this.actor.stop();
    this.subscribers.clear();
    this.physicsSubscribers.clear();

    // Engine handles all Three.js cleanup
    // We just clear our references
    this.objects = [];
  }
}
