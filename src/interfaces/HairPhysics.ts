/**
 * Hair Physics Interface
 *
 * Defines the contract for hair physics simulation systems.
 * Implementations can use different physics models (spring-damper, verlet, etc.)
 */

/**
 * Configuration for hair physics simulation
 */
export interface HairPhysicsConfig {
  // Spring-damper parameters
  mass: number;           // Hair mass (affects inertia)
  stiffness: number;      // Spring stiffness (restoration force)
  damping: number;        // Damping coefficient (air resistance)

  // Gravity
  gravity: number;        // Gravity strength

  // Head influence
  headInfluence: number;  // How much head movement affects hair (0-1)

  // Wind simulation
  windEnabled: boolean;
  windStrength: number;   // Wind force magnitude
  windDirectionX: number; // Wind direction X component (-1 to 1)
  windDirectionZ: number; // Wind direction Z component (-1 to 1)
  windTurbulence: number; // Random variation in wind
  windFrequency: number;  // Oscillation frequency in Hz
}

/**
 * Hair strand definition for multi-strand simulation
 */
export interface HairStrand {
  id: string;
  morphKeys: {
    left: string;
    right: string;
    front?: string;
    back?: string;
  };
  // Optional per-strand physics overrides
  mass?: number;
  stiffness?: number;
  damping?: number;
}

/**
 * Current physics state of hair simulation
 */
export interface HairState {
  // Current pendulum position (normalized -1 to 1)
  x: number;  // Left/right swing
  z: number;  // Front/back swing

  // Current velocity
  vx: number;
  vz: number;
}

/**
 * Head orientation state for physics input
 */
export interface HeadState {
  // Head rotation in radians
  yaw: number;    // Left/right rotation
  pitch: number;  // Up/down rotation
  roll: number;   // Tilt

  // Head angular velocity (radians/sec) - for inertia
  yawVelocity: number;
  pitchVelocity: number;
}

/**
 * Output morph values from physics simulation
 */
export interface HairMorphOutput {
  [morphKey: string]: number;
}

/**
 * Hair Physics simulation interface
 */
export interface HairPhysics {
  /**
   * Update physics simulation
   * @param dt Delta time in seconds
   * @param headState Current head orientation and velocity
   * @returns Morph values to apply to hair meshes
   */
  update(dt: number, headState: HeadState): HairMorphOutput;

  /**
   * Get current physics state (for debugging/UI)
   */
  getState(): HairState;

  /**
   * Update configuration
   */
  setConfig(config: Partial<HairPhysicsConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): HairPhysicsConfig;

  /**
   * Reset physics state to rest position
   */
  reset(): void;
}
