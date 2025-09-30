import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CharacterReady = {
  scene: THREE.Scene;
  model: THREE.Object3D;
  meshes: THREE.Mesh[]; // meshes with morph targets (for facslib)
};

type CameraOverride = {
  position: [number, number, number];
  target: [number, number, number];
};

type Props = {
  src?: string;              // path to the .glb in /public
  autoRotate?: boolean;      // slow autorotate for idle viewing
  onReady?: (payload: CharacterReady) => void; // callback when model is loaded
  className?: string;        // optional class for the container div
  cameraOverride?: CameraOverride; // manually set camera for quick testing
};

export default function CharacterGLBScene({
  src = '/characters/jonathan.glb',
  autoRotate = false,
  onReady,
  className,
  cameraOverride,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    mount.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0c);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 3);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.7);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 7.5);
    dir.castShadow = true;
    scene.add(dir);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;

    // Load GLB
    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;
    let raf = 0;

    loader.load(
      src,
      gltf => {
        model = gltf.scene;
        scene.add(model);

        // Center & scale to a reasonable size
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        model.position.x += -center.x;
        model.position.y += -center.y;
        model.position.z += -center.z;

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const desiredMax = 1.6; // ~avatar height in scene units
        const scale = desiredMax / maxDim;
        model.scale.setScalar(scale);

        // Recompute after scale
        const box2 = new THREE.Box3().setFromObject(model);
        box2.getSize(size);

        if (cameraOverride) {
          const [px, py, pz] = cameraOverride.position;
          const [tx, ty, tz] = cameraOverride.target;
          camera.position.set(px, py, pz);
          controls.target.set(tx, ty, tz);
          controls.update();
        } else {
          // Head-focused framing: aim target ~35% up from model origin
          const targetY = size.y * 0.35;
          controls.target.set(0, targetY, 0);

          // Compute distance so ~60% of model height fills vertical FOV
          const fitHeight = size.y * 0.6;
          const fov = camera.fov * Math.PI / 180;
          const dist = (fitHeight / 2) / Math.tan(fov / 2) * 1.15; // small margin
          camera.position.set(0, targetY, dist);
          controls.update();
        }

        // Collect meshes that have morph targets
        const meshes: THREE.Mesh[] = [];
        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            if (Array.isArray(m.morphTargetInfluences) && m.morphTargetInfluences.length > 0) {
              meshes.push(m);
            }
          }
        });

        onReady?.({ scene, model, meshes });
      },
      undefined,
      (err) => {
        console.error(`Failed to load ${src}. Place your GLB under public/`, err);
      }
    );

    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      if (autoRotate && model) model.rotation.y += 0.2 * dt;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (model) scene.remove(model);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [src, autoRotate, onReady, cameraOverride]);

  return <div ref={mountRef} className={className} />;
}