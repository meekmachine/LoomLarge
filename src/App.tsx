import React, { useCallback, useRef } from 'react';
import * as THREE from 'three';
import CharacterGLBScene from './scenes/CharacterGLBScene';
import AUQuickPanel from './components/au/AUQuickPanel';
import { AU_TO_MORPHS, ALIASES } from './engine/arkit/shapeDict';
import './styles.css';

export default function App() {
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const handleReady = useCallback(({ meshes }) => {
    meshesRef.current = meshes;
  }, []);

  const applyAU = useCallback((id: number, value: number) => {
    const keys = AU_TO_MORPHS[id] || [];
    if (!keys.length) return;
    const v = Math.max(0, Math.min(1, value));
    for (const m of meshesRef.current) {
      const name = (m.name || '').toLowerCase();
      if (name.includes('occlusion') || name.includes('tearline')) continue;
      // @ts-ignore
      const dict: Record<string, number> | undefined = m.morphTargetDictionary;
      // @ts-ignore
      const infl: number[] | undefined = m.morphTargetInfluences;
      if (!dict || !infl) continue;
      for (const k of keys) {
        let idx = dict[k];
        if (idx === undefined && ALIASES[k]) {
          for (const alt of ALIASES[k]) { if (dict[alt] !== undefined) { idx = dict[alt]; break; } }
        }
        if (idx !== undefined) infl[idx] = v;
      }
    }
  }, []);

  const setMorph = useCallback((key: string, value: number) => {
    const v = Math.max(0, Math.min(1, value));
    for (const m of meshesRef.current) {
      const name = (m.name || '').toLowerCase();
      if (name.includes('occlusion') || name.includes('tearline')) continue;
      // @ts-ignore
      const dict: Record<string, number> | undefined = m.morphTargetDictionary;
      // @ts-ignore
      const infl: number[] | undefined = m.morphTargetInfluences;
      if (!dict || !infl) continue;
      const idx = dict[key];
      if (idx !== undefined) infl[idx] = v;
    }
  }, []);

  return (
    <div className="fullscreen-scene">
      <CharacterGLBScene
        src="/characters/jonathan.glb"
        className="fullscreen-scene"
        cameraOverride={{ position: [1.851, 5.597, 6.365], target: [1.851, 5.597, -0.000] }}
        onReady={handleReady}
      />
      <AUQuickPanel applyAU={applyAU} setMorph={setMorph} />
    </div>
  );
}