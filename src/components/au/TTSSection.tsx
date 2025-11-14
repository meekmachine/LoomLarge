import React, { useState, useRef, useEffect } from 'react';
import {
  VStack,
  Textarea,
  Button,
  HStack,
  Select,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Box,
  Badge,
} from '@chakra-ui/react';
import DockableAccordionItem from './DockableAccordionItem';
import { EngineThree } from '../../engine/EngineThree';
import { createTTSService } from '../../latticework/tts';
import { createLipSyncService } from '../../latticework/lipsync';
import type { TTSService } from '../../latticework/tts/ttsService';
import type { LipSyncService } from '../../latticework/lipsync/lipSyncService';
import { useThreeState } from '../../context/threeContext';
import { getARKitVisemeKey, getARKitVisemeIndex, getJawAmountForViseme } from '../../latticework/lipsync/visemeToARKit';

interface TTSSectionProps {
  engine?: EngineThree;
  disabled?: boolean;
}

/**
 * TTS Section - Text-to-Speech with integrated lip-sync and prosodic gestures
 *
 * Features:
 * - WebSpeech API for cross-platform text-to-speech
 * - Phoneme extraction → SAPI viseme mapping → ARKit morphs
 * - Animation service scheduling for smooth, wall-clock anchored playback
 * - Natural motion with easing curves (anticipation, overshoot, settle, decay)
 * - Coarticulation modeling (15% residual between adjacent visemes)
 * - Dynamic durations (vowels 150ms, consonants 80ms)
 * - Automatic neutral return at word boundaries and speech end
 * - Coordinated jaw movements (AU 26) with viseme shapes
 * - Optional prosodic gestures (brow raises every 3 words)
 *
 * Architecture:
 * 1. TTS service fires word boundary events
 * 2. LipSync service extracts phonemes → visemes for each word
 * 3. Build animation snippet with smooth curves for all visemes
 * 4. Schedule through animation service at priority 50 (high)
 * 5. Animation scheduler applies to ARKit morphs at 60fps
 * 6. Smooth return to neutral state after word/speech ends
 */
