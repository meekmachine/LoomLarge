/**
 * Hair Physics using Spring-Damper simulation
 *
 * Simulates hair as a pendulum attached to the head using
 * a simple but effective spring-damper physics model.
 * The pendulum's position is mapped to morph target values.
 */

interface HairPhysicsConfig {
  mass: number;           // Hair mass (affects inertia)
  damping: number;        // Linear damping (air resistance)
  stiffness: number;      // Spring stiffness pulling back to center
  gravity: number;        // Gravity strength
  headInfluence: number;  // How much head movement affects hair
  // Wind parameters
  windStrength: number;   // Wind force strength (0-20)
  windDirectionX: number; // Wind direction X component (-1 to 1)
  windDirectionZ: number; // Wind direction Z component (-1 to 1)
  windTurbulence: number; // Random turbulence amount (0-1)
  windFrequency: number;  // Turbulence oscillation speed (0.5-5)
}

interface PendulumState {
  x: number;  // Left/right offset (-1 to 1)
  z: number;  // Front/back offset (-1 to 1)
}

export class HairPhysicsAmmo {
  private physicsReady = false;

  // Pendulum state (position and velocity)
  private posX = 0;
  private posZ = 0;
  private velX = 0;
  private velZ = 0;

  private config: HairPhysicsConfig = {
    mass: 1.0,
    damping: 0.3,
    stiffness: 5.0,
    gravity: 9.8,
    headInfluence: 2.0,
    // Wind defaults (disabled)
    windStrength: 0,
    windDirectionX: 1.0,  // Default: wind from left
    windDirectionZ: 0,
    windTurbulence: 0.3,
    windFrequency: 2.0,
  };

  // Time accumulator for wind turbulence
  private windTime = 0;

  private lastHeadYaw = 0;
  private lastHeadPitch = 0;
  private onUpdate: ((state: PendulumState) => void) | null = null;

  constructor() {
    // Spring-damper simulation is ready immediately
    this.physicsReady = true;
    console.log('[HairPhysics] Spring-damper physics initialized');
  }

  /**
   * Update physics simulation using spring-damper model
   * @param dt Delta time in seconds
   * @param headYaw Head horizontal rotation (-1 to 1)
   * @param headPitch Head vertical rotation (-1 to 1)
   */
  // Debug frame counter
  private frameCount = 0;

