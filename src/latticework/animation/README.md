
# Animation Agency (Latticework)

Machine + Service only. No Controller. No separate transitions file.

* The `EngineThree` now exposes `transitionAU` and `transitionMorph` for smooth tweens using requestAnimationFrame.
* The animation service (stub) can call those directly when sampling keyframes.
* Keep ShapeDict data-only; do not place runtime logic there.

