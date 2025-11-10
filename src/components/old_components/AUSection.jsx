

import React from 'react';
import { VStack, Box, Text, Select } from '@chakra-ui/react';
import DockableAccordionItem from './DockableAccordionItem';
import AUSlider from './AUSlider';
import AUCurveEditor from './AUCurveEditor';

export default function AUSection({
  section,
  aus,
  useCurveEditor,
  drawerControls,
  auStates,
  animationService,
  currentTime,
  setAuStates
}) {
  return (
    <DockableAccordionItem title={section}>
      {useCurveEditor ? (
        aus.map((au) => {
          const snippetsWithAU = (animationService.getState().context.animations || [])
            .filter(sn => sn.curves && sn.curves[au.id]);
          if (snippetsWithAU.length === 0) {
            if (!drawerControls.showUnusedSliders) return null;
            // Show dropdown of loaded snippets and AU id/name in playback mode
            const snippets = animationService.getState().context.animations || [];
            return (
              <Box key={au.id} w="100%" mb={4}>
                <Text fontSize="sm" mb={1}>
                  {`${au.id} - ${au.name}`} (no animation loaded)
                </Text>
                <Select
                  placeholder="Add animation to snippet…"
                  size="sm"
                  onChange={(e) => {
                    const snippetName = e.target.value;
                    // seed a single keyframe at current time & AU intensity
                    const initIntensity = auStates[au.id]?.intensity || 0;
                    const defaultKF = [{
                      id: crypto.randomUUID(),
                      time: currentTime,
                      intensity: initIntensity
                    }];
                    animationService.setAUCurve(snippetName, au.id, defaultKF);
                  }}
                >
                  {snippets.map((sn) => (
                    <option key={sn.name} value={sn.name}>
                      {sn.name}
                    </option>
                  ))}
                </Select>
              </Box>
            );
          }
          return snippetsWithAU.map(sn => (
            <Box key={`${sn.name}-${au.id}`} w="100%" mb={4}>
              <AUCurveEditor
                au={au.id}
                name={`${sn.name} • ${au.name}`}
                initialKeyframes={sn.curves[au.id]}
                maxTime={sn.maxTime}
                timeIndicator={sn.currentTime}
                onChange={(updated) => {
                  animationService.setAUCurve(sn.name, au.id, updated);
                }}
              />
            </Box>
          ));
        })
      ) : (
        <VStack spacing={4} mt={2}>
          {aus.map((au) => {
            // Treat missing state as zero intensity so unused can be shown
            const st = auStates[au.id] || { intensity: 0, notes: '' };
            // If hiding unused sliders, skip those still at zero
            if (!drawerControls.showUnusedSliders && st.intensity <= 0) return null;
            return (
              <Box key={au.id} w="100%">
                <AUSlider
                  au={au.id}
                  name={au.name}
                  intensity={st.intensity}
                  notes={st.notes}
                  muscularBasis={au.muscularBasis}
                  links={au.links}
                  onChange={(val, note) => {
                    // Immediate one‑shot update via animationService
                    animationService?.setTargetAU(au.id, val, 0);
                    // Update local UI state
                    setAuStates(prev => ({
                      ...prev,
                      [au.id]: {
                        ...prev[au.id],
                        intensity: val,
                        notes: note
                      }
                    }));
                  }}
                />
              </Box>
            );
          })}
        </VStack>
      )}
    </DockableAccordionItem>
  );
}