import React from 'react';
import {
  Box, Text, RangeSlider, RangeSliderTrack, RangeSliderFilledTrack, RangeSliderThumb,
} from '@chakra-ui/react';

const KeyframeSlider = ({ au, keyframes, onUpdateKeyframes }) => {
  // Assuming keyframes is an array with two elements: [startKeyframe, endKeyframe]
  const initialRange = [keyframes[0].intensity, keyframes[1].intensity];

  const handleRangeChange = (value) => {
    const updatedKeyframes = keyframes.map((kf, index) => ({
      ...kf,
      intensity: value[index]
    }));
    onUpdateKeyframes(updatedKeyframes);
  };

  return (
    <Box>
      <Text mb={4}>Adjusting keyframes for {au}:</Text>
      <RangeSlider
        aria-label={['min', 'max']}
        defaultValue={initialRange}
        min={0}
        max={100}
        onChangeEnd={handleRangeChange} // Only update on change end for performance
      >
        <RangeSliderTrack>
          <RangeSliderFilledTrack />
        </RangeSliderTrack>
        <RangeSliderThumb boxSize={6} index={0} />
        <RangeSliderThumb boxSize={6} index={1} />
      </RangeSlider>
    </Box>
  );
};

export default KeyframeSlider;
