import React, { useEffect, useRef, useState } from 'react';
import { useContext } from 'react';
import { ThreeLoadContext } from '../threejs/threeContext';
import { EngineThree } from '../threejs/engineThree';
import { FacsLib } from '../unity/facs/facslib';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * CharacterGLBScene
 * - Plain Three.js loader: scene, camera, renderer, light, GLTFLoader, canvas mount.
 * - Exposes scene data via onEngineReady({ scene, rootMesh, animations }).
 */
const CharacterGLBScene = ({ modelPath, onEngineReady }) => {
  const threeCtx = useContext(ThreeLoadContext);
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let renderer, scene, camera, light, keyLight, fillLight, rimLight, controls, mixer, rootMesh, anims = [];
    let frameId;
    let disposed = false;
    let loaded = false;
    const width = (mountRef.current.clientWidth || window.innerWidth);
    const height = (mountRef.current.clientHeight || window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    // Set initial camera position a bit closer
    camera.position.set(0, 1.5, 2.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mountRef.current.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)';
    mountRef.current.appendChild(renderer.domElement);

    // Add a window resize handler
    const onResize = () => {
      const w = (mountRef.current?.clientWidth || window.innerWidth);
      const h = (mountRef.current?.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      controls && controls.update();
    };
    window.addEventListener('resize', onResize);

    // Ambient/hemisphere base
    light = new THREE.HemisphereLight(0xffffff, 0x404040, 0.4);
    scene.add(light);

    // Key/Fill/Rim lights for better definition
    keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(2.5, 3.5, 2.0);
    scene.add(keyLight);

    fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-3.0, 2.0, 2.0);
    scene.add(fillLight);

    rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0.0, 3.0, -3.0);
    scene.add(rimLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 0.6;
    controls.maxDistance = 6.0;

    const loader = new GLTFLoader();
    loader.setPath(modelPath.baseUrl);
    loader.load(
      modelPath.filename,
      (gltf) => {
        loaded = true;
        rootMesh = gltf.scene;
        scene.add(rootMesh);

        // ──────────────────────────────────────────────────────────────
        // DEBUG: Direct Three.js morph helpers (no FacsLib / no mapping)
        // Exposes window.morph.* for quick console testing
        //  - morph.list()                 -> list all morph names with mesh + index
        //  - morph.set(name, value)       -> set morph by name (0..100)
        //  - morph.get(name)              -> get current value (0..100)
        //  - morph.zero([prefix])         -> zero all (or those starting with prefix)
        //  - morph.setIndex(meshIdx, i, v)-> set by mesh/index (0..100)
        //  - morph.meshes()               -> list candidate meshes with morphs
        //  - morph.find(partial)          -> fuzzy find names containing substring
        // ──────────────────────────────────────────────────────────────
        const collectMorphMeshes = (node) => {
          const out = [];
          node.traverse((obj) => {
            if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
              out.push(obj);
            }
          });
          return out;
        };

        const morphMeshes = collectMorphMeshes(rootMesh);
        // pick the mesh with the most morphs as default face mesh
        let primaryMeshIndex = 0;
        morphMeshes.forEach((m, idx) => {
          if (m.morphTargetInfluences.length > morphMeshes[primaryMeshIndex].morphTargetInfluences.length) {
            primaryMeshIndex = idx;
          }
        });

        const clamp01 = (x) => Math.max(0, Math.min(1, x));
        const as01 = (v) => clamp01((v || 0) / 100);
        const as100 = (v) => Math.round((v || 0) * 100);

        const list = () => {
          const rows = [];
          morphMeshes.forEach((mesh, mIdx) => {
            const dict = mesh.morphTargetDictionary;
            Object.keys(dict).forEach((name) => {
              rows.push({ mesh: mIdx, index: dict[name], name });
            });
          });
          rows.sort((a,b)=> a.name.localeCompare(b.name));
          console.table(rows);
          return rows;
        };

        const find = (substr) => {
          const rows = [];
          const q = String(substr).toLowerCase();
          morphMeshes.forEach((mesh, mIdx) => {
            const dict = mesh.morphTargetDictionary;
            Object.keys(dict).forEach((name) => {
              if (name.toLowerCase().includes(q)) rows.push({ mesh: mIdx, index: dict[name], name });
            });
          });
          rows.sort((a,b)=> a.name.localeCompare(b.name));
          console.table(rows);
          return rows;
        };

        const setByName = (name, value01_100) => {
          let hits = 0;
          morphMeshes.forEach((mesh) => {
            const dict = mesh.morphTargetDictionary;
            const idx = dict[name];
            if (idx !== undefined) {
              mesh.morphTargetInfluences[idx] = as01(value01_100);
              hits++;
            }
          });
          if (!hits) console.warn('[morph.set] no morph named', name);
          return hits;
        };

        const getByName = (name) => {
          for (const mesh of morphMeshes) {
            const dict = mesh.morphTargetDictionary;
            const idx = dict[name];
            if (idx !== undefined) return as100(mesh.morphTargetInfluences[idx]);
          }
          console.warn('[morph.get] no morph named', name);
          return 0;
        };

        const setByIndex = (meshIndex, morphIndex, value01_100) => {
          const mesh = morphMeshes[meshIndex];
          if (!mesh) return console.warn('[morph.setIndex] bad mesh index', meshIndex);
          if (morphIndex < 0 || morphIndex >= mesh.morphTargetInfluences.length) {
            return console.warn('[morph.setIndex] bad morph index', morphIndex);
          }
          mesh.morphTargetInfluences[morphIndex] = as01(value01_100);
        };

        const zero = (prefix) => {
          morphMeshes.forEach((mesh) => {
            const names = Object.keys(mesh.morphTargetDictionary);
            names.forEach((n) => {
              if (!prefix || n.startsWith(prefix)) {
                const i = mesh.morphTargetDictionary[n];
                mesh.morphTargetInfluences[i] = 0;
              }
            });
          });
        };

        window.morph = {
          meshes: () => morphMeshes,
          list,
          find,
          set: setByName,
          get: getByName,
          setIndex: setByIndex,
          zero,
          // convenience: choose the primary face mesh
          use: (idx) => { if (morphMeshes[idx]) primaryMeshIndex = idx; return primaryMeshIndex; },
          primary: () => primaryMeshIndex,
        };
        console.log('[Three.js] morph helpers ready → window.morph.*');

        // Auto-frame model and set an initial, slightly closer, head-focused view
        const bbox = new THREE.Box3().setFromObject(rootMesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);

        // Aim toward face: bias focus upward by ~35% of model height
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitDistance = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360)));
        const targetDistance = Math.max(0.8, fitDistance * 0.8); // slightly closer than exact fit

        const headOffsetY = Math.max(size.y * 0.35, 0.2);
        const focus = center.clone().add(new THREE.Vector3(0, headOffsetY, 0));

        // Raise the camera a touch and position at target distance in front
        camera.position.set(focus.x, focus.y + 0.1 * maxDim, focus.z + targetDistance);
        camera.lookAt(focus);

        if (controls) {
          controls.target.copy(focus);
          controls.update();
        }

        anims = gltf.animations || [];
        if (anims.length > 0) {
          mixer = new THREE.AnimationMixer(rootMesh);
        }
        setLoading(false);
        // Build engine/facslib here so JSX controls when isLoaded flips
        const engineObj = new EngineThree({ scene, rootMesh, animations: anims });
        const facslibObj = new FacsLib(engineObj);
        engineObj.FacsLib = facslibObj;

        // Expose for console debugging
        window.engine = engineObj;
        window.facsLib = facslibObj;

        // Update React context: set engine + facslib + isLoaded
        if (threeCtx && typeof threeCtx.setThreeState === 'function') {
          console.log('[CharacterGLBScene] GLB loaded → setting isLoaded=true');
          threeCtx.setThreeState(prev => ({
            ...prev,
            engine: engineObj,
            facslib: facslibObj,
            isLoaded: true
          }));
        }

        if (onEngineReady) {
          try {
            onEngineReady({ scene, rootMesh, animations: anims });
          } catch (e) {
            console.warn('onEngineReady handler threw:', e);
          }
        }
        const animate = () => {
          if (disposed) return;
          frameId = requestAnimationFrame(animate);
          if (mixer) mixer.update(0.016);
          if (controls) controls.update();
          renderer.render(scene, camera);
        };
        animate();
      },
      undefined,
      (error) => {
        console.error('GLTF loading error:', error, 'URL:', modelPath.baseUrl + modelPath.filename);
      }
    );

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      if (!loaded && threeCtx && typeof threeCtx.setThreeState === 'function') {
        threeCtx.setThreeState(prev => ({ ...prev, isLoaded: false, engine: null, facslib: null }));
        console.log('[CharacterGLBScene] unmount before load → keep isLoaded=false');
      }
      if (frameId) cancelAnimationFrame(frameId);
      if (controls) controls.dispose();
      [keyLight, fillLight, rimLight].forEach(l => l && scene.remove(l));
      if (renderer && renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
    // eslint-disable-next-line
  }, [modelPath]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '100vh', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '1.5rem',
          fontFamily: 'monospace',
          textShadow: '0 0 10px rgba(255,255,255,0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div className="spinner" style={{
            width: '60px',
            height: '60px',
            border: '6px solid #ccc',
            borderTop: '6px solid #36f',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }} />
          Loading Character…
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CharacterGLBScene;