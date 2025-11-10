

import React from 'react';
import { Flex, Text, Switch, Button, HStack } from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { FaUpload } from 'react-icons/fa';

export default function FaceResetAndToggles({
  drawerControls,
  setDrawerControls,
  useAUsVisemeMode,
  onToggleVisemeMode,
  segmentationMode,
  onToggleSegmentation,
  onResetNeutral,
  onOpenSave,
  onOpenLoad
}) {
  return (
    <Flex
      direction="column"
      p={4}
      boxShadow="base"
      position="sticky"
      top={0}
      zIndex="sticky"
      bg="gray.50"
    >
      <Flex justifyContent="space-between" mb={4} alignItems="center">
        <Text>Show Unused Sliders</Text>
        <Switch
          isChecked={drawerControls.showUnusedSliders}
          onChange={() => setDrawerControls(prev => ({
            ...prev,
            showUnusedSliders: !prev.showUnusedSliders
          }))}
          colorScheme="teal"
        />
      </Flex>

      <Flex justifyContent="space-between" mb={4} alignItems="center">
        <Text>Use AUs for Visemes</Text>
        <Switch
          isChecked={useAUsVisemeMode}
          onChange={(e) => onToggleVisemeMode(e.target.checked)}
          colorScheme="teal"
        />
      </Flex>

      <Flex justifyContent="space-between" mb={4} alignItems="center">
        <Text>Group by Face Area</Text>
        <Switch
          isChecked={segmentationMode === 'area'}
          onChange={onToggleSegmentation}
          colorScheme="teal"
        />
      </Flex>

      <Button colorScheme="teal" onClick={onResetNeutral} mb={4}>
        Set Face to Neutral
      </Button>

      {!drawerControls.useTimeBased && (
        <HStack spacing={4} justifyContent="space-between">
          <Button
            leftIcon={<DownloadIcon />}
            colorScheme="blue"
            onClick={onOpenSave}
            size="sm"
            flex="1"
          >
            Save
          </Button>
          <Button
            leftIcon={<FaUpload />}
            colorScheme="green"
            onClick={onOpenLoad}
            size="sm"
            flex="1"
          >
            Load
          </Button>
        </HStack>
      )}
    </Flex>
  );
}