import React, { useMemo } from 'react';
import { VStack, Box, Text, Divider } from '@chakra-ui/react';
import DockableAccordionItem from './DockableAccordionItem';
import AUSlider from './AUSlider';
import ContinuumSlider from './ContinuumSlider';
import { AUInfo } from '../../engine/arkit/shapeDict';
import { EngineThree } from '../../engine/EngineThree';

interface AUSectionProps {
  section: string;
  aus: AUInfo[];
  auStates: Record<string, number>;
  engine?: EngineThree;
  showUnusedSliders?: boolean;
  onAUChange?: (id: string, value: number) => void;
}

/**
 * AUSection - Groups AUs into collapsible sections
 * Shows continuum sliders for paired AUs (based on continuumPair metadata)
 * Shows regular sliders for unpaired AUs
 * EngineThree automatically handles blendshape + bone logic
 */
export default function AUSection({
  section,
  aus,
  auStates,
  engine,
  showUnusedSliders = false,
  onAUChange
}: AUSectionProps) {
  // Group AUs into continuum pairs and singles
  const { continuumPairs, singleAUs } = useMemo(() => {
    const pairs: Array<{ negative: AUInfo; positive: AUInfo }> = [];
    const processed = new Set<string>();
    const singles: AUInfo[] = [];

    aus.forEach((au) => {
      if (processed.has(au.id)) return;

      if (au.continuumPair && au.continuumDirection) {
        const pairAU = aus.find(a => a.id === au.continuumPair);
        if (pairAU) {
          processed.add(au.id);
          processed.add(pairAU.id);

          if (au.continuumDirection === 'negative') {
            pairs.push({ negative: au, positive: pairAU });
          } else {
            pairs.push({ negative: pairAU, positive: au });
          }
        } else {
          singles.push(au);
        }
      } else {
        singles.push(au);
      }
    });

    return { continuumPairs: pairs, singleAUs: singles };
  }, [aus]);

  const hasContinuum = continuumPairs.length > 0;
  const hasSingles = singleAUs.length > 0;

  return (
    <DockableAccordionItem title={section}>
      <VStack spacing={4} mt={2} align="stretch">
        {/* Continuum sliders */}
        {hasContinuum && (
          <>
            {continuumPairs.map((pair) => {
              const negValue = auStates[pair.negative.id] ?? 0;
              const posValue = auStates[pair.positive.id] ?? 0;
              const continuumValue = posValue - negValue;

              // Determine which continuum helper to call based on AU IDs
              const isEyesHorizontal = pair.negative.id === '61' && pair.positive.id === '62';
              const isEyesVertical = pair.negative.id === '64' && pair.positive.id === '63';
              const isHeadHorizontal = pair.negative.id === '31' && pair.positive.id === '32';
              const isHeadVertical = pair.negative.id === '54' && pair.positive.id === '33';
              const isHeadTilt = pair.negative.id === '55' && pair.positive.id === '56';

              return (
                <Box key={`${pair.negative.id}-${pair.positive.id}`} w="100%">
                  <ContinuumSlider
                    negativeAU={pair.negative}
                    positiveAU={pair.positive}
                    value={continuumValue}
                    onChange={(val) => {
                      // Update local state
                      if (val >= 0) {
                        onAUChange?.(pair.positive.id, val);
                        onAUChange?.(pair.negative.id, 0);
                      } else {
                        onAUChange?.(pair.negative.id, -val);
                        onAUChange?.(pair.positive.id, 0);
                      }

                      // Call the appropriate EngineThree helper method
                      // These methods handle BOTH morphs AND bones automatically
                      if (isEyesHorizontal) {
                        engine?.setEyesHorizontal(val);
                      } else if (isEyesVertical) {
                        engine?.setEyesVertical(val);
                      } else if (isHeadHorizontal) {
                        engine?.setHeadHorizontal(val);
                      } else if (isHeadVertical) {
                        engine?.setHeadVertical(val);
                      } else if (isHeadTilt) {
                        engine?.setHeadTilt(val);
                      }
                    }}
                  />
                </Box>
              );
            })}
          </>
        )}

        {/* Divider between continuum and singles */}
        {hasContinuum && hasSingles && (
          <>
            <Divider />
            <Text fontSize="xs" fontWeight="semibold" opacity={0.7}>
              Individual Controls
            </Text>
          </>
        )}

        {/* Individual AU sliders */}
        {singleAUs.map((au) => {
          const intensity = auStates[au.id] ?? 0;

          // If hiding unused sliders, skip those still at zero
          if (!showUnusedSliders && intensity <= 0) return null;

          return (
            <Box key={au.id} w="100%">
              <AUSlider
                au={au.id}
                name={au.name}
                intensity={intensity}
                muscularBasis={au.muscularBasis}
                links={au.links}
                onChange={(val) => {
                  onAUChange?.(au.id, val);
                  engine?.setAU(au.id as any, val);
                }}
              />
            </Box>
          );
        })}
      </VStack>
    </DockableAccordionItem>
  );
}
