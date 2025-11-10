import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  Box,
  Text,
  useToast,
  useDisclosure,
  IconButton,
  Accordion
} from '@chakra-ui/react';

import { FaBars } from 'react-icons/fa';

import { ActionUnitsList, VisemesList, getAvailableAUIds } from '../unity/facs/shapeDict';
import GlobalStyles from './GlobalStyles';
import FaceResetAndToggles from './FaceResetAndToggles';
import PlaybackControlsPanel from './PlaybackControlsPanel';
import AUSection from './AUSection';
import SaveConfigModal from './SaveConfigModal';
import LoadConfigModal from './LoadConfigModal';
import VisemeCurveEditor from './VisemeCurveEditor';
import VisemeSlider from './VisemeSlider';
import TextAreaUI from './TextAreaUI';
import DockableAccordionItem from './DockableAccordionItem';

const windowMp3 = `${process.env.PUBLIC_URL}/window.mp3`;

export default function SliderDrawer({
  auStates, setAuStates,
  visemeStates, setVisemeStates,
  animationService,
  drawerControls, setDrawerControls
}) {
  const toast = useToast();
  const audioRef = useRef(new Audio(windowMp3));

  const {
    isOpen: isSaveOpen,
    onOpen: onSaveOpen,
    onClose: onSaveClose
  } = useDisclosure();
  const {
    isOpen: isLoadOpen,
    onOpen: onLoadOpen,
    onClose: onLoadClose
  } = useDisclosure();

  const [filename, setFilename] = useState('au-configuration.json');

  // We rename "useTimeBased" => curve editor mode
  const useCurveEditor = drawerControls.useTimeBased;

  // For aggregator-based playback => currentTime, maxTime, isLooping
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(5);
  const [isLooping, setIsLooping] = useState(false);

  // segmentation: 'section' or 'area'
  const [segmentationMode, setSegmentationMode] = useState('section');
  // useAUVisemeMode => merges synergy logic
  const [useAUsVisemeMode, setUseAUsVisemeMode] = useState(false);

  // Dynamically filtered AU list based on active rig
  const [activeAUSet, setActiveAUSet] = useState(() => getAvailableAUIds());

  // Listen for rig swap -> update AU availability
  useEffect(() => {
    function handleModeChange() {
      setActiveAUSet(getAvailableAUIds());
    }
    document.addEventListener('blendshapeModeChanged', handleModeChange);
    return () => document.removeEventListener('blendshapeModeChanged', handleModeChange);
  }, []);

  // Play audio effect => open/close
  useEffect(() => {
    const audio = audioRef.current;
    const playFirstSegment = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.play();
      const stopTimer = setTimeout(() => {
        audio.pause();
      }, 1300);
      return () => clearTimeout(stopTimer);
    };

    const playLastSegment = () => {
      const seekAndPlay = () => {
        audio.pause();
        audio.currentTime = Math.max(0, audio.duration - 1.3);
        audio.play();
        const stopTimer = setTimeout(() => {
          audio.pause();
        }, 1300);
        return () => clearTimeout(stopTimer);
      };
      if (audio.readyState >= 1) {
        return seekAndPlay();
      } else {
        const onMetadata = () => {
          seekAndPlay();
        };
        audio.addEventListener('loadedmetadata', onMetadata, { once: true });
        return () => audio.removeEventListener('loadedmetadata', onMetadata);
      }
    };

    if (drawerControls.isOpen) {
      return playFirstSegment();
    } else {
      return playLastSegment();
    }
  }, [drawerControls.isOpen]);


/**
 * 2) Subscribe ⇒ animationService ⇒ aggregator
 *    Tracks currentTime / maxTime / loop state
 *    AND copies visemeSnippet curves into visemeStates
 */
