import React, { useState, useEffect } from 'react';
import {
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Text,
  Image,
  VStack
} from '@chakra-ui/react';

interface AUSliderProps {
  au: string | number;
  name: string;
  intensity: number;
  onChange: (newIntensity: number) => void;
  muscularBasis?: string;
  links?: string[];
}

/**
 * AUSlider - Controls Action Unit intensity from 0-1
 * Calls engine.setAU() directly via onChange callback
 */
const AUSlider: React.FC<AUSliderProps> = ({
  au,
  name,
  intensity,
  onChange,
  muscularBasis,
  links
}) => {
  const [showImageTooltip, setShowImageTooltip] = useState(false);
  const [showValueTooltip, setShowValueTooltip] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Color interpolation: teal (0) -> magenta (1)
  const getSliderColor = (value: number): string => {
    const teal = { r: 0, g: 128, b: 128 };
    const magenta = { r: 255, g: 0, b: 255 };
    const r = Math.round(teal.r + (magenta.r - teal.r) * value);
    const g = Math.round(teal.g + (magenta.g - teal.g) * value);
    const b = Math.round(teal.b + (magenta.b - teal.b) * value);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Fetch Wikipedia images for muscle info
  useEffect(() => {
    const fetchMainImageFromWikipedia = async (pageUrl: string): Promise<string | null> => {
      const pageName = pageUrl.split('/wiki/')[1];
      if (!pageName) return null;

      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageName}&prop=pageimages&format=json&origin=*&pithumbsize=100`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const pages = data.query.pages;
        const firstPage = pages[Object.keys(pages)[0]];
        return firstPage.thumbnail ? firstPage.thumbnail.source : null;
      } catch (err) {
        console.error("Failed to fetch Wikipedia image:", err);
        return null;
      }
    };

    const loadImages = async () => {
      if (!links || !Array.isArray(links)) return;
      const results = await Promise.all(links.map(link => fetchMainImageFromWikipedia(link)));
      setImageUrls(results.filter(Boolean) as string[]);
    };
    loadImages();
  }, [links]);

  const handleIntensityChange = (value: number) => {
    onChange(value);
  };

  return (
    <Box width="100%">
      <Text mb="2" display="inline" fontSize="sm">
        {`${au} - ${name}`}
        {muscularBasis && (
          <Tooltip
            label={
              <VStack align="start">
                {muscularBasis.split(', ').map((muscle, i) => (
                  imageUrls[i]
                    ? <Image key={i} src={imageUrls[i]} alt={muscle} boxSize="100px" />
                    : <Text key={i}>{muscle}</Text>
                ))}
              </VStack>
            }
            isOpen={showImageTooltip}
            hasArrow
          >
            <Text
              as="span"
              fontSize="xs"
              ml={2}
              onMouseEnter={() => setShowImageTooltip(true)}
              onMouseLeave={() => setShowImageTooltip(false)}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              {muscularBasis}
            </Text>
          </Tooltip>
        )}
      </Text>

      <Slider
        id={String(au)}
        value={intensity}
        min={0}
        max={1}
        step={0.01}
        onChange={handleIntensityChange}
        onMouseEnter={() => setShowValueTooltip(true)}
        onMouseLeave={() => setShowValueTooltip(false)}
      >
        <SliderTrack>
          <SliderFilledTrack bg={getSliderColor(intensity)} />
        </SliderTrack>
        <Tooltip
          hasArrow
          label={`${(intensity * 100).toFixed(0)}%`}
          bg="gray.300"
          color="black"
          placement="top"
          isOpen={showValueTooltip}
        >
          <SliderThumb boxSize={6} />
        </Tooltip>
      </Slider>
    </Box>
  );
};

export default AUSlider;
