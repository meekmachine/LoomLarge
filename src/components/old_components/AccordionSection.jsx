// AUAccordionSection.js

import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import DockableAccordionItem from './DockableAccordionItem';
import AUSlider from './AUSlider';
import AUCurveEditor from './AUCurveEditor';

export default function AUAccordionSection({
  section,
  aus,
  auStates,
  setAuStates,
  facsService,
  drawerControls,
  animationService,
  maxTime,
  currentTime
}) {
  return (
    <DockableAccordionItem key={section} title={section}>
      <VStack spacing={4} mt={2}>
        {aus.map(au => {
          const st = auStates[au.id];
          if (!st) return null;
          if (!drawerControls.showUnusedSliders && st.intensity <= 0) return null;

          return (
            <Box key={au.id} w="100%">
              {drawerControls.useTimeBased ? (
                <AUCurveEditor
                  au={au.id}
                  name={au.name}
                  initialKeyframes={st.keyframes || []}
                  notes={st.notes || ''}
                  maxTime={maxTime}
                  timeIndicator={currentTime}
                  onImmediateAUChange={(id, val) => {
                    facsService.send({
                      type: 'SET_AU',
                      auId: id,
                      intensity: val
                    });
                  }}
                  onChange={(newKFs) => {
                    setAuStates(prev => ({
                      ...prev,
                      [au.id]: {
                        ...prev[au.id],
                        keyframes: newKFs
                      }
                    }));
                    animationService?.setAUCurve(au.id, newKFs);
                  }}
                />
              ) : (
                <AUSlider
                  au={au.id}
                  name={au.name}
                  intensity={st.intensity}
                  notes={st.notes}
                  muscularBasis={au.muscularBasis}
                  links={au.links}
                  onChange={(val, note) => {
                    facsService.send({
                      type: 'SET_AU',
                      auId: au.id,
                      intensity: val,
                      notes: note
                    });
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
              )}
            </Box>
          );
        })}
      </VStack>
    </DockableAccordionItem>
  );
}