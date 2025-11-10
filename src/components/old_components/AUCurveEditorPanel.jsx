// AUCurveEditorPanel.jsx
import React, { useEffect, useState } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import AUCurveEditor from './AUCurveEditor';
import { createAnimationService } from '../VISOS/action/visualizers/animation/animationService';

const animationService = createAnimationService();

export default function AUCurveEditorPanel() {
  const [animations, setAnimations] = useState([]);

  useEffect(() => {
    const unsub = animationService.onTransition((state) => {
      if (state.changed) {
        setAnimations([...state.context.animations]);
      }
    });

    // initial load
    setAnimations(animationService.getState().context.animations);

    return () => {
      unsub?.();
    };
  }, []);

  function handleAUCurveChange(snippetName, auId, updatedCurve) {
    console.log(`[Editor] Set new curve for ${snippetName} → ${auId}`);
    animationService.setAUCurve(auId, updatedCurve);
  }

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>
        AU Curve Editors (Loaded Animations)
      </Heading>

      {animations.map((snippet) => (
        <Box key={snippet.name} mb={6}>
          <Heading size="sm" mb={2}>{snippet.name}</Heading>

          {Object.entries(snippet.curves || {}).map(([auId, keyframes]) => (
            <AUCurveEditor
              key={`${snippet.name}-${auId}`}
              au={auId}
              name={`${snippet.name} • ${auId}`}
              initialKeyframes={keyframes}
              maxTime={snippet.maxTime}
              timeIndicator={snippet.currentTime}
              onChange={(updated) => {
                handleAUCurveChange(snippet.name, auId, updated);
              }}
              onImmediateAUChange={(auId, intensity) => {
                // Optional: live preview
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}