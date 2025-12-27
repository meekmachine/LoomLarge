/**
 * HairPhysics - Spring-damper pendulum simulation for hair movement
 *
 * This is a pure physics simulation class with no Three.js dependencies.
 * It outputs normalized morph values (0-1) that can be applied to hair meshes
 * via EngineThree.setMorph() or transitionMorph().
 *
 * Physics model:
 * - Hair is modeled as a damped pendulum affected by:
 *   - Gravity (constant downward force based on head orientation)
 *   - Head velocity (inertia causes hair to lag behind head movement)
 *   - Wind (oscillating force with turbulence)
 *   - Spring restoration (hair returns to rest position)
 *   - Damping (air resistance)
 */

export interface HairPhysicsConfig {
  // Spring-damper parameters
  mass: number;           // Hair mass (affects inertia), default 1.0
  stiffness: number;      // Spring stiffness (restoration force), default 15
  damping: number;        // Damping coefficient (air resistance), default 0.8

  // Gravity
  gravity: number;        // Gravity strength, default 9.8

  // Head influence
  headInfluence: number;  // How much head movement affects hair (0-1), default 0.5

  // Wind simulation
  windEnabled: boolean;
  windStrength: number;   // Wind force magnitude, default 0
  windDirectionX: number; // Wind direction X component (-1 to 1), default 1
  windDirectionZ: number; // Wind direction Z component (-1 to 1), default 0
  windTurbulence: number; // Random variation in wind, default 0.2
  windFrequency: number;  // Oscillation frequency in Hz, default 0.5
}

export interface HairPhysicsState {
  // Current pendulum position (normalized -1 to 1)
  x: number;  // Left/right swing
  z: number;  // Front/back swing

  // Current velocity
  vx: number;
  vz: number;
}

export interface HairMorphOutput {
  // Left side morphs (0-1)
  L_Hair_Left: number;
  L_Hair_Right: number;
  L_Hair_Front: number;

  // Right side morphs (0-1)
  R_Hair_Left: number;
  R_Hair_Right: number;
  R_Hair_Front: number;
}

export interface HeadState {
  // Head rotation in radians
  yaw: number;    // Left/right rotation
  pitch: number;  // Up/down rotation
  roll: number;   // Tilt

  // Head angular velocity (radians/sec) - for inertia
  yawVelocity: number;
  pitchVelocity: number;
}

export const DEFAULT_HAIR_PHYSICS_CONFIG: HairPhysicsConfig = {
  mass: 1.0,
  stiffness: 15,
  damping: 0.8,
  gravity: 9.8,
  headInfluence: 0.5,
  windEnabled: false,
  windStrength: 0,
  windDirectionX: 1,
  windDirectionZ: 0,
  windTurbulence: 0.2,
  windFrequency: 0.5,
};

export class HairPhysics {
  private config: HairPhysicsConfig;
  private state: HairPhysicsState;
  private time: number = 0;

  // Previous head state for velocity calculation
  private prevHeadYaw: number = 0;
  private prevHeadPitch: number = 0;

  constructor(config: Partial<HairPhysicsConfig> = {}) {
    this.config = { ...DEFAULT_HAIR_PHYSICS_CONFIG, ...config };
    this.state = { x: 0, z: 0, vx: 0, vz: 0 };
  }

