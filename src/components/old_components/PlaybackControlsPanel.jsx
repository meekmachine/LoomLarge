import React from 'react';
import { Flex, Text, Switch } from '@chakra-ui/react';
import DockableAccordionItem from './DockableAccordionItem';
import PlaybackControls from './PlaybackControls';

export default function PlaybackControlsPanel({
  drawerControls,
  setDrawerControls,
  currentTime,
  maxTime,
  isLooping,
  onSetLoop,
  onPlay,
  onPause,
  onStop,
  onScrub,
  onSetMaxTime,
  animationService
}) {
  return (
    <DockableAccordionItem title="Playback Controls">
      <Flex justifyContent="space-between" mb={4} alignItems="center">
        <Text>Time-based Playback</Text>
        <Switch
          isChecked={drawerControls.useTimeBased}
          onChange={() =>
            setDrawerControls(prev => ({
              ...prev,
              useTimeBased: !prev.useTimeBased
            }))
          }
          colorScheme="purple"
        />
      </Flex>
      {animationService && (
        <PlaybackControls
          currentTime={currentTime}
          maxTime={maxTime}
          isLooping={isLooping}
          onSetLoop={onSetLoop}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onScrub={onScrub}
          onSetMaxTime={onSetMaxTime}
          animationService={animationService}
        />
      )}
    </DockableAccordionItem>
  );
}