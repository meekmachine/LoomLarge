// Helper to update blendshape mode and dispatch event
function updateBlendshapeMode(charSceneName='') {
  const m = charSceneName.match(/(\d{1,3})/);
  const n = m ? parseInt(m[1],10) : 0;
  const mode = n >= 20 ? 'legacy' : 'modern';
  if (window.currentBlendshapeMode !== mode) {
    window.currentBlendshapeMode = mode;
    document.dispatchEvent(new Event('blendshapeModeChanged'));
  }
}
import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Select,
  Button,
  FormControl,
  FormLabel,
  Input,
  RadioGroup,
  Radio,
  HStack,
  useToast
} from '@chakra-ui/react';
import CameraControls from './CameraControls'
/**
 * SceneSelector:
 *  - Fetches environment & character scene lists from Unity.
 *  - Environment and Character each have separate dropdowns & radio groups.
 *  - "Load Environment" => facsLib.switchScene(...), appending ";end" if needed.
 *  - "Load Character"   => facsLib.switchCharacter(...), appending ";end" if needed.
 *  - "Trigger" => facsLib.triggerCharacterAnimation(...)
 */
export default function SceneSelector({ facsLib }) {
  const toast = useToast();
  const [envScenes, setEnvScenes] = useState([]);
  const [charScenes, setCharScenes] = useState([]);

  // Selected environment & character from dropdowns
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedChar, setSelectedChar] = useState('');

  // Separate radio states for environment vs. character
  const [envStartOrEnd, setEnvStartOrEnd] = useState('start'); // "start" or "end"
  const [charStartOrEnd, setCharStartOrEnd] = useState('start');

  // Trigger name
  const [triggerName, setTriggerName] = useState('');

  // On mount, define the callback & request scene lists from Unity
  useEffect(() => {
    window.OnUnityListAllScenes = (envCsv, charCsv) => {
      const envArr = envCsv.split(',').map(s => s.trim()).filter(Boolean);
      const charArr = charCsv.split(',').map(s => s.trim()).filter(Boolean);

      setEnvScenes(envArr);
      setCharScenes(charArr);

      if (envArr.length > 0) setSelectedEnv(envArr[0]);
      if (charArr.length > 0) setSelectedChar(charArr[0]);
    };

    // Request the scene lists from Unity
    if (window.facslib && window.facslib.sendAllSceneListsToBrowser) {
      window.facslib.sendAllSceneListsToBrowser();
    }
  }, [facsLib]);

  // Load environment => switchScene("env" or "env;end")
  const handleLoadEnvironment = () => {
    if (!selectedEnv) {
      toast({ title: "Select an environment first", status: 'warning' });
      return;
    }

    let param = selectedEnv;
    if (envStartOrEnd === 'end') {
      param += ';end';
    }

    // Use switchScene to change the environment
    window.facslib.switchScene(param);

    toast({
      title: `Load environment='${selectedEnv}' at '${envStartOrEnd}'`,
      status: 'success'
    });
  };

  // Load character => switchCharacter("char" or "char;end")
  const handleLoadCharacter = () => {
    if (!selectedChar) {
      toast({ title: "Select a character first", status: 'warning' });
      return;
    }

    let param = selectedChar;
    if (charStartOrEnd === 'end') {
      param += ';end';
    }

    // Update blendshape mode before switching character
    updateBlendshapeMode(selectedChar);

    // Use switchCharacter to change the character
    window.facslib.switchCharacter(param);

    toast({
      title: `Load character='${selectedChar}' at '${charStartOrEnd}'`,
      status: 'success'
    });
  };

  // Trigger
  const handleTrigger = () => {
    if (!triggerName) {
      toast({ title: "Enter a trigger name", status: 'info' });
      return;
    }
    window.facslib.triggerCharacterAnimation(triggerName);
    toast({ title: `Trigger '${triggerName}' sent to char`, status: 'success' });
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" maxW="md">
      <VStack spacing={4} align="stretch">

        {/* Environment */}
        <FormControl>
          <FormLabel>Environment Scenes</FormLabel>
          <Select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
          >
            {envScenes.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Environment Start/End</FormLabel>
          <RadioGroup onChange={setEnvStartOrEnd} value={envStartOrEnd}>
            <HStack spacing={4}>
              <Radio value="start">Start</Radio>
              <Radio value="end">End</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>

        <Button colorScheme="blue" onClick={handleLoadEnvironment}>
          Load Environment
        </Button>

        {/* Character */}
        <FormControl>
          <FormLabel>Character Scenes</FormLabel>
          <Select
            value={selectedChar}
            onChange={(e) => setSelectedChar(e.target.value)}
          >
            {charScenes.map(char => (
              <option key={char} value={char}>{char}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Character Start/End</FormLabel>
          <RadioGroup onChange={setCharStartOrEnd} value={charStartOrEnd}>
            <HStack spacing={4}>
              <Radio value="start">Start</Radio>
              <Radio value="end">End</Radio>
            </HStack>
          </RadioGroup>
        </FormControl>

        <Button colorScheme="blue" onClick={handleLoadCharacter}>
          Load Character
        </Button>

        {/* Trigger */}
        <FormControl>
          <FormLabel>Trigger Name</FormLabel>
          <HStack>
            <Input
              placeholder="Enter trigger"
              value={triggerName}
              onChange={e => setTriggerName(e.target.value)}
            />
            <Button onClick={handleTrigger}>Trigger</Button>
          </HStack>
        </FormControl>
        <CameraControls />
      </VStack>
    </Box>
  );
}