import React, { useMemo, useState } from 'react';
import { Box, HStack, VStack, Text, Select, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Button, Divider } from '@chakra-ui/react';
import { AU_TO_MORPHS, ALIASES, VISEME_KEYS } from '../../engine/arkit/shapeDict';

type Props = {
  applyAU: (id: number, value: number) => void;
  setMorph: (morphKey: string, value: number) => void;
};

// Common AU IDs to expose in the quick panel
const COMMON_AUS = [1, 2, 4, 6, 9, 10, 12, 14, 15, 16, 20, 26, 27, 43];

export default function AUQuickPanel({ applyAU, setMorph }: Props) {
  // AU state
  const auOptions = useMemo(() => COMMON_AUS.filter(id => (AU_TO_MORPHS[id] || []).length > 0), []);
  const [auId, setAuId] = useState<number>(auOptions.includes(12) ? 12 : (auOptions[0] || 12));
  const [auVal, setAuVal] = useState<number>(0);

  // Viseme state
  const visemeOptions = useMemo(() => (VISEME_KEYS && VISEME_KEYS.length ? VISEME_KEYS : ['Ah','EE','IH','Oh','W_OO','F_V','TH']), []);
  const [visemeKey, setVisemeKey] = useState<string>(visemeOptions[0]);
  const [visemeVal, setVisemeVal] = useState<number>(0);

  const applyAUInternal = (v: number) => {
    setAuVal(v);
    applyAU(auId, v);
  };

  const applyVisemeInternal = (v: number) => {
    setVisemeVal(v);
    setMorph(visemeKey, v);
  };

  const resetAllVisemes = () => {
    visemeOptions.forEach(k => setMorph(k, 0));
    setVisemeVal(0);
  };

  return (
    <Box position="fixed" top="12px" left="12px" zIndex={10} bg="rgba(0,0,0,0.6)" color="white" p={3} rounded="md" shadow="md" w="340px">
      <VStack align="stretch" spacing={3}>
        {/* AU tester */}
        <Text fontSize="sm" opacity={0.9}>AU Tester</Text>
        <HStack>
          <Text w="64px" fontSize="sm">AU</Text>
          <Select size="sm" value={auId} onChange={(e) => setAuId(Number(e.target.value))}>
            {auOptions.map(id => (
              <option key={id} value={id}>{`AU${id}`}</option>
            ))}
          </Select>
        </HStack>
        <HStack>
          <Text w="64px" fontSize="sm">Value</Text>
          <Text w="36px" textAlign="right">{auVal.toFixed(2)}</Text>
          <Slider aria-label='au' min={0} max={1} step={0.01} value={auVal} onChange={applyAUInternal}>
            <SliderTrack><SliderFilledTrack /></SliderTrack>
            <SliderThumb />
          </Slider>
        </HStack>

        <Divider borderColor="rgba(255,255,255,0.15)" />

        {/* Viseme tester */}
        <Text fontSize="sm" opacity={0.9}>Viseme Tester</Text>
        <HStack>
          <Text w="64px" fontSize="sm">Viseme</Text>
          <Select size="sm" value={visemeKey} onChange={(e) => setVisemeKey(e.target.value)}>
            {visemeOptions.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
        </HStack>
        <HStack>
          <Text w="64px" fontSize="sm">Value</Text>
          <Text w="36px" textAlign="right">{visemeVal.toFixed(2)}</Text>
          <Slider aria-label='viseme' min={0} max={1} step={0.01} value={visemeVal} onChange={applyVisemeInternal}>
            <SliderTrack><SliderFilledTrack /></SliderTrack>
            <SliderThumb />
          </Slider>
        </HStack>
        <HStack justify="space-between">
          <Button size="sm" onClick={() => applyVisemeInternal(1)}>Full</Button>
          <Button size="sm" onClick={() => applyVisemeInternal(0.5)}>Half</Button>
          <Button size="sm" variant="outline" onClick={() => applyVisemeInternal(0)}>Zero</Button>
          <Button size="sm" variant="ghost" onClick={resetAllVisemes}>Reset All</Button>
        </HStack>
      </VStack>
    </Box>
  );
}
