import React, { useState } from 'react';
import {
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Text
} from '@chakra-ui/react';
import * as d3 from 'd3';

/**
 * VisemeSlider props:
 * - viseme: string or number ID
 * - name: optional string
 * - intensity: number
 * - notes: optional string
 * - onChange: (newIntensity, newNotes) => void
 */
const VisemeSlider = ({
  viseme,
  name,
  intensity,
  notes,
  onChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorScale = d3.scaleLinear()
    .domain([0, 100])
    .range(["teal", "magenta"]);

  const handleSliderChange = (value) => {
    onChange(value, notes);
  };

  return (
    <Box width="100%">
      {/* If you want to show the viseme name or phoneme above */}
      {name && <Text mb={2}>{name}</Text>}

      <Slider
        value={intensity}
        min={0}
        max={100}
        step={1}
        onChange={handleSliderChange}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SliderTrack>
          <SliderFilledTrack bg={colorScale(intensity)} />
        </SliderTrack>
        <Tooltip
          hasArrow
          bg="teal.500"
          color="white"
          placement="top"
          isOpen={showTooltip}
          label={`${intensity}`}
        >
          <SliderThumb />
        </Tooltip>
      </Slider>

      {notes && <Text fontSize="sm" mt={2}>{notes}</Text>}
    </Box>
  );
};

export default VisemeSlider;