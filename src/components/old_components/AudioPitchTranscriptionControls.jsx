// AudioPitchTranscriptionControls.jsx
import React, { useEffect, useState } from 'react';
import { VStack, Switch, FormControl, FormLabel } from '@chakra-ui/react';

import { createAudioService } from '../perception/audio/audioService';
import { createTranscriptionService } from '../perception/audio/transcriptionService';
import { createPitchService, pitchVolume$ } from '../perception/audio/pitchService';

export function AudioPitchTranscriptionControls() {
  // 1) Create the three services ONCE
  const [audioService] = useState(() => createAudioService());
  const [transcriptionService] = useState(() => createTranscriptionService());
  const [pitchService] = useState(() => createPitchService());

  // 2) Local states for each machine's state
  const [audioState, setAudioState] = useState('');
  const [transcriptionState, setTranscriptionState] = useState('');
  const [pitchState, setPitchState] = useState('');

  // optional: store some pitch data if we want
  const [latestPitch, setLatestPitch] = useState(0);
  const [latestVolume, setLatestVolume] = useState(0);

  // 3) On mount, subscribe to transitions + pitchVolume
  useEffect(() => {
    // A) audioMachine transitions
    const audioSub = audioService.service.onTransition((state) => {
      if (state.changed) {
        setAudioState(state.value);

        if (state.value === 'micOn') {
          const { mediaStream } = state.context;
          if (mediaStream) {
            // pass the stream to pitchService
            pitchService.setMediaStream(mediaStream);
          }
        }
        if (state.value === 'micOff') {
          pitchService.setMediaStream(null);
        }
      }
    });

    // B) transcriptionMachine transitions
    const txSub = transcriptionService.service.onTransition((state) => {
      if (state.changed) {
        setTranscriptionState(state.value);
      }
    });

    // C) pitchMachine transitions
    const pitchSub = pitchService.service.onTransition((state) => {
      if (state.changed) {
        setPitchState(state.value);
      }
    });

    // D) Subscribe to pitchVolume$ to get real-time pitch/volume
    const volSub = pitchVolume$.subscribe(({ pitch, volume, timestamp }) => {
      setLatestPitch(pitch);
      setLatestVolume(volume);
      // do something else if needed, like store in a chart
    });

    // E) Start the audio machine checking support
    audioService.init();

    // Cleanup
    return () => {
      audioSub.stop();
      txSub.stop();
      pitchSub.stop();
      volSub.unsubscribe();

      // optionally stop everything
      audioService.stop();
      transcriptionService.stopListening();
      pitchService.stopExtracting();
    };
  }, [audioService, transcriptionService, pitchService]);

  // 4) Derive booleans
  const isAudioOn = (audioState === 'micOn');
  const isTranscribing = (transcriptionState === 'listening');
  const isPitchExtracting = (pitchState === 'extracting');

  // 5) Toggle handlers
  const handleAudioToggle = () => {
    if (isAudioOn) {
      audioService.stop();
    } else {
      audioService.start();
    }
  };

  const handleTranscriptionToggle = () => {
    if (isTranscribing) {
      transcriptionService.stopListening();
    } else {
      transcriptionService.startListening();
    }
  };

  const handlePitchToggle = () => {
    if (isPitchExtracting) {
      pitchService.stopExtracting();
    } else {
      pitchService.startExtracting();
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0" htmlFor="audio-switch">Audio (mic)</FormLabel>
        <Switch
          id="audio-switch"
          isChecked={isAudioOn}
          onChange={handleAudioToggle}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0" htmlFor="transcription-switch">Transcription</FormLabel>
        <Switch
          id="transcription-switch"
          isDisabled={!isAudioOn}
          isChecked={isTranscribing}
          onChange={handleTranscriptionToggle}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0" htmlFor="pitch-switch">Pitch Detection</FormLabel>
        <Switch
          id="pitch-switch"
          isDisabled={!isAudioOn}
          isChecked={isPitchExtracting}
          onChange={handlePitchToggle}
        />
      </FormControl>

      <div>Latest pitch: {latestPitch.toFixed(1)} Hz</div>
      <div>Latest volume: {latestVolume.toFixed(3)}</div>
    </VStack>
  );
}