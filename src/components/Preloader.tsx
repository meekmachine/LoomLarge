import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box } from '@chakra-ui/react';

type PreloaderProps = {
  text?: string;
  progress?: number;
  show?: boolean;
  skyboxUrl?: string;
};

const Preloader: React.FC<PreloaderProps> = ({
  text = 'Loading...',
  show = true,
  skyboxUrl
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skyboxMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!show || !mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Load skybox
    if (skyboxUrl) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(skyboxUrl, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        const skyboxGeometry = new THREE.SphereGeometry(500, 60, 40);
        skyboxGeometry.scale(-1, 1, 1);

        const skyboxMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
        });

        const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        scene.add(skyboxMesh);
        skyboxMeshRef.current = skyboxMesh;
      });
    }

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      if (!show) return;
      animationFrameRef.current = requestAnimationFrame(animate);

      // Spin skybox
      if (skyboxMeshRef.current) {
        skyboxMeshRef.current.rotation.y += 0.002;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      if (skyboxMeshRef.current) {
        skyboxMeshRef.current.geometry.dispose();
        (skyboxMeshRef.current.material as THREE.Material).dispose();
      }

      rendererRef.current?.dispose();
    };
  }, [show, skyboxUrl]);

  if (!show) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100vw"
      height="100vh"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <Box
        position="relative"
        zIndex={1001}
        fontSize="3xl"
        fontWeight="bold"
        color="white"
        textShadow="0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5)"
        fontFamily="Arial, sans-serif"
        letterSpacing="wider"
      >
        {text}
      </Box>
    </Box>
  );
};

export default Preloader;
