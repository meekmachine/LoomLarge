// src/components/TextAreaUI.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast,
  Textarea
} from '@chakra-ui/react';

import { initTtsService } from '../VISOS/action/verbalizers/tts/ttsService';
import SsmlEditor from './SsmlEditor';

export default function TextAreaUI() {
  const toast = useToast();

  // The text to speak => plain or SSML
  const [text, setText] = useState(
    'If 😞 you were 😡 to insist I was a 😢robot, you might not😱 consider me 😅 capable 😠 of love in some 🙂 mystic human sense.'
  );

  // Toggles: pitchEnhance, showAllVoices, enableSsml
  const [pitchEnhance, setPitchEnhance] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [enableSsml, setEnableSsml]     = useState(false);

  // Sliders
  const [rate, setRate]     = useState(1.0);
  const [pitch, setPitch]   = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // TTS aggregator
  const [ttsAggregator, setTtsAggregator] = useState(null);

  // WebSpeech voices
  const [voices, setVoices] = useState([]);
  const [topVoices, setTopVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  // SAPI => array of objects => {id, name, culture,...}
  const [sapiVoices, setSapiVoices] = useState([]);
  const [selectedSapiVoiceName, setSelectedSapiVoiceName] = useState('');

  // engine => 'webSpeech' or 'sapi'
  const [engine, setEngine] = useState('webSpeech');

  /**
   * Single useEffect that re-initializes the aggregator
   * whenever 'engine' changes. We do NOT create aggregator outside this effect
   * so there's no duplication or race.
   */
  useEffect(() => {
    console.log('[TextAreaUI] => creating TTS aggregator => engine=', engine);
    // 1) create aggregator with current engine
    const tts = initTtsService({ engine, pitchEnhance });
    setTtsAggregator(tts);

    // 2) apply speechOptions => rate/pitch/volume
    tts.setPitchEnhance?.(pitchEnhance);
    tts.setSpeechOptions?.({ rate, pitch, volume });

    // 3) load voices => if webSpeech => local voices
    if(engine==='webSpeech'){
      if(tts.voicesLoadedPromise){
        tts.voicesLoadedPromise.then(()=>{
          const available = tts.getVoices?.() || [];
          setVoices(available);

          const best = available
            .filter(voice =>
              (voice.name.includes('Google') && ['en-US','en-GB','fr-FR'].includes(voice.lang)) ||
              voice.name.includes('Samantha')
            )
            .slice(0,5);

          setTopVoices(best);
          const def = best[0]?.name || available[0]?.name || '';
          setSelectedVoice(def);
          if(def){
            tts.findAndSetVoice?.(def);
          }
          // Clear SAPI arrays
          setSapiVoices([]);
          setSelectedSapiVoiceName('');
        });
      } else {
        // fallback if no voicesLoadedPromise
        const available = tts.getVoices?.() || [];
        setVoices(available);
        const best = available
          .filter(voice =>
            (voice.name.includes('Google') && ['en-US','en-GB','fr-FR'].includes(voice.lang)) ||
            voice.name.includes('Samantha')
          )
          .slice(0,5);

        setTopVoices(best);
        const def = best[0]?.name || available[0]?.name || '';
        setSelectedVoice(def);
        if(def){
          tts.findAndSetVoice?.(def);
        }
        setSapiVoices([]);
        setSelectedSapiVoiceName('');
      }
    }
    // 4) if engine='sapi' => aggregator => fetchSapiVoices => array of objects
    else if(engine==='sapi'){
      setVoices([]);
      setTopVoices([]);
      setSelectedVoice('');

      if(tts.fetchSapiVoices){
        tts.fetchSapiVoices().then((arr)=>{
          if(Array.isArray(arr) && arr.length>0){
            setSapiVoices(arr);
            const defObj = arr[0];
            setSelectedSapiVoiceName(defObj.name);
            tts.setSapiVoiceName?.(defObj.name);
          }
        }).catch(err=>{
          console.warn('[TextAreaUI] => fetchSapiVoices => error =>', err);
        });
      }
    }

    // Cleanup => stop aggregator
    return () => {
      console.log('[TextAreaUI] => cleaning up aggregator => engine=', engine);
      // tts.stopSpeech?.();
      // tts.dispose?.();
    };
  }, [engine, pitchEnhance, rate, pitch, volume]);

  // If user picks local voice
  function handleVoiceChange(e){
    const vName = e.target.value;
    setSelectedVoice(vName);
    ttsAggregator?.findAndSetVoice?.(vName);
  }

  // If user picks SAPI voice => aggregator => setSapiVoiceName
  function handleSapiVoiceChange(e){
    const chosenName = e.target.value; // e.g. "RS Julie"
    setSelectedSapiVoiceName(chosenName);

    const found = sapiVoices.find(v => v.name===chosenName);
    if(found){
      ttsAggregator?.setSapiVoiceName?.(found.name);
    } else {
      // fallback => aggregator might just need the name
      ttsAggregator?.setSapiVoiceName?.(chosenName);
    }
  }

  function handleEnqueueText(){
    if(!ttsAggregator) return;
    ttsAggregator.enqueueText(text, enableSsml)
      // .then(()=>{
      //   toast({
      //     title: 'Text Enqueued',
      //     description: 'Now speaking your text',
      //     status: 'info',
      //     duration: 2000
      //   });
      // });
  }
  function handleStopSpeech(){
    ttsAggregator?.stopSpeech?.();
  }
  function handleInterruptSpeech(){
    if(!ttsAggregator) return;
    const intrText= enableSsml
      ? '<speak>This is an interruption</speak>'
      : 'This is an interruption';

    if(ttsAggregator.interruptSpeech){
      ttsAggregator.interruptSpeech(intrText, enableSsml);
    } else {
      ttsAggregator.stopSpeech?.();
      ttsAggregator.enqueueText?.(intrText, enableSsml);
    }
  }

  return (
    <Box p={4}>

      {/* Engine Toggle => webSpeech vs SAPI */}
      <FormControl display="flex" alignItems="center" mb={4}>
        <FormLabel mb="0">Use SAPI Engine</FormLabel>
        <Switch
          isChecked={engine==='sapi'}
          onChange={(e)=> setEngine(e.target.checked?'sapi':'webSpeech')}
        />
      </FormControl>

      {/* pitchEnhance */}
      <FormControl display="flex" alignItems="center" mb={4}>
        <FormLabel mb="0">Pitch Enhance Lip-Syncing</FormLabel>
        <Switch
          isChecked={pitchEnhance}
          onChange={(e)=> setPitchEnhance(e.target.checked)}
        />
      </FormControl>

      {/* If engine=webSpeech => local voice => showAllVoices */}
      {engine==='webSpeech' && (
        <>
          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel mb="0">Local Voice</FormLabel>
            <Select value={selectedVoice} onChange={handleVoiceChange}>
              {(showAllVoices ? voices : topVoices).map((voiceObj, idx)=>(
                <option key={idx} value={voiceObj.name}>
                  {voiceObj.name} ({voiceObj.lang})
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel mb="0">Show All Voices</FormLabel>
            <Switch
              isChecked={showAllVoices}
              onChange={(e)=> setShowAllVoices(e.target.checked)}
            />
          </FormControl>
        </>
      )}

      {/* If engine=sapi => show SAPI voices => pick .name */}
      {engine==='sapi' && (
        <FormControl display="flex" alignItems="center" mb={4}>
          <FormLabel mb="0">SAPI Voice</FormLabel>
          <Select value={selectedSapiVoiceName} onChange={handleSapiVoiceChange}>
            {sapiVoices.map((voiceObj, idx)=>(
              <option key={voiceObj.id} value={voiceObj.name}>
                {voiceObj.name} {voiceObj.culture ? `(${voiceObj.culture})`:''}
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      {/* If not SSML => show rate/pitch/volume sliders */}
      {!enableSsml && (
        <>
          <FormControl mb={4}>
            <FormLabel>Rate (Speed): {rate.toFixed(1)}</FormLabel>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={rate}
              onChange={(val)=> setRate(val)}
            >
              <SliderTrack><SliderFilledTrack/></SliderTrack>
              <SliderThumb/>
            </Slider>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Pitch: {pitch.toFixed(1)}</FormLabel>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={pitch}
              onChange={(val)=> setPitch(val)}
            >
              <SliderTrack><SliderFilledTrack/></SliderTrack>
              <SliderThumb/>
            </Slider>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Volume: {volume.toFixed(1)}</FormLabel>
            <Slider
              min={0.0}
              max={1.0}
              step={0.1}
              value={volume}
              onChange={(val)=> setVolume(val)}
            >
              <SliderTrack><SliderFilledTrack/></SliderTrack>
              <SliderThumb/>
            </Slider>
          </FormControl>
        </>
      )}

      <FormControl display="flex" alignItems="center" mb={4}>
        <FormLabel mb="0">Enable SSML Editing</FormLabel>
        <Switch
          isChecked={enableSsml}
          onChange={(e)=> setEnableSsml(e.target.checked)}
        />
      </FormControl>

      {enableSsml ? (
        <SsmlEditor text={text} setText={setText}/>
      ) : (
        <Textarea
          rows={5}
          style={{ width:'100%', marginBottom:'16px' }}
          value={text}
          onChange={(e)=> setText(e.target.value)}
        />
      )}

      <Button colorScheme="teal" onClick={handleEnqueueText} mr={2}>
        Enqueue Text
      </Button>
      <Button colorScheme="red" onClick={handleStopSpeech} mr={2}>
        Stop Speech
      </Button>
      <Button colorScheme="yellow" onClick={handleInterruptSpeech}>
        Interrupt Speech
      </Button>
    </Box>
  );
}