import React, { useState } from 'react';
import {
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Text,
  HStack
} from '@chakra-ui/react';
import { AUInfo } from '../../engine/arkit/shapeDict';

interface ContinuumSliderProps {
  negativeAU: AUInfo;
  positiveAU: AUInfo;
  value: number; // -1 to 1
  onChange: (value: number) => void;
}

/**
 * ContinuumSlider - Bidirectional slider for paired AUs (e.g., Head Left <-> Right)
 * Range: -1 (negative AU) to +1 (positive AU)
 * Automatically calls engine methods to handle both blendshapes and bones
 */
const ContinuumSlider: React.FC<ContinuumSliderProps> = ({
  negativeAU,
  positiveAU,
  value,
  onChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Color: blue for negative, neutral in center, orange for positive
  const getSliderColor = (val: number): string => {
    if (val < 0) {
      const intensity = Math.abs(val);
      return `rgba(66, 153, 225, ${intensity})`; // blue
    } else {
      return `rgba(237, 137, 54, ${val})`; // orange
    }
  };

  return (
    <Box width="100%">
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" opacity={0.7}>
          {negativeAU.name}
        </Text>
        <Text fontSize="xs" fontWeight="semibold">
          {value.toFixed(2)}
        </Text>
        <Text fontSize="xs" opacity={0.7}>
          {positiveAU.name}
        </Text>
      </HStack>

      <Slider
        value={value}
        min={-1}
        max={1}
        step={0.01}
        onChange={onChange}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SliderTrack>
          <SliderFilledTrack bg={getSliderColor(value)} />
        </SliderTrack>
        <Tooltip
          hasArrow
          label={`${(value * 100).toFixed(0)}%`}
          bg="gray.300"
          color="black"
          placement="top"
          isOpen={showTooltip}
        >
          <SliderThumb boxSize={6} />
        </Tooltip>
      </Slider>
    </Box>
  );
};

export default ContinuumSlider;