  /**
   * Update physics simulation
   * @param dt Delta time in seconds
   * @param headState Current head orientation and velocity
   * @returns Morph values to apply to hair meshes
   */
  update(dt: number, headState: HeadState): HairMorphOutput {
    if (dt <= 0 || dt > 0.1) {
      // Skip bad delta times (prevent explosion on tab switch)
      return this.computeMorphOutput();
    }

    this.time += dt;

    const { mass, stiffness, damping, gravity, headInfluence, windEnabled } = this.config;

    // Calculate head angular velocity if not provided
    const headYawVel = headState.yawVelocity !== 0
      ? headState.yawVelocity
      : (headState.yaw - this.prevHeadYaw) / dt;
    const headPitchVel = headState.pitchVelocity !== 0
      ? headState.pitchVelocity
      : (headState.pitch - this.prevHeadPitch) / dt;

    this.prevHeadYaw = headState.yaw;
    this.prevHeadPitch = headState.pitch;

    // === Forces ===

    // 1. Spring restoration force (pulls hair back to center)
    const springFx = -stiffness * this.state.x;
    const springFz = -stiffness * this.state.z;

    // 2. Damping force (air resistance)
    const dampFx = -damping * this.state.vx;
    const dampFz = -damping * this.state.vz;

    // 3. Gravity effect based on head pitch
    // When head tilts forward (positive pitch), hair swings forward
    // When head tilts back, hair swings back
    const gravityFz = gravity * Math.sin(headState.pitch) * 0.1;

    // 4. Head rotation inertia (hair lags behind head movement)
    // When head turns right (positive yaw velocity), hair swings left relative to head
    const inertiaFx = -headYawVel * headInfluence * mass * 2;
    const inertiaFz = -headPitchVel * headInfluence * mass * 2;

    // 5. Wind force
    let windFx = 0;
    let windFz = 0;
    if (windEnabled && this.config.windStrength > 0) {
      const { windStrength, windDirectionX, windDirectionZ, windTurbulence, windFrequency } = this.config;

      // Base oscillating wind
      const windPhase = this.time * windFrequency * Math.PI * 2;
      const windOscillation = Math.sin(windPhase);

      // Add turbulence (perpendicular to wind direction)
      const turbulencePhase = this.time * windFrequency * 3.7; // Different frequency for variation
      const turbulence = Math.sin(turbulencePhase) * windTurbulence;

      windFx = windStrength * windDirectionX * (0.5 + 0.5 * windOscillation) + turbulence * (-windDirectionZ);
      windFz = windStrength * windDirectionZ * (0.5 + 0.5 * windOscillation) + turbulence * windDirectionX;
    }

    // === Integration (Semi-implicit Euler) ===

    const totalFx = springFx + dampFx + inertiaFx + windFx;
    const totalFz = springFz + dampFz + gravityFz + inertiaFz + windFz;

    // Acceleration = Force / Mass
    const ax = totalFx / mass;
    const az = totalFz / mass;

    // Update velocity
    this.state.vx += ax * dt;
    this.state.vz += az * dt;

    // Clamp velocity to prevent instability
    const maxVel = 10;
    this.state.vx = Math.max(-maxVel, Math.min(maxVel, this.state.vx));
    this.state.vz = Math.max(-maxVel, Math.min(maxVel, this.state.vz));

    // Update position
    this.state.x += this.state.vx * dt;
    this.state.z += this.state.vz * dt;

    // Clamp position to valid range
    this.state.x = Math.max(-1, Math.min(1, this.state.x));
    this.state.z = Math.max(-1, Math.min(1, this.state.z));

    return this.computeMorphOutput();
  }

  /**
   * Convert physics state to morph target values
   * Maps pendulum position to left/right/front morphs for both sides
   */
  private computeMorphOutput(): HairMorphOutput {
    const { x, z } = this.state;

    // X axis: negative = swing left, positive = swing right
    // Z axis: negative = swing back, positive = swing forward

    // Left side of hair
    // When hair swings left (x < 0), L_Hair_Left increases
    // When hair swings right (x > 0), L_Hair_Right increases
    const L_Hair_Left = Math.max(0, -x);
    const L_Hair_Right = Math.max(0, x);
    const L_Hair_Front = Math.max(0, z);

    // Right side mirrors left side behavior
    // When hair swings left (x < 0), R_Hair_Left increases
    // When hair swings right (x > 0), R_Hair_Right increases
    const R_Hair_Left = Math.max(0, -x);
    const R_Hair_Right = Math.max(0, x);
    const R_Hair_Front = Math.max(0, z);

    return {
      L_Hair_Left,
      L_Hair_Right,
      L_Hair_Front,
      R_Hair_Left,
      R_Hair_Right,
      R_Hair_Front,
    };
  }

  /**
   * Get current physics state (for debugging/UI)
   */
  getState(): HairPhysicsState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<HairPhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): HairPhysicsConfig {
    return { ...this.config };
  }

  /**
   * Reset physics state to rest position
   */
  reset(): void {
    this.state = { x: 0, z: 0, vx: 0, vz: 0 };
    this.time = 0;
    this.prevHeadYaw = 0;
    this.prevHeadPitch = 0;
  }
}