useEffect(() => {
  if (!animationService) return;

  const unsub = animationService.onTransition((state) => {
    if (!state.changed || !state.context) return;

    // ── Playback state for the drawer header ──
    setCurrentTime(state.context.currentTime || 0);
    setIsLooping(state.context.loop || false);
    setMaxTime(state.context.overallMaxTime || 5);

    // ── Bring viseme curves into React state so VisemeCurveEditor can render ──
    const visemeUpdates = {};
    (state.context.animations || [])
      .filter(sn => sn.snippetCategory === 'visemeSnippet')
      .forEach(sn => {
        const curves = sn.curves || {};
        Object.entries(curves).forEach(([vId, kfs]) => {
          visemeUpdates[vId] = {
            intensity: visemeStates[vId]?.intensity || 0,
            notes:     visemeStates[vId]?.notes     || '',
            keyframes: kfs.map(fr => ({ ...fr }))   // clone so React owns it
          };
        });
      });

    if (Object.keys(visemeUpdates).length) {
      setVisemeStates(prev => ({ ...prev, ...visemeUpdates }));
    }
  });

  // Cleanup
  return () => unsub?.();
}, [animationService, visemeStates]);

  // Toggle “Use AUs for Visemes”
  function handleVisemeModeToggle(val) {
    setUseAUsVisemeMode(val);
  }

  // NEUTRAL => zero everything
  function setFaceToNeutral() {
    // Reset local UI state
    setAuStates(prev => Object.fromEntries(Object.keys(prev).map(id => [id, { ...prev[id], intensity: 0 }])));
    setVisemeStates(prev => Object.fromEntries(Object.keys(prev).map(id => [id, { ...prev[id], intensity: 0 }])));
    // Send zero targets through animationService (one‑shot snippets)
    Object.keys(ActionUnitsList).forEach(id => animationService?.setTargetAU(id, 0, 200));
    Object.keys(VisemesList).forEach(id => {
      const slot = id === '0' ? 0 : (parseInt(id, 10) - 1);
      animationService?.setTargetViseme(slot, 0, 200);
    });
    toast({
      title: 'Face reset to neutral',
      description: 'All AUs & visemes zeroed',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  }

  // Save => single-intensity => ignore keyframes
  function saveConfiguration() {
    const nonZeroAUs = Object.entries(auStates)
      .filter(([_, au]) => au.intensity > 0)
      .map(([id, au]) => ({
        id,
        intensity: au.intensity / 90,
        duration: 750,
        explanation: au.notes || ''
      }));

    const data = JSON.stringify(nonZeroAUs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuration Saved',
      description: `Saved as ${filename}`,
      status: 'success',
      duration: 3000
    });
    onSaveClose();
  }

  // Load => merges single-intensity
  function loadConfiguration(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setFaceToNeutral();
      const text = evt.target.result;
      try {
        const arr = JSON.parse(text);
        const updated = arr.reduce((acc, { id, intensity }) => {
          acc[id] = { intensity: intensity * 90, notes: '', keyframes: [] };
          return acc;
        }, {});
        setAuStates(prev => ({ ...prev, ...updated }));
        toast({
          title: 'Configuration Loaded',
          description: 'AU config from JSON',
          status: 'success',
          duration: 3000
        });
      } catch (err) {
        toast({
          title: 'Error loading JSON',
          description: err?.message || 'Invalid file',
          status: 'error',
          duration: 3000
        });
      }
    };
    reader.readAsText(file);
  }

  // Filtered AU list based on available AUs in rig
  const filteredActionUnits = useMemo(() => {
    return ActionUnitsList.filter(au => activeAUSet.has(au.id));
  }, [activeAUSet]);

  // Build groups => “section” or “area”
  const auGroups = useMemo(() => {
    if (segmentationMode === 'section') {
      return filteredActionUnits.reduce((acc, au) => {
        const sec = au.faceSection || 'Other';
        (acc[sec] = acc[sec] || []).push(au);
        return acc;
      }, {});
    } else {
      return filteredActionUnits.reduce((acc, au) => {
        const area = au.faceArea || 'Other';
        (acc[area] = acc[area] || []).push(au);
        return acc;
      }, {});
    }
  }, [segmentationMode, filteredActionUnits]);

  // Compute which AUs are present in current animation curves
  const usedAUIds = useMemo(() => {
    if (!animationService) return new Set();
    const anims = animationService.getState().context.animations || [];
    const setIds = new Set();
    anims.forEach(snippet => {
      Object.keys(snippet.curves || {}).forEach(id => setIds.add(id));
    });
    return setIds;
  }, [animationService]);

  // List of unused AUs
  const unusedAUs = useMemo(() => {
    return filteredActionUnits.filter(au => !usedAUIds.has(au.id));
  }, [usedAUIds, filteredActionUnits]);

  // Possibly auto-collapse => expand only sections with usage
  const [expandedItems, setExpandedItems] = useState([]);
  useEffect(() => {
    if (!drawerControls.showUnusedSliders) {
      const activeSections = new Set();
      for (const [id, auObj] of Object.entries(auStates)) {
        if (auObj.intensity > 0) {
          const found = ActionUnitsList.find(item => item.id === id);
          if (found) {
            const sec = (segmentationMode === 'section')
              ? found.faceSection || 'Other'
              : found.faceArea || 'Other';
            activeSections.add(sec);
          }
        }
      }
      setExpandedItems([...activeSections]);
    }
  }, [auStates, drawerControls.showUnusedSliders, segmentationMode]);

  // Filter => hide sections if no usage
  const filteredSections = useMemo(() => {
    const allEntries = Object.entries(auGroups); // [ [section, [aus...]], ... ]
    if (drawerControls.showUnusedSliders) {
      return allEntries;
    }
    return allEntries.filter(([sec, aus]) =>
      aus.some(a => auStates[a.id]?.intensity > 0)
    );
  }, [auGroups, auStates, drawerControls.showUnusedSliders]);

  function handleTextSubmit(text) {
    console.log('Submitted text =>', text);
  }

  // aggregator => playback controls
  function handlePlay() {
    animationService?.play();
  }
  function handlePause() {
    animationService?.pause();
  }
  function handleStop() {
    animationService?.stop();
  }
  function handleSetLoop(val) {
    setIsLooping(val);
    animationService?.setLoop(val);
  }
  function handleSetMaxTime(val) {
    setMaxTime(val);
    animationService?.setMaxTime(val);
  }

  return (
    <>
      <GlobalStyles />
      <IconButton
        icon={<FaBars />}
        onClick={() => setDrawerControls({ ...drawerControls, isOpen: !drawerControls.isOpen })}
        position="fixed"
        top="1rem"
        left="1rem"
        zIndex="overlay"
        colorScheme="teal"
        aria-label="Menu"
      />

      <Drawer
        isOpen={drawerControls.isOpen}
        placement="left"
        onClose={() => setDrawerControls({ ...drawerControls, isOpen: false })}
        size="md"
      >
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            Adjust Animation Units
          </DrawerHeader>
          <FaceResetAndToggles
            drawerControls={drawerControls}
            setDrawerControls={setDrawerControls}
            useAUsVisemeMode={useAUsVisemeMode}
            onToggleVisemeMode={handleVisemeModeToggle}
            segmentationMode={segmentationMode}
            onToggleSegmentation={() =>
              setSegmentationMode(prev => prev === 'section' ? 'area' : 'section')
            }
            onResetNeutral={setFaceToNeutral}
            onOpenSave={onSaveOpen}
            onOpenLoad={onLoadOpen}
          />

          <DrawerBody>
            <Accordion allowMultiple>
              <PlaybackControlsPanel
                drawerControls={drawerControls}
                setDrawerControls={setDrawerControls}
                currentTime={currentTime}
                maxTime={maxTime}
                isLooping={isLooping}
                onSetLoop={handleSetLoop}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSetMaxTime={handleSetMaxTime}
                animationService={animationService}
              />

              {filteredSections.map(([section, aus]) => (
                <AUSection
                  key={section}
                  section={section}
                  aus={aus}
                  useCurveEditor={useCurveEditor}
                  drawerControls={drawerControls}
                  auStates={auStates}
                  animationService={animationService}
                  currentTime={currentTime}
                  setAuStates={setAuStates}
                />
              ))}

              {/* 2) Text Input => orchard / TTS */}
              <DockableAccordionItem title="Text Input">
                <TextAreaUI onSubmit={handleTextSubmit} />
              </DockableAccordionItem>

              {/* 3) Visemes => single-intensity => merges from machine transitions */}
              <DockableAccordionItem title="Visemes">
                <VStack spacing={4} mt={2}>
                  {Object.entries(visemeStates).map(([id, vObj]) => {
                    const foundVis = VisemesList.find(x => String(x.id) === String(id));
                    const phoneme = foundVis?.name || id;

                    if (!drawerControls.showUnusedSliders && vObj.intensity <= 0 && !useCurveEditor) {
                      return null;
                    }

                    // If desired, you could add a Viseme curve editor as well
                    return (
                      <Box key={id} w="100%">
                        <Text fontSize="sm">{phoneme}</Text>

                        {useCurveEditor ? (
                          /* ─── Curve-editor when time-based mode is ON ─── */
                          <VisemeCurveEditor
                            viseme={id}
                            name={phoneme}
                            initialKeyframes={vObj.keyframes || []}
                            notes={vObj.notes}
                            maxTime={maxTime}
                            timeIndicator={currentTime}
                            onImmediateVisemeChange={(newIntensity) => {
                              animationService?.setTargetViseme(id === '0' ? 0 : (parseInt(id,10)-1), newIntensity, 0);
                            }}
                            onChange={(newKfs) => {
                              setVisemeStates(prev => ({
                                ...prev,
                                [id]: { ...prev[id], keyframes: newKfs }
                              }));
                            }}
                          />
                        ) : (
                          /* ─── Simple slider when curve-editor mode is OFF ─── */
                          <VisemeSlider
                            viseme={id}
                            intensity={vObj.intensity}
                            notes={vObj.notes}
                            onChange={(val, note) => {
                              setVisemeStates(prev => ({
                                ...prev,
                                [id]: { ...prev[id], intensity: val, notes: note }
                              }));
                              animationService?.setTargetViseme(id === '0' ? 0 : (parseInt(id,10)-1), val, 0);
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              </DockableAccordionItem>
            </Accordion>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <SaveConfigModal
        isOpen={isSaveOpen}
        onClose={onSaveClose}
        filename={filename}
        setFilename={setFilename}
        onSave={saveConfiguration}
      />
      <LoadConfigModal
        isOpen={isLoadOpen}
        onClose={onLoadClose}
        onLoad={loadConfiguration}
      />
    </>
  );
}