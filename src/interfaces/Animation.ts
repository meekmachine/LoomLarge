/**
 * Animation System Interface
 *
 * Defines the contract for transition/animation systems.
 * Implementations can use different interpolation strategies.
 */

import type { TransitionHandle } from '../core/types';

/**
 * Animation system that manages value transitions over time.
 */
export interface Animation {
  /**
   * Update all active transitions by delta time.
   * @param dtSeconds - Time elapsed since last tick in seconds
   */
  tick(dtSeconds: number): void;

  /**
   * Add or replace a transition for the given key.
   * If a transition with the same key exists, it should be cancelled and replaced.
   *
   * @param key - Unique identifier for this transition
   * @param from - Starting value
   * @param to - Target value
   * @param durationMs - Duration in milliseconds
   * @param apply - Callback to apply the interpolated value
   * @param easing - Optional easing function (default: ease-in-out)
   * @returns TransitionHandle for control
   */
  addTransition(
    key: string,
    from: number,
    to: number,
    durationMs: number,
    apply: (value: number) => void,
    easing?: (t: number) => number
  ): TransitionHandle;

  /**
   * Clear all active transitions.
   */
  clearTransitions(): void;

  /**
   * Get count of active transitions.
   */
  getActiveTransitionCount(): number;
}
