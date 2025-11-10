import React, { useState, useMemo } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  Box,
  IconButton,
  Accordion,
  Button,
  HStack,
  Switch,
  Text
} from '@chakra-ui/react';
import { FaBars } from 'react-icons/fa';
import { AU_INFO, AUInfo } from '../engine/arkit/shapeDict';
import AUSection from './au/AUSection';
import DockableAccordionItem from './au/DockableAccordionItem';
import PlaybackControls from './PlaybackControls';
import { useThreeState } from '../context/threeContext';

interface SliderDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SliderDrawer({ isOpen, onToggle }: SliderDrawerProps) {
  const { engine } = useThreeState();

  // Track AU intensities in local state for UI
  const [auStates, setAuStates] = useState<Record<string, number>>({});
  const [showUnusedSliders, setShowUnusedSliders] = useState(false);
  const [segmentationMode, setSegmentationMode] = useState<'facePart' | 'faceArea'>('facePart');

  // Convert AU_INFO to array
  const actionUnits = useMemo(() => {
    return Object.values(AU_INFO);
  }, []);

  // Group AUs by facePart or faceArea
  const auGroups = useMemo(() => {
    const groups: Record<string, AUInfo[]> = {};
    actionUnits.forEach((au) => {
      const key = segmentationMode === 'facePart'
        ? (au.facePart || 'Other')
        : (au.faceArea || 'Other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(au);
    });
    return groups;
  }, [actionUnits, segmentationMode]);

  // Filter sections to hide empty ones when showUnusedSliders is false
  const filteredSections = useMemo(() => {
    const entries = Object.entries(auGroups);
    if (showUnusedSliders) return entries;
    return entries.filter(([_, aus]) => {
      // Check if any AU in this section has a value > 0
      const hasActiveAU = aus.some(au => (auStates[au.id] ?? 0) > 0);
      // Check if any AU in this section is part of a continuum pair
      const hasContinuumPairs = aus.some(au => au.continuumPair);
      // Show section if it has active AUs OR has continuum controls
      return hasActiveAU || hasContinuumPairs;
    });
  }, [auGroups, auStates, showUnusedSliders]);

  // Reset face to neutral
  const setFaceToNeutral = () => {
    // Zero out all AUs in engine
    Object.keys(AU_INFO).forEach(id => {
      engine?.setAU(id as any, 0);
    });
    // Clear local state
    setAuStates({});
  };

  // Handle AU changes
  const handleAUChange = (id: string, value: number) => {
    setAuStates(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <IconButton
        icon={<FaBars />}
        onClick={onToggle}
        position="fixed"
        top="1rem"
        left="1rem"
        zIndex="overlay"
        colorScheme="teal"
        aria-label="Menu"
      />

      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onToggle}
        size="md"
      >
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            Action Units
          </DrawerHeader>

          {/* Controls Panel */}
          <Box p={4} borderBottomWidth="1px">
            <VStack spacing={3} align="stretch">
              <Button size="sm" onClick={setFaceToNeutral} colorScheme="red">
                Reset to Neutral
              </Button>

              <HStack justify="space-between">
                <Text fontSize="sm">Show unused sliders</Text>
                <Switch
                  isChecked={showUnusedSliders}
                  onChange={(e) => setShowUnusedSliders(e.target.checked)}
                  size="sm"
                />
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm">Group by</Text>
                <Button
                  size="xs"
                  onClick={() => setSegmentationMode(prev =>
                    prev === 'facePart' ? 'faceArea' : 'facePart'
                  )}
                >
                  {segmentationMode === 'facePart' ? 'Face Part' : 'Face Area'}
                </Button>
              </HStack>
            </VStack>
          </Box>

          <DrawerBody>
            <Accordion allowMultiple>
              {/* Playback Controls Section */}
              <DockableAccordionItem title="Playback Controls">
                <PlaybackControls />
              </DockableAccordionItem>

              {/* AU Sections (includes continuum controls for Eyes and Head) */}
              {filteredSections.map(([section, aus]) => (
                <AUSection
                  key={section}
                  section={section}
                  aus={aus}
                  auStates={auStates}
                  engine={engine}
                  showUnusedSliders={showUnusedSliders}
                  onAUChange={handleAUChange}
                />
              ))}
            </Accordion>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
