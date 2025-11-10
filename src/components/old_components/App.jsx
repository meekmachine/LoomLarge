// src/components/App.jsx
import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

import { useUnityState } from '../unityMiddleware';
import { useThreeState } from '../hooks/useThreeState';
import SliderDrawer from './SliderDrawer';
import ModulesMenu from './ModulesMenu';
import MenuWrapper from './MenuWrapper';
import SceneSelector from './SceneSelector';

import { createAnimationService } from '../VISOS/action/visualizers/animation/animationService';
import { ActionUnitsList, VisemesList, getAvailableAUIds } from '../unity/facs/shapeDict';

function App() {
  const isThree = true;
  const unityState = useUnityState();
  const threeState = useThreeState();
  const selectedState = isThree ? threeState : unityState;
  console.log('[App] selectedState:', selectedState);
  const engine = selectedState?.engine ?? null;
  const facsLib = selectedState?.facslib ?? null;
  window.facslib = facsLib;
  const isLoaded = !!selectedState?.isLoaded;

  /* ──────────────────────────
     1 ) Local UI state objects
     ────────────────────────── */
  const [auStates, setAuStates] = useState(() =>
    ActionUnitsList.reduce((acc, au) => {
      acc[au.id] = { intensity: 0, notes: '', keyframes: [] };
      return acc;
    }, {})
  );

  const [visemeStates, setVisemeStates] = useState(() =>
    VisemesList.reduce((acc, v) => {
      acc[v.id] = { intensity: 0, notes: '', keyframes: [] };
      return acc;
    }, {})
  );

  const [drawerControls, setDrawerControls] = useState({
    isOpen: false,
    showUnusedSliders: false,
    cameraEnabled: false,
    useTimeBased: false
  });

  /* ──────────────────────────
     2 ) Animation-service init
     ────────────────────────── */
  const [animationService, setAnimationService] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    if (isLoaded && engine && facsLib && !setupComplete) {
      const animSvc = createAnimationService({ engine, facsLib });
      setAnimationService(animSvc);
      setSetupComplete(true);
    }
  }, [isLoaded, engine, facsLib, setupComplete]);

  /* ──────────────────────────
     3 ) Subscribe to animation-service
     ────────────────────────── */
  useEffect(() => {
    if (!animationService) return;

    const unsub = animationService.onTransition((state) => {
      if (!state.changed) return;

      const { curves, visemeCurves } = state.context;

      // A) Merge AU curves into local state (key-frame editing view)
      if (curves) {
        const fresh = ActionUnitsList.reduce((acc, au) => {
          acc[au.id] = { intensity: 0, notes: '', keyframes: [] };
          return acc;
        }, {});
        for (const [auId, frames] of Object.entries(curves)) {
          fresh[auId] = {
            intensity: 0,
            notes: '',
            keyframes: frames
          };
        }
        setAuStates(fresh);
      }

      // B) Merge viseme curves
      if (visemeCurves) {
        const fresh = VisemesList.reduce((acc, v) => {
          acc[v.id] = { intensity: 0, notes: '', keyframes: [] };
          return acc;
        }, {});
        for (const [vId, frames] of Object.entries(visemeCurves)) {
          fresh[vId] = {
            intensity: 0,
            notes: '',
            keyframes: frames
          };
        }
        setVisemeStates(fresh);
      }
    });

    return () => unsub?.();
  }, [animationService]);

  /* ──────────────────────────
     4 ) React to rig-swap events
     ────────────────────────── */
  useEffect(() => {
    if (!setupComplete) return;

    function handleModeChange() {
      // Reset AU state to the subset supported by the new rig
      setAuStates(() => {
        const fresh = {};
        for (const au of ActionUnitsList) {
          if (getAvailableAUIds().has(au.id)) {
            fresh[au.id] = { intensity: 0, notes: '', keyframes: [] };
          }
        }
        return fresh;
      });

      // Visemes remain the same set; just zero them
      setVisemeStates(() =>
        VisemesList.reduce((acc, v) => {
          acc[v.id] = { intensity: 0, notes: '', keyframes: [] };
          return acc;
        }, {})
      );
    }

    document.addEventListener('blendshapeModeChanged', handleModeChange);
    return () => document.removeEventListener('blendshapeModeChanged', handleModeChange);
  }, [setupComplete]);

  /* ──────────────────────────
     5 ) Render
     ────────────────────────── */
  return (
    <Box className="App" position="relative" w="100%" h="100%">
      {!isLoaded && (
        <p>
          Loading {isThree ? 'GLB character' : 'Unity'}…
          <br />
          <small>engineMode={String(isThree ? 'three' : 'unity')}, ctxLoaded={String(selectedState?.isLoaded)}</small>
        </p>
      )}

      {isLoaded && setupComplete && animationService && (
        <>
          <Box
            position="absolute"
            top="1rem"
            left="1rem"
            display="flex"
            alignItems="center"
            zIndex={999}
          >
            {/* ① Slider-drawer */}
            <SliderDrawer
              auStates={auStates}
              setAuStates={setAuStates}
              visemeStates={visemeStates}
              setVisemeStates={setVisemeStates}
              animationService={animationService}
              drawerControls={drawerControls}
              setDrawerControls={setDrawerControls}
            />

            {/* ② Scene-selector wrapped in menu */}
            <Box ml={2}>
              <MenuWrapper>
                <SceneSelector facsLib={window.facsLib} />
              </MenuWrapper>
            </Box>
          </Box>

          {/* ③ Additional module menus */}
          <ModulesMenu />
        </>
      )}
    </Box>
  );
}

export default App;