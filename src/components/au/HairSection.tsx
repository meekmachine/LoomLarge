import React, { useEffect, useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Box,
  Input,
  Switch,
  Button,
} from '@chakra-ui/react';
import { HairService } from '../../latticework/hair/hairService';
import { HairState, HAIR_COLOR_PRESETS } from '../../latticework/hair/types';
import DockableAccordionItem from './DockableAccordionItem';

interface HairSectionProps {
  hairService: HairService | null;
  disabled?: boolean;
}

export default function HairSection({ hairService, disabled = false }: HairSectionProps) {
  const [state, setState] = useState<HairState | null>(null);

  useEffect(() => {
    if (!hairService) return;

    // Get initial state
    setState(hairService.getState());

    // Subscribe to updates
    const unsubscribe = hairService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [hairService]);

  if (!hairService || !state) {
    return (
      <DockableAccordionItem title="Hair & Eyebrows">
        <Box p={2}>
          <Text fontSize="sm" color="gray.400">
            No hair service available
          </Text>
        </Box>
      </DockableAccordionItem>
    );
  }

  // Hair controls
  const handleHairPresetChange = (colorKey: string) => {
    const color = HAIR_COLOR_PRESETS[colorKey];
    if (color) {
      hairService.send({ type: 'SET_HAIR_COLOR', color });
    }
  };

  const handleHairBaseColorChange = (baseColor: string) => {
    hairService.send({ type: 'SET_HAIR_BASE_COLOR', baseColor });
  };

  const handleHairGlowColorChange = (emissive: string) => {
    hairService.send({
      type: 'SET_HAIR_GLOW',
      emissive,
      intensity: state.hairColor.emissiveIntensity,
    });
  };

  const handleHairGlowIntensityChange = (intensity: number) => {
    hairService.send({
      type: 'SET_HAIR_GLOW',
      emissive: state.hairColor.emissive,
      intensity,
    });
  };

  // Eyebrow controls
  const handleEyebrowPresetChange = (colorKey: string) => {
    const color = HAIR_COLOR_PRESETS[colorKey];
    if (color) {
      hairService.send({ type: 'SET_EYEBROW_COLOR', color });
    }
  };

  const handleEyebrowBaseColorChange = (baseColor: string) => {
    hairService.send({ type: 'SET_EYEBROW_BASE_COLOR', baseColor });
  };

  const handleEyebrowGlowColorChange = (emissive: string) => {
    hairService.send({
      type: 'SET_EYEBROW_GLOW',
      emissive,
      intensity: state.eyebrowColor.emissiveIntensity,
    });
  };

  const handleEyebrowGlowIntensityChange = (intensity: number) => {
    hairService.send({
      type: 'SET_EYEBROW_GLOW',
      emissive: state.eyebrowColor.emissive,
      intensity,
    });
  };

  // Outline controls
  const handleOutlineToggle = (checked: boolean) => {
    hairService.send({
      type: 'SET_OUTLINE',
      show: checked,
    });
  };

  const handleOutlineColorChange = (color: string) => {
    hairService.send({
      type: 'SET_OUTLINE',
      show: state.showOutline,
      color,
    });
  };

  const handleOutlineOpacityChange = (opacity: number) => {
    hairService.send({
      type: 'SET_OUTLINE',
      show: state.showOutline,
      opacity,
    });
  };

  const handlePartVisibilityToggle = (partName: string, visible: boolean) => {
    hairService.send({
      type: 'SET_PART_VISIBILITY',
      partName,
      visible,
    });
  };

  const handleReset = () => {
    hairService.send({ type: 'RESET_TO_DEFAULT' });
  };

  const colorPresetKeys = Object.keys(HAIR_COLOR_PRESETS);

  return (
    <DockableAccordionItem title="Hair & Eyebrows">
      <VStack spacing={4} align="stretch" p={2}>
        {/* HAIR SECTION */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="brand.300" mb={2}>
            HAIR
          </Text>

          {/* Hair Preset */}
          <VStack align="stretch" spacing={2} mb={3}>
            <Text fontSize="xs" color="gray.50">Preset</Text>
            <Select
              size="sm"
              value=""
              onChange={(e) => handleHairPresetChange(e.target.value)}
              isDisabled={disabled}
            >
              <option value="">Select Preset...</option>
              {colorPresetKeys.map((key) => (
                <option key={key} value={key}>
                  {HAIR_COLOR_PRESETS[key].name}
                </option>
              ))}
            </Select>
          </VStack>

          {/* Hair Base Color */}
          <VStack align="stretch" spacing={1} mb={3}>
            <Text fontSize="xs" color="gray.50">Base Color</Text>
            <HStack spacing={2}>
              <Input
                type="color"
                value={state.hairColor.baseColor}
                onChange={(e) => handleHairBaseColorChange(e.target.value)}
                w="60px"
                h="32px"
                p={1}
                isDisabled={disabled}
              />
              <Input
                type="text"
                value={state.hairColor.baseColor.toUpperCase()}
                onChange={(e) => handleHairBaseColorChange(e.target.value)}
                placeholder="#000000"
                size="sm"
                fontFamily="mono"
                textTransform="uppercase"
                isDisabled={disabled}
              />
            </HStack>
          </VStack>

          {/* Hair Glow Color */}
          <VStack align="stretch" spacing={1} mb={3}>
            <Text fontSize="xs" color="gray.50">Glow Color</Text>
            <HStack spacing={2}>
              <Input
                type="color"
                value={state.hairColor.emissive}
                onChange={(e) => handleHairGlowColorChange(e.target.value)}
                w="60px"
                h="32px"
                p={1}
                isDisabled={disabled}
              />
              <Input
                type="text"
                value={state.hairColor.emissive.toUpperCase()}
                onChange={(e) => handleHairGlowColorChange(e.target.value)}
                placeholder="#000000"
                size="sm"
                fontFamily="mono"
                textTransform="uppercase"
                isDisabled={disabled}
              />
            </HStack>
          </VStack>

          {/* Hair Glow Intensity */}
          <VStack align="stretch" spacing={1} mb={3}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.50">Glow Intensity</Text>
              <Text fontSize="xs" color="gray.300">
                {state.hairColor.emissiveIntensity.toFixed(2)}
              </Text>
            </HStack>
            <Slider
              value={state.hairColor.emissiveIntensity}
              onChange={handleHairGlowIntensityChange}
              min={0}
              max={1}
              step={0.01}
              isDisabled={disabled}
              colorScheme="brand"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </VStack>
        </Box>

        {/* EYEBROWS SECTION */}
        <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={4}>
          <Text fontSize="sm" fontWeight="bold" color="brand.300" mb={2}>
            EYEBROWS
          </Text>

          {/* Eyebrow Preset */}
          <VStack align="stretch" spacing={2} mb={3}>
            <Text fontSize="xs" color="gray.50">Preset</Text>
            <Select
              size="sm"
              value=""
              onChange={(e) => handleEyebrowPresetChange(e.target.value)}
              isDisabled={disabled}
            >
              <option value="">Select Preset...</option>
              {colorPresetKeys.map((key) => (
                <option key={key} value={key}>
                  {HAIR_COLOR_PRESETS[key].name}
                </option>
              ))}
            </Select>
          </VStack>

          {/* Eyebrow Base Color */}
          <VStack align="stretch" spacing={1} mb={3}>
            <Text fontSize="xs" color="gray.50">Base Color</Text>
            <HStack spacing={2}>
              <Input
                type="color"
                value={state.eyebrowColor.baseColor}
                onChange={(e) => handleEyebrowBaseColorChange(e.target.value)}
                w="60px"
                h="32px"
                p={1}
                isDisabled={disabled}
              />
              <Input
                type="text"
                value={state.eyebrowColor.baseColor.toUpperCase()}
                onChange={(e) => handleEyebrowBaseColorChange(e.target.value)}
                placeholder="#000000"
                size="sm"
                fontFamily="mono"
                textTransform="uppercase"
                isDisabled={disabled}
              />
            </HStack>
          </VStack>

          {/* Eyebrow Glow Color */}
          <VStack align="stretch" spacing={1} mb={3}>
            <Text fontSize="xs" color="gray.50">Glow Color</Text>
            <HStack spacing={2}>
              <Input
                type="color"
                value={state.eyebrowColor.emissive}
                onChange={(e) => handleEyebrowGlowColorChange(e.target.value)}
                w="60px"
                h="32px"
                p={1}
                isDisabled={disabled}
              />
              <Input
                type="text"
                value={state.eyebrowColor.emissive.toUpperCase()}
                onChange={(e) => handleEyebrowGlowColorChange(e.target.value)}
                placeholder="#000000"
                size="sm"
                fontFamily="mono"
                textTransform="uppercase"
                isDisabled={disabled}
              />
            </HStack>
          </VStack>

          {/* Eyebrow Glow Intensity */}
          <VStack align="stretch" spacing={1} mb={3}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.50">Glow Intensity</Text>
              <Text fontSize="xs" color="gray.300">
                {state.eyebrowColor.emissiveIntensity.toFixed(2)}
              </Text>
            </HStack>
            <Slider
              value={state.eyebrowColor.emissiveIntensity}
              onChange={handleEyebrowGlowIntensityChange}
              min={0}
              max={1}
              step={0.01}
              isDisabled={disabled}
              colorScheme="brand"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </VStack>
        </Box>

        {/* OUTLINE SECTION */}
        <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={4}>
          <Text fontSize="sm" fontWeight="bold" color="brand.300" mb={2}>
            OUTLINE
          </Text>

          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" color="gray.50">Show Outline</Text>
            <Switch
              isChecked={state.showOutline}
              onChange={(e) => handleOutlineToggle(e.target.checked)}
              isDisabled={disabled}
              size="sm"
              colorScheme="brand"
            />
          </HStack>

          {state.showOutline && (
            <VStack align="stretch" spacing={3}>
              <HStack spacing={2}>
                <Text fontSize="xs" color="gray.50" w="60px">Color</Text>
                <Input
                  type="color"
                  value={state.outlineColor}
                  onChange={(e) => handleOutlineColorChange(e.target.value)}
                  w="60px"
                  h="32px"
                  p={1}
                  isDisabled={disabled}
                />
              </HStack>

              <VStack align="stretch" spacing={1}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.50">Opacity</Text>
                  <Text fontSize="xs" color="gray.300">
                    {state.outlineOpacity.toFixed(1)}
                  </Text>
                </HStack>
                <Slider
                  value={state.outlineOpacity}
                  onChange={handleOutlineOpacityChange}
                  min={0}
                  max={1}
                  step={0.1}
                  isDisabled={disabled}
                  colorScheme="brand"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </VStack>
            </VStack>
          )}
        </Box>

        {/* INDIVIDUAL PARTS */}
        {Object.keys(state.parts).length > 0 && (
          <Box borderTop="1px solid" borderColor="whiteAlpha.200" pt={4}>
            <Text fontSize="sm" fontWeight="bold" color="brand.300" mb={2}>
              PARTS
            </Text>
            <VStack align="stretch" spacing={2}>
              {Object.keys(state.parts).map((partName) => {
                const part = state.parts[partName];
                return (
                  <HStack key={partName} justify="space-between">
                    <Text fontSize="xs" color="gray.50">{partName}</Text>
                    <Switch
                      isChecked={part.visible}
                      onChange={(e) => handlePartVisibilityToggle(partName, e.target.checked)}
                      isDisabled={disabled}
                      size="sm"
                      colorScheme="brand"
                    />
                  </HStack>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* RESET BUTTON */}
        <Button
          size="sm"
          colorScheme="orange"
          onClick={handleReset}
          isDisabled={disabled}
        >
          Reset to Default
        </Button>
      </VStack>
    </DockableAccordionItem>
  );
}