  update(dt: number, headYaw: number, headPitch: number) {
    if (!this.physicsReady) return;

    this.frameCount++;

    // Clamp dt to avoid instability
    dt = Math.min(dt, 0.05);

    // Calculate head velocity (acceleration)
    const headYawVelocity = (headYaw - this.lastHeadYaw) / Math.max(dt, 0.001);
    const headPitchVelocity = (headPitch - this.lastHeadPitch) / Math.max(dt, 0.001);

    // Debug logging every ~60 frames
    if (this.frameCount % 60 === 0) {
      console.log(`[HairPhysics] head: yaw=${headYaw.toFixed(3)} pitch=${headPitch.toFixed(3)} | vel: ${headYawVelocity.toFixed(2)}, ${headPitchVelocity.toFixed(2)}`);
    }

    this.lastHeadYaw = headYaw;
    this.lastHeadPitch = headPitch;

    // Forces on the pendulum:

    // 1. Inertia force from head VELOCITY (hair lags behind rapid movements)
    // When head accelerates right, hair feels force to the left
    const inertiaForceX = -headYawVelocity * this.config.headInfluence * 0.3;
    const inertiaForceZ = -headPitchVelocity * this.config.headInfluence * 0.3;

    // 2. Gravity-like force from head POSITION (hair hangs due to gravity)
    // When head is turned right (positive yaw), gravity pulls hair left relative to head
    // When head is tilted down (positive pitch), hair falls forward
    const gravityFromYaw = -headYaw * this.config.gravity * 0.1;  // Hair hangs opposite to head tilt
    const gravityFromPitch = headPitch * this.config.gravity * 0.15; // Hair falls forward when looking down

    // 3. Spring force pulling back to center (restoring force - hair elasticity)
    const springForceX = -this.posX * this.config.stiffness;
    const springForceZ = -this.posZ * this.config.stiffness;

    // 4. Damping force (air resistance, proportional to velocity)
    const dampingForceX = -this.velX * this.config.damping * 10;
    const dampingForceZ = -this.velZ * this.config.damping * 10;

    // 5. Wind force - creates waving motion by oscillating the force direction
    this.windTime += dt;
    let windForceX = 0;
    let windForceZ = 0;
    if (this.config.windStrength > 0) {
      // Primary wave oscillation - this is what makes hair wave back and forth
      // The wind direction modulates between positive and negative
      const primaryWave = Math.sin(this.windTime * this.config.windFrequency);

      // Secondary waves for more natural, less mechanical motion
      const secondaryWave = Math.sin(this.windTime * this.config.windFrequency * 1.7) * 0.3;
      const tertiaryWave = Math.sin(this.windTime * this.config.windFrequency * 0.6) * 0.2;

      // Combined wave creates the main oscillation (-1 to 1 range)
      const waveStrength = primaryWave + secondaryWave + tertiaryWave;

      // Apply wave along the wind direction axis
      // This makes the hair swing back and forth IN the wind direction
      const waveX = this.config.windDirectionX * waveStrength * this.config.windStrength;
      const waveZ = this.config.windDirectionZ * waveStrength * this.config.windStrength;

      // Add turbulence as random cross-wind gusts (perpendicular to main wind)
      const turbulencePhase = this.windTime * this.config.windFrequency * 2.3;
      const crossWindX = -this.config.windDirectionZ * Math.sin(turbulencePhase) * this.config.windTurbulence * this.config.windStrength * 0.5;
      const crossWindZ = this.config.windDirectionX * Math.cos(turbulencePhase * 1.3) * this.config.windTurbulence * this.config.windStrength * 0.5;

      windForceX = waveX + crossWindX;
      windForceZ = waveZ + crossWindZ;
    }

    // Total acceleration (F = ma, so a = F/m)
    const accelX = (inertiaForceX + gravityFromYaw + springForceX + dampingForceX + windForceX) / this.config.mass;
    const accelZ = (inertiaForceZ + gravityFromPitch + springForceZ + dampingForceZ + windForceZ) / this.config.mass;

    // Update velocity (v = v0 + a*dt)
    this.velX += accelX * dt;
    this.velZ += accelZ * dt;

    // Update position (x = x0 + v*dt)
    this.posX += this.velX * dt;
    this.posZ += this.velZ * dt;

    // Clamp position to reasonable bounds
    this.posX = Math.max(-1, Math.min(1, this.posX));
    this.posZ = Math.max(-1, Math.min(1, this.posZ));

    // Create state output
    const state: PendulumState = {
      x: this.posX,
      z: this.posZ
    };

    // Notify listener
    if (this.onUpdate) {
      this.onUpdate(state);
    }
  }

  /**
   * Set callback for physics updates
   */
  setOnUpdate(callback: (state: PendulumState) => void) {
    this.onUpdate = callback;
  }

  /**
   * Update physics configuration
   */
  setConfig(config: Partial<HairPhysicsConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): HairPhysicsConfig {
    return { ...this.config };
  }

  /**
   * Check if physics is ready
   */
  isReady(): boolean {
    return this.physicsReady;
  }

  /**
   * Reset pendulum to rest position
   */
  reset() {
    this.posX = 0;
    this.posZ = 0;
    this.velX = 0;
    this.velZ = 0;
    this.lastHeadYaw = 0;
    this.lastHeadPitch = 0;
    this.windTime = 0;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.physicsReady = false;
    this.onUpdate = null;
  }
}
