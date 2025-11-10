import React, { useState } from 'react';

function CameraControls({ engine }) {
  // We'll track the camera's position + rotation in local state
  const [cameraPos, setCameraPos] = useState({
    x: 0,
    y: 1.5,
    z: -5,
    rx: 0,
    ry: 0,
    rz: 0
  });

  // Whenever a slider changes, we update our local state,
  // then immediately tell the engine to set the camera.
  const handleChange = (field, value) => {
    // Convert the value to float:
    const numericVal = parseFloat(value) || 0;
    const newState = { ...cameraPos, [field]: numericVal };

    setCameraPos(newState);
    // Now call setCameraPosition(x, y, z, rx, ry, rz):
    window.facslib.engine.setCameraPosition(
      newState.x, 
      newState.y,
      newState.z,
      newState.rx,
      newState.ry,
      newState.rz
    );
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
      <h2>Camera Controls</h2>

      <label>
        X:
        <input
          type="range"
          min="-10" max="10"
          step="0.1"
          value={cameraPos.x}
          onChange={(e) => handleChange('x', e.target.value)}
        />
        <span>{cameraPos.x.toFixed(2)}</span>
      </label>
      <br />

      <label>
        Y:
        <input
          type="range"
          min="-1" max="5"
          step="0.1"
          value={cameraPos.y}
          onChange={(e) => handleChange('y', e.target.value)}
        />
        <span>{cameraPos.y.toFixed(2)}</span>
      </label>
      <br />

      <label>
        Z:
        <input
          type="range"
          min="-20" max="1"
          step="0.1"
          value={cameraPos.z}
          onChange={(e) => handleChange('z', e.target.value)}
        />
        <span>{cameraPos.z.toFixed(2)}</span>
      </label>
      <br />

      <label>
        RX (pitch):
        <input
          type="range"
          min="-90" max="90"
          step="1"
          value={cameraPos.rx}
          onChange={(e) => handleChange('rx', e.target.value)}
        />
        <span>{cameraPos.rx.toFixed(2)}</span>
      </label>
      <br />

      <label>
        RY (yaw):
        <input
          type="range"
          min="-180" max="180"
          step="1"
          value={cameraPos.ry}
          onChange={(e) => handleChange('ry', e.target.value)}
        />
        <span>{cameraPos.ry.toFixed(2)}</span>
      </label>
      <br />

      <label>
        RZ (roll):
        <input
          type="range"
          min="-180" max="180"
          step="1"
          value={cameraPos.rz}
          onChange={(e) => handleChange('rz', e.target.value)}
        />
        <span>{cameraPos.rz.toFixed(2)}</span>
      </label>
    </div>
  );
}

export default CameraControls;