export default function TTSSection({ engine, disabled = false }: TTSSectionProps) {
  const { anim } = useThreeState();
  const [text, setText] = useState('The saddest aspect of life right now is that science gathers knowledge faster than society gathers wisdom.');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('idle');
  const [jawActivation, setJawActivation] = useState(1.5); // Default to 1.5x for more visible jaw movement
  const [lipsyncIntensity, setLipsyncIntensity] = useState(1.0);

  // Service references
  const ttsRef = useRef<TTSService | null>(null);
  const lipSyncRef = useRef<LipSyncService | null>(null);
  const wordIndexRef = useRef(0);

  // Track all created snippets for cleanup (separate by agency)
  const lipsyncSnippetsRef = useRef<string[]>([]); // LipSync agency: visemes + jaw
  const prosodicSnippetsRef = useRef<string[]>([]); // Prosodic agency: brow raises

  // Initialize services
  useEffect(() => {
    if (!engine || !anim) return;

    // Create LipSync service (for phoneme extraction only)
    lipSyncRef.current = createLipSyncService(
      {
        engine: 'webSpeech',
        onsetIntensity: 90,
        holdMs: 100,
        speechRate: rate,
        jawActivation,
        lipsyncIntensity,
      },
      {}
    );

    // Create TTS service
    ttsRef.current = createTTSService(
      {
        engine: 'webSpeech',
        rate,
        pitch,
        volume,
        voiceName: selectedVoice,
      },
      {
        onStart: () => {
          console.log('[TTS] Speech started');
          setIsSpeaking(true);
          setStatus('speaking');
          wordIndexRef.current = 0;

          // Clear previous snippets from both agencies
          lipsyncSnippetsRef.current = [];
          prosodicSnippetsRef.current = [];

          // Start animation playback
          anim.play();
        },
        onEnd: () => {
          console.log('[TTS] Speech ended');
          setIsSpeaking(false);
          setStatus('idle');

          // Remove all snippets from both agencies
          if (anim) {
            // Remove LipSync agency snippets (visemes + jaw)
            lipsyncSnippetsRef.current.forEach(snippetName => {
              anim.remove(snippetName);
            });
            lipsyncSnippetsRef.current = [];

            // Remove Prosodic agency snippets (brow raises)
            prosodicSnippetsRef.current.forEach(snippetName => {
              anim.remove(snippetName);
            });
            prosodicSnippetsRef.current = [];

            // Schedule a final neutral snippet to return ALL visemes and jaw to zero
            const neutralSnippet = `neutral_${Date.now()}`;
            const neutralCurves: Record<string, Array<{ time: number; intensity: number }>> = {};

            // Add neutral curves for all 15 ARKit viseme indices (0-14)
            for (let i = 0; i < 15; i++) {
              neutralCurves[i.toString()] = [
                { time: 0.0, intensity: 0 },
                { time: 0.3, intensity: 0 },
              ];
            }

            // Add jaw closure (AU 26)
            neutralCurves['26'] = [
              { time: 0.0, intensity: 0 },
              { time: 0.3, intensity: 0 },
            ];

            anim.schedule({
              name: neutralSnippet,
              curves: neutralCurves,
              maxTime: 0.3,
              loop: false,
              snippetCategory: 'combined', // LipSync agency: combined visemes + AU
              snippetPriority: 60,
              snippetPlaybackRate: 1.0,
              snippetIntensityScale: 1.0,
            });

            // Remove neutral snippet after it completes
            setTimeout(() => {
              anim.remove(neutralSnippet);
            }, 350);
          }
        },
        onBoundary: ({ word, charIndex }) => {
          console.log(`[TTS] Word boundary: "${word}" at ${charIndex}`);

          // Extract visemes for this word using phoneme extraction
          if (lipSyncRef.current && word && anim) {
            const visemeTimeline = lipSyncRef.current.extractVisemeTimeline(word);
            console.log(`[TTS] Extracted ${visemeTimeline.length} visemes for "${word}":`, visemeTimeline);

            // Create combined curves for both visemes AND jaw in ONE snippet
            const combinedCurves: Record<string, Array<{ time: number; intensity: number }>> = {};

            // Process each viseme and add both viseme and jaw curves
            visemeTimeline.forEach((visemeEvent, idx) => {
              // Convert SAPI viseme ID to ARKit viseme index (0-14) for proper morph mapping
              const arkitIndex = getARKitVisemeIndex(visemeEvent.visemeId);
              const visemeId = arkitIndex.toString();
              const timeInSec = visemeEvent.offsetMs / 1000;
              const durationInSec = visemeEvent.durationMs / 1000;

              // Smoother, more natural timing with anticipation
              const anticipation = durationInSec * 0.1; // Small anticipation
              const attack = durationInSec * 0.25; // Attack to peak
              const sustain = durationInSec * 0.45; // Hold at peak
              const release = durationInSec * 0.2; // Release back to zero

              // Initialize curve array if needed
              if (!combinedCurves[visemeId]) {
                combinedCurves[visemeId] = [];
              }

              // Check if previous viseme was same - if so, don't go to zero
              const lastKeyframe = combinedCurves[visemeId][combinedCurves[visemeId].length - 1];
              const startIntensity = (lastKeyframe && lastKeyframe.time > timeInSec - 0.02)
                ? lastKeyframe.intensity
                : 0;

              // Viseme animation with smooth, natural motion
              combinedCurves[visemeId].push(
                { time: timeInSec, intensity: startIntensity }, // Start from previous or zero
                { time: timeInSec + anticipation, intensity: 30 * lipsyncIntensity }, // Gentle anticipation
                { time: timeInSec + attack, intensity: 95 * lipsyncIntensity }, // Quick to peak
                { time: timeInSec + sustain, intensity: 100 * lipsyncIntensity }, // Hold at peak
                { time: timeInSec + durationInSec, intensity: 0 } // Smooth release
              );

              // Add jaw activation coordinated with viseme
              const jawAmount = getJawAmountForViseme(visemeEvent.visemeId);
              if (jawAmount > 0.05) { // Only animate jaw if significant movement
                if (!combinedCurves['26']) {
                  combinedCurves['26'] = [];
                }

                // Jaw moves slower and smoother than lips
                const jawAnticipation = durationInSec * 0.15;
                const jawAttack = durationInSec * 0.3;
                const jawSustain = durationInSec * 0.4;

                const lastJawKeyframe = combinedCurves['26'][combinedCurves['26'].length - 1];
                const startJawIntensity = (lastJawKeyframe && lastJawKeyframe.time > timeInSec - 0.02)
                  ? lastJawKeyframe.intensity
                  : 0;

                combinedCurves['26'].push(
                  { time: timeInSec, intensity: startJawIntensity },
                  { time: timeInSec + jawAnticipation, intensity: jawAmount * 20 * jawActivation }, // Gentle start
                  { time: timeInSec + jawAttack, intensity: jawAmount * 90 * jawActivation }, // Rise to peak
                  { time: timeInSec + jawSustain, intensity: jawAmount * 100 * jawActivation }, // Hold
                  { time: timeInSec + durationInSec, intensity: 0 } // Smooth close
                );
              }
            });

            // Calculate max time with neutral hold
            const lastVisemeEndTime = visemeTimeline.length > 0
              ? Math.max(...visemeTimeline.map(v => (v.offsetMs + v.durationMs) / 1000))
              : 0;
            const maxTime = lastVisemeEndTime + 0.05; // Short 50ms neutral hold

            // Create a SINGLE snippet with both visemes and jaw
            // Name it with the word for easy identification
            const snippetName = `lipsync:${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

            anim.schedule({
              name: snippetName,
              curves: combinedCurves,
              maxTime,
              loop: false,
              snippetCategory: 'combined', // Combined visemes + AU
              snippetPriority: 50,
              snippetPlaybackRate: rate,
              snippetIntensityScale: 1.0,
            });

            // Track snippet for cleanup (LipSync agency)
            lipsyncSnippetsRef.current.push(snippetName);
            console.log(`[TTS] Scheduled snippet "${snippetName}" with ${Object.keys(combinedCurves).length} curves, duration: ${maxTime.toFixed(3)}s`);
          }

          // === PROSODIC EXPRESSION AGENCY (SEPARATE FROM LIP-SYNC) ===
          // Varied prosodic gestures for natural speech emphasis
          if (anim) {
            const wordMod = wordIndexRef.current % 6;

            // Pattern 1: Brow raise + subtle head tilt (every 3 words)
            if (wordMod === 0) {
              const gestureTime = Date.now();
              const gestureName = `prosodic:emphasis_${gestureTime}`;
              anim.schedule({
                name: gestureName,
                curves: {
                  '1': [ // Inner brow raiser (AU1)
                    { time: 0.0, intensity: 0 },
                    { time: 0.15, intensity: 35 },
                    { time: 0.45, intensity: 45 },
                    { time: 0.75, intensity: 0 },
                  ],
                  '2': [ // Outer brow raiser (AU2)
                    { time: 0.0, intensity: 0 },
                    { time: 0.15, intensity: 25 },
                    { time: 0.45, intensity: 35 },
                    { time: 0.75, intensity: 0 },
                  ],
                  '55': [ // Head tilt left (AU55) - subtle
                    { time: 0.0, intensity: 0 },
                    { time: 0.25, intensity: 15 },
                    { time: 0.65, intensity: 15 },
                    { time: 0.95, intensity: 0 },
                  ],
                },
                maxTime: 0.95,
                loop: false,
                snippetCategory: 'prosodic',
                snippetPriority: 30,
                snippetPlaybackRate: 1.0,
                snippetIntensityScale: 0.8,
              });
              prosodicSnippetsRef.current.push(gestureName);
              console.log(`[Prosodic] Brow + tilt emphasis "${gestureName}"`);
            }

            // Pattern 2: Head nod (every 4 words) - more pronounced
            else if (wordMod === 3) {
              const gestureTime = Date.now();
              const gestureName = `prosodic:nod_${gestureTime}`;
              anim.schedule({
                name: gestureName,
                curves: {
                  '33': [ // Head turn up (AU33) - nod down motion (increased intensity)
                    { time: 0.0, intensity: 0 },
                    { time: 0.15, intensity: 40 },  // Faster attack, higher intensity
                    { time: 0.4, intensity: 50 },   // Higher peak
                    { time: 0.75, intensity: 0 },   // Slightly longer duration
                  ],
                },
                maxTime: 0.75,
                loop: false,
                snippetCategory: 'prosodic',
                snippetPriority: 30,
                snippetPlaybackRate: 1.0,
                snippetIntensityScale: 0.9,  // Increased from 0.7 to 0.9
              });
              prosodicSnippetsRef.current.push(gestureName);
              console.log(`[Prosodic] Head nod "${gestureName}"`);
            }

            // Pattern 3: Subtle frown for contemplative tone (every 5 words)
            else if (wordMod === 4) {
              const gestureTime = Date.now();
              const gestureName = `prosodic:contemplate_${gestureTime}`;
              anim.schedule({
                name: gestureName,
                curves: {
                  '4': [ // Brow lowerer (AU4) - subtle frown
                    { time: 0.0, intensity: 0 },
                    { time: 0.2, intensity: 18 },
                    { time: 0.6, intensity: 22 },
                    { time: 1.0, intensity: 0 },
                  ],
                  '1': [ // Inner brow raiser (AU1) - slight counter for pensiveness
                    { time: 0.0, intensity: 0 },
                    { time: 0.25, intensity: 12 },
                    { time: 0.65, intensity: 12 },
                    { time: 1.0, intensity: 0 },
                  ],
                },
                maxTime: 1.0,
                loop: false,
                snippetCategory: 'prosodic',
                snippetPriority: 30,
                snippetPlaybackRate: 1.0,
                snippetIntensityScale: 0.6,
              });
              prosodicSnippetsRef.current.push(gestureName);
              console.log(`[Prosodic] Contemplative frown "${gestureName}"`);
            }
          }

          wordIndexRef.current++;
        },
        onError: (error) => {
          console.error('[TTS] Error:', error);
          setStatus('error');
          setIsSpeaking(false);
        },
      }
    );

    // Load voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0].name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cleanup
    return () => {
      ttsRef.current?.dispose();
      lipSyncRef.current?.dispose();

      // Remove any remaining snippets from both agencies
      lipsyncSnippetsRef.current.forEach(snippetName => {
        anim.remove(snippetName);
      });
      lipsyncSnippetsRef.current = [];

      prosodicSnippetsRef.current.forEach(snippetName => {
        anim.remove(snippetName);
      });
      prosodicSnippetsRef.current = [];
    };
  }, [engine, anim, rate, jawActivation, lipsyncIntensity]);

  // Update TTS config when parameters change
  useEffect(() => {
    if (ttsRef.current) {
      ttsRef.current.updateConfig({ rate, pitch, volume });
    }
    if (lipSyncRef.current) {
      lipSyncRef.current.updateConfig({
        speechRate: rate,
        jawActivation,
        lipsyncIntensity,
      });
    }
  }, [rate, pitch, volume, jawActivation, lipsyncIntensity]);

  // Update voice
  useEffect(() => {
    if (ttsRef.current && selectedVoice) {
      ttsRef.current.setVoice(selectedVoice);
    }
  }, [selectedVoice]);

  const handleSpeak = async () => {
    if (!ttsRef.current || !text.trim()) return;

    try {
      setStatus('loading');
      await ttsRef.current.speak(text);
    } catch (error) {
      console.error('Speech error:', error);
      setStatus('error');
    }
  };

  const handleStop = () => {
    ttsRef.current?.stop();
    lipSyncRef.current?.stop();
    setIsSpeaking(false);
    setStatus('idle');

    // Remove all snippets from both agencies
    if (anim) {
      // Remove LipSync agency snippets (visemes + jaw)
      lipsyncSnippetsRef.current.forEach(snippetName => {
        anim.remove(snippetName);
      });
      lipsyncSnippetsRef.current = [];

      // Remove Prosodic agency snippets (brow raises)
      prosodicSnippetsRef.current.forEach(snippetName => {
        anim.remove(snippetName);
      });
      prosodicSnippetsRef.current = [];

      // Schedule a final neutral snippet to return ALL visemes and jaw to zero
      const neutralSnippet = `neutral_stop_${Date.now()}`;
      const neutralCurves: Record<string, Array<{ time: number; intensity: number }>> = {};

      // Add neutral curves for all 15 ARKit viseme indices (0-14)
      for (let i = 0; i < 15; i++) {
        neutralCurves[i.toString()] = [
          { time: 0.0, intensity: 0 },
          { time: 0.3, intensity: 0 },
        ];
      }

      // Add jaw closure (AU 26)
      neutralCurves['26'] = [
        { time: 0.0, intensity: 0 },
        { time: 0.3, intensity: 0 },
      ];

      anim.schedule({
        name: neutralSnippet,
        curves: neutralCurves,
        maxTime: 0.3,
        loop: false,
        snippetCategory: 'combined', // LipSync agency: combined visemes + AU
        snippetPriority: 60,
        snippetPlaybackRate: 1.0,
        snippetIntensityScale: 1.0,
      });

      // Remove neutral snippet after it completes
      setTimeout(() => {
        anim.remove(neutralSnippet);
      }, 350);
    }
  };

  return (
    <DockableAccordionItem title="Text-to-Speech">
      <VStack spacing={4} mt={2} align="stretch">
        {/* Status Badge */}
        <HStack>
          <Text fontSize="xs" fontWeight="bold">Status:</Text>
          <Badge
            colorScheme={
              status === 'speaking' ? 'green' :
              status === 'loading' ? 'yellow' :
              status === 'error' ? 'red' :
              'gray'
            }
          >
            {status.toUpperCase()}
          </Badge>
        </HStack>

        {/* Text Input */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..."
          size="sm"
          rows={4}
          disabled={disabled || isSpeaking}
        />

        {/* Voice Selection */}
        <Box>
          <Text fontSize="xs" mb={1}>Voice</Text>
          <Select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            size="sm"
            disabled={disabled || isSpeaking}
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </Select>
        </Box>

        {/* Rate Control */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Rate</Text>
            <Text fontSize="xs" fontWeight="bold">{rate.toFixed(1)}x</Text>
          </HStack>
          <Slider
            value={rate}
            onChange={setRate}
            min={0.5}
            max={2.0}
            step={0.1}
            isDisabled={disabled || isSpeaking}
          >
            <SliderTrack>
              <SliderFilledTrack bg="teal.400" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        {/* Pitch Control */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Pitch</Text>
            <Text fontSize="xs" fontWeight="bold">{pitch.toFixed(1)}</Text>
          </HStack>
          <Slider
            value={pitch}
            onChange={setPitch}
            min={0.5}
            max={2.0}
            step={0.1}
            isDisabled={disabled || isSpeaking}
          >
            <SliderTrack>
              <SliderFilledTrack bg="purple.400" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        {/* Volume Control */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Volume</Text>
            <Text fontSize="xs" fontWeight="bold">{Math.round(volume * 100)}%</Text>
          </HStack>
          <Slider
            value={volume}
            onChange={setVolume}
            min={0}
            max={1.0}
            step={0.1}
            isDisabled={disabled || isSpeaking}
          >
            <SliderTrack>
              <SliderFilledTrack bg="blue.400" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        {/* Jaw Activation Control */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Jaw Activation</Text>
            <Text fontSize="xs" fontWeight="bold">{jawActivation.toFixed(1)}x</Text>
          </HStack>
          <Slider
            value={jawActivation}
            onChange={setJawActivation}
            min={0}
            max={2.0}
            step={0.1}
            isDisabled={disabled || isSpeaking}
          >
            <SliderTrack>
              <SliderFilledTrack bg="orange.400" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        {/* Lipsync Intensity Control */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs">Lipsync Intensity</Text>
            <Text fontSize="xs" fontWeight="bold">{lipsyncIntensity.toFixed(1)}x</Text>
          </HStack>
          <Slider
            value={lipsyncIntensity}
            onChange={setLipsyncIntensity}
            min={0}
            max={2.0}
            step={0.1}
            isDisabled={disabled || isSpeaking}
          >
            <SliderTrack>
              <SliderFilledTrack bg="pink.400" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        {/* Control Buttons */}
        <HStack spacing={2}>
          <Button
            onClick={handleSpeak}
            colorScheme="teal"
            size="sm"
            isDisabled={disabled || isSpeaking || !text.trim()}
            flex={1}
          >
            Speak
          </Button>
          <Button
            onClick={handleStop}
            colorScheme="red"
            size="sm"
            isDisabled={disabled || !isSpeaking}
            flex={1}
          >
            Stop
          </Button>
        </HStack>

        {/* Info */}
        <Text fontSize="2xs" color="gray.500">
          Integrated: TTS + LipSync + Prosodic Gestures
        </Text>
      </VStack>
    </DockableAccordionItem>
  );
}
