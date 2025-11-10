import React, { useEffect, useState } from 'react';
import {
  Box,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useToast,
  Input,
  IconButton,
  VStack,
  Flex,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text
} from '@chakra-ui/react';
import {
  FaFolderOpen,
  FaDownload,
  FaUpload,
  FaPlay,
  FaStop,
  FaTrashAlt
} from 'react-icons/fa';
import { TimeIcon } from '@chakra-ui/icons';

export default function PlaybackControls({ animationService }) {
  const toast = useToast();

  // Local arrays for "emotionAnimationsList", "speakingAnimationsList", and "visemeAnimationsList"
  const [emotionKeys, setEmotionKeys] = useState([]);
  const [speakingKeys, setSpeakingKeys] = useState([]);
  const [visemeKeys, setVisemeKeys] = useState([]);

  // For "Download JSON" naming
  const [jsonFilename, setJsonFilename] = useState('myAnimation.json');

  // aggregator => snippet array
  const [snippets, setSnippets] = useState([]);

  // 1) Load local lists on mount
  useEffect(() => {
    function loadCategoryList(keyName) {
      const stored = localStorage.getItem(keyName);
      if (!stored) return [];
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [];
    }
    setEmotionKeys(loadCategoryList('emotionAnimationsList'));
    setSpeakingKeys(loadCategoryList('speakingAnimationsList'));
    setVisemeKeys(loadCategoryList('visemeAnimationsList'));
  }, []);
  function handleLoadViseme(key) {
    const fullKey = `visemeAnimationsList/${key}`;
    const item = localStorage.getItem(fullKey);
    if (!item) {
      toast({
        title: 'Not Found',
        description: `No snippet named "${key}" in visemeAnimationsList`,
        status: 'error',
        duration: 3000
      });
      return;
    }
    try {
      const parsed = JSON.parse(item);
      parsed.name = key;
      parsed.isPlaying = true;
      parsed.loop = true;

      localStorage.setItem('myAnimationTMP', JSON.stringify(parsed));
      // Flag as visemeSnippet so curves map to visemes, not AUs
      animationService.loadFromLocal('myAnimationTMP', 'visemeSnippet', -100);

      toast({
        title: 'Loaded Viseme Animation',
        description: `Snippet: "${key}" => isPlaying=true, loop=true`,
        status: 'info',
        duration: 2000
      });
    } catch (err) {
      toast({
        title: 'Error Loading',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  }

  // 2) Subscribe to aggregator transitions to update snippet array
  useEffect(() => {
    if (!animationService) return;
    const unsub = animationService.onTransition((st) => {
      if (st.changed) {
        setSnippets([...st.context.animations]);
      }
    });
    // initialize with current state
    setSnippets([...(animationService.getState().context.animations || [])]);

    return unsub;
  }, [animationService]);

  // 3) Handle snippet load from local storage (Emotion / Speaking)
  function handleLoadEmotion(key) {
    const fullKey = `emotionAnimationsList/${key}`;
    const item = localStorage.getItem(fullKey);
    if (!item) {
      toast({
        title: 'Not Found',
        description: `No snippet named "${key}" in emotionAnimationsList`,
        status: 'error',
        duration: 3000
      });
      return;
    }
    try {
      const parsed = JSON.parse(item);
      parsed.name = key;
      parsed.isPlaying = true;
      parsed.loop = true;

      localStorage.setItem('myAnimationTMP', JSON.stringify(parsed));
      animationService.loadFromLocal('myAnimationTMP');

      toast({
        title: 'Loaded Emotion Animation',
        description: `Snippet: "${key}" => isPlaying=true, loop=true`,
        status: 'info',
        duration: 2000
      });
    } catch (err) {
      toast({
        title: 'Error Loading',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  }

  function handleLoadSpeaking(key) {
    const fullKey = `speakingAnimationsList/${key}`;
    const item = localStorage.getItem(fullKey);
    if (!item) {
      toast({
        title: 'Not Found',
        description: `No snippet named "${key}" in speakingAnimationsList`,
        status: 'error',
        duration: 3000
      });
      return;
    }
    try {
      const parsed = JSON.parse(item);
      parsed.name = key;
      parsed.isPlaying = true;
      parsed.loop = true;

      localStorage.setItem('myAnimationTMP', JSON.stringify(parsed));
      animationService.loadFromLocal('myAnimationTMP');

      toast({
        title: 'Loaded Speaking Animation',
        description: `Snippet: "${key}" => isPlaying=true, loop=true`,
        status: 'info',
        duration: 2000
      });
    } catch (err) {
      toast({
        title: 'Error Loading',
        description: err.message,
        status: 'error',
        duration: 3000
      });
    }
  }

  // 4) Download JSON for the current animation curves
  function handleDownloadJSON() {
    if (!animationService?.getCurves) {
      toast({
        title: 'No snippet to save',
        status: 'error',
        duration: 3000
      });
      return;
    }
    const curves = animationService.getCurves() || {};
    const data = { curves };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type:'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = jsonFilename.endsWith('.json')
      ? jsonFilename
      : `${jsonFilename}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Downloaded JSON',
      description: filename,
      status: 'success',
      duration: 3000
    });
  }

  // 5) Load animation JSON from file
  function handleLoadFromFile(e) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const base = file.name.replace(/\.\w+$/, '');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = JSON.parse(text);

        parsed.name = base;
        parsed.isPlaying = true;
        parsed.loop = true;

        animationService.loadFromJSON(parsed);
        toast({
          title: 'Loaded JSON File',
          description: file.name,
          status: 'success',
          duration: 3000
        });
      } catch(err) {
        toast({
          title: 'Error Parsing JSON',
          description: err.message,
          status: 'error',
          duration: 4000
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  }

  // 6) Snippet-level controls:
  function handlePlaySnippet(idx) {
    // Assume we pass snippet name to the aggregator method for play
    const sn = snippets[idx];
    animationService.setSnippetPlaying(sn.name, true);
  }
  function handleStopSnippet(idx) {
    const sn = snippets[idx];
    // Using a stop command here; you might implement a specific stop method
    animationService.setSnippetPlaying(sn.name, false);
  }
  function handleLoopToggle(idx) {
    const sn = snippets[idx];
    animationService.setSnippetLoop(sn.name, !sn.loop);
  }
  function handleScrubTime(idx, val) {
    const sn = snippets[idx];
    animationService.setSnippetTime(sn.name, val);
  }
  function handleMaxTime(idx, val) {
    const sn = snippets[idx];
    animationService.setSnippetMaxTime(sn.name, val);
  }
  function handlePlaybackRate(idx, val) {
    const sn = snippets[idx];
    animationService.setSnippetPlaybackRate(sn.name, val);
  }
  function handleIntensityScale(idx, val) {
    const sn = snippets[idx];
    animationService.setSnippetIntensityScale(sn.name, val);
  }

  // 7) Removal actions
  // Single snippet removal: use the aggregator's removeAnimation(name)
  function handleRemoveSnippet(idx) {
    const sn = snippets[idx];
    if (!animationService?.removeAnimation) {
      toast({
        title: 'removeAnimation not implemented!',
        status: 'error',
        duration: 3000
      });
      return;
    }
    animationService.removeAnimation(sn.name);
    toast({
      title: 'Snippet removed',
      description: `Snippet "${sn.name}" removed.`,
      status: 'info',
      duration: 2000
    });
  }

  // Remove ALL snippets by iterating over each loaded snippet.
  function handleClearAllSnippets() {
    if (!animationService?.removeAnimation) {
      toast({
        title: 'removeAnimation not implemented!',
        status: 'error',
        duration: 3000
      });
      return;
    }
    snippets.forEach(sn => {
      animationService.removeAnimation(sn.name);
    });
    toast({
      title: 'All snippets cleared',
      status: 'info',
      duration: 2000
    });
  }

  return (
    <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
      {/* LOAD MENUS: Emotion / Speaking */}
      <HStack spacing={4} mb={4}>
        <Menu>
          <MenuButton
            as={Button}
            leftIcon={<FaFolderOpen />}
            colorScheme="purple"
            size="sm"
          >
            Load Emotion
          </MenuButton>
          <MenuList>
            {emotionKeys.length === 0 && (
              <MenuItem isDisabled>No emotion animations</MenuItem>
            )}
            {emotionKeys.map((keyName) => (
              <MenuItem
                key={keyName}
                onClick={() => handleLoadEmotion(keyName)}
              >
                {keyName}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        <Menu>
          <MenuButton
            as={Button}
            leftIcon={<FaFolderOpen />}
            colorScheme="teal"
            size="sm"
          >
            Load Speaking
          </MenuButton>
          <MenuList>
            {speakingKeys.length === 0 && (
              <MenuItem isDisabled>No speaking animations</MenuItem>
            )}
            {speakingKeys.map((keyName) => (
              <MenuItem
                key={keyName}
                onClick={() => handleLoadSpeaking(keyName)}
              >
                {keyName}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        <Menu>
          <MenuButton
            as={Button}
            leftIcon={<FaFolderOpen />}
            colorScheme="cyan"
            size="sm"
          >
            Load Viseme
          </MenuButton>
          <MenuList>
            {visemeKeys.length === 0 && (
              <MenuItem isDisabled>No viseme animations</MenuItem>
            )}
            {visemeKeys.map((keyName) => (
              <MenuItem
                key={keyName}
                onClick={() => handleLoadViseme(keyName)}
              >
                {keyName}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </HStack>

      {/* DOWNLOAD / LOAD JSON */}
      <HStack spacing={2} mb={6}>
        <Input
          size="sm"
          width="130px"
          placeholder="myAnimation.json"
          value={jsonFilename}
          onChange={(e) => setJsonFilename(e.target.value)}
        />
        <IconButton
          aria-label="Download JSON"
          icon={<FaDownload />}
          colorScheme="purple"
          size="sm"
          onClick={handleDownloadJSON}
        />
        <input
          type="file"
          accept=".json"
          style={{ display:'none' }}
          id="json-file-input"
          onChange={handleLoadFromFile}
        />
        <label htmlFor="json-file-input">
          <IconButton
            as="span"
            aria-label="Load from JSON"
            icon={<FaUpload />}
            colorScheme="orange"
            size="sm"
          />
        </label>
      </HStack>

      {/* SNIPPET LIST: Individual Animations */}
      <Text fontWeight="bold" mb={2}>
        Individual Animations:
      </Text>
      {snippets.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No snippets loaded.
        </Text>
      ) : (
        <>
          <VStack align="stretch" spacing={3}>
            {snippets.map((sn, idx) => (
              <Box
                key={idx}
                p={2}
                bg="white"
                borderWidth="1px"
                borderRadius="md"
                boxShadow="sm"
              >
                <Flex align="center" justify="space-between">
                  <Text fontWeight="semibold" color="blue.600">
                    {sn.name || `Snippet ${idx}`}
                    {sn.isPlaying ? ' (Playing)' : ' (Stopped)'}
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      size="xs"
                      colorScheme="green"
                      icon={<FaPlay />}
                      aria-label="Play snippet"
                      onClick={() => handlePlaySnippet(idx)}
                      isDisabled={sn.isPlaying}
                    />
                    <IconButton
                      size="xs"
                      colorScheme="red"
                      icon={<FaStop />}
                      aria-label="Stop snippet"
                      onClick={() => handleStopSnippet(idx)}
                    />
                    <IconButton
                      size="xs"
                      colorScheme="gray"
                      icon={<FaTrashAlt />}
                      aria-label="Remove snippet"
                      onClick={() => handleRemoveSnippet(idx)}
                    />
                  </HStack>
                </Flex>

                <HStack spacing={2} mt={2} alignItems="center">
                  <Text fontSize="xs">Loop:</Text>
                  <Switch
                    size="sm"
                    isChecked={sn.loop}
                    onChange={() => handleLoopToggle(idx)}
                  />
                </HStack>

                <Text fontSize="xs" mt={1}>
                  Time: {sn.currentTime.toFixed(2)} / {sn.maxTime.toFixed(2)}
                </Text>
                <Slider
                  aria-label={`snippet-time-${idx}`}
                  colorScheme="blue"
                  min={0}
                  max={sn.maxTime}
                  step={0.01}
                  value={sn.currentTime}
                  onChange={(val) => handleScrubTime(idx, val)}
                  mb={2}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={3}>
                    <TimeIcon boxSize={2} />
                  </SliderThumb>
                </Slider>

                <Text fontSize="xs">
                  MaxTime: {sn.maxTime.toFixed(1)}
                </Text>
                <Slider
                  aria-label={`snippet-maxTime-${idx}`}
                  colorScheme="purple"
                  min={1}
                  max={30}
                  step={0.5}
                  value={sn.maxTime}
                  onChange={(val) => handleMaxTime(idx, val)}
                  mb={2}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={3} />
                </Slider>

                <Text fontSize="xs">
                  Playback Rate: {sn.snippetPlaybackRate.toFixed(2)}x
                </Text>
                <Slider
                  colorScheme="pink"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={sn.snippetPlaybackRate}
                  onChange={(val) => handlePlaybackRate(idx, val)}
                  mb={2}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={3} />
                </Slider>

                <Text fontSize="xs">
                  Intensity Scale: {sn.snippetIntensityScale.toFixed(1)}
                </Text>
                <Slider
                  colorScheme="orange"
                  min={0}
                  max={2}
                  step={0.1}
                  value={sn.snippetIntensityScale}
                  onChange={(val) => handleIntensityScale(idx, val)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={3} />
                </Slider>
              </Box>
            ))}
          </VStack>
          {/* Button to remove ALL snippets */}
          <HStack justify="flex-end" mt={3}>
            <Button
              size="sm"
              colorScheme="red"
              onClick={handleClearAllSnippets}
            >
              Clear All
            </Button>
          </HStack>
        </>
      )}
    </Box>
  );
}