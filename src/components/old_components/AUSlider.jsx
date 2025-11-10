import React, { useState, useEffect } from 'react';
import {
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Text,
  useColorModeValue,
  Image,
  VStack
} from '@chakra-ui/react';
import * as d3 from 'd3';

/**
 * AUSlider props:
 * - au: string (the ID, e.g. "12" or "AU12")
 * - name: string
 * - intensity: number (0-100)
 * - notes: optional string for extra info
 * - onChange: (newIntensity, newNotes) => void  (parent callback)
 * - muscularBasis, links: optional for tooltip
 */
const AUSlider = ({ 
  au, 
  name, 
  intensity, 
  notes, 
  onChange, 
  muscularBasis, 
  links 
}) => {
  const [showImageTooltip, setShowImageTooltip] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);

  // We use d3 for a dynamic color scale
  const colorScale = d3.scaleLinear()
    .domain([0, 100])
    .range(["teal", "magenta"]);

  // Optional: fetch images from Wikipedia (if you want)
  useEffect(() => {
    const fetchMainImageFromWikipedia = async (pageUrl) => {
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
      setImageUrls(results.filter(Boolean));
    };
    loadImages();
  }, [links]);

  /**
   * Called when the slider changes intensity.
   * We'll call parent onChange(newIntensity, newNotes).
   */
  const handleIntensityChange = (value) => {
    onChange(value, notes);
  };

  return (
    <Box width="100%">
      <Text mb="2" display="inline">
        {`${au} - ${name}`}
        {/* If we have muscularBasis and links, show a tooltip on hover */}
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
              fontSize="sm"
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
        id={au}
        value={intensity}
        min={0}
        max={100}
        onChange={handleIntensityChange}
        colorScheme={useColorModeValue("teal", "magenta")}
      >
        <SliderTrack>
          <SliderFilledTrack bg={colorScale(intensity)} />
        </SliderTrack>
        <Tooltip hasArrow label={`${intensity}%`} bg="gray.300" color="black" placement="top">
          <SliderThumb boxSize={6} />
        </Tooltip>
      </Slider>

      {notes && <Text mt="2" fontSize="sm">{notes}</Text>}
    </Box>
  );
};

export default AUSlider;