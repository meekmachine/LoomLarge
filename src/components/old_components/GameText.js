import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { WebGLRenderer } from 'three';
import { Box } from '@chakra-ui/react';

// Global WebGL renderer to prevent multiple contexts
let globalRenderer = null;

const GameText = ({ text }) => {
  const mountRef = useRef(null);
  const textMeshRef = useRef(null);

  useEffect(() => {
    let scene, camera, textMesh;

    // Initialize Three.js scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Reuse or create the global WebGL renderer
    if (!globalRenderer) {
      globalRenderer = new WebGLRenderer({ alpha: true });
      globalRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    mountRef.current.appendChild(globalRenderer.domElement);

    const loader = new FontLoader();
    loader.load(`${process.env.PUBLIC_URL}/fonts/PressStart.json`, function (font) {
      const geometry = new TextGeometry(text || 'Loading...', {
        font: font,
        size: 0.33,
        height: 0.2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelSegments: 5,
      });

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0, // Start fully visible
      });

      textMesh = new THREE.Mesh(geometry, material);
      textMesh.geometry.center();
      scene.add(textMesh);

      textMeshRef.current = textMesh; // Save reference for animation

      // Animation loop: Apply rotation and fade-out
      const animate = () => {
        requestAnimationFrame(animate);
        if (textMeshRef.current) {
          globalRenderer.render(scene, camera);
        }
      };

      animate();
    });

    return () => {
      // Cleanup: Remove renderer DOM element and dispose of objects
      if (mountRef.current && globalRenderer.domElement) {
        mountRef.current.removeChild(globalRenderer.domElement);
      }
      if (textMesh) {
        textMesh.geometry.dispose();
        textMesh.material.dispose();
      }
    };
  }, [text]); // Re-run when the text prop changes

  return (
    <Box
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1, // Ensure GameText doesn't block other elements
        pointerEvents: 'none', // Allow interaction with underlying elements (e.g., the module menu)
        textAlign: 'center',
        color: '#ffffff',  // White text color
        fontSize: '48px',  // Customize font size
        fontWeight: 'bold',
        textShadow: '0 0 15px rgba(255, 255, 255, 0.8)',  // Outer glow effect
        filter: 'blur(1px)',  // Slight blur effect
      }}
    />
  );
};

export default GameText;