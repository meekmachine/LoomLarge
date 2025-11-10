import React, { useEffect } from 'react';
import useEmo from '../hooks/useEmo';
import DraggableVideoBox from './DraggableVideoBox';
import EmotionRadarChart from './EmotionRadarChart';
import GameText from './GameText';

const EmotionDetection = ({ onEmotionStateChange }) => {
    const { emotionState, startEmoDetection, stopEmoDetection, videoElementRef } = useEmo();

    // Start detection when component mounts and clean up when unmounting
    useEffect(() => {
        startEmoDetection();

        return () => {
            stopEmoDetection();
        };
    }, [startEmoDetection, stopEmoDetection]);

    // Pass emotionState to parent via callback
    useEffect(() => {
        if (onEmotionStateChange) {
            onEmotionStateChange(emotionState);  // Provide the updated emotion state
        }
    }, [emotionState, onEmotionStateChange]);

    return (
        <div>
            <DraggableVideoBox videoElementRef={videoElementRef} emotionState={emotionState} />
            <EmotionRadarChart emotionIntensities={emotionState.emotionIntensities} />
            {/* <GameText text={emotionState.detectedEmotion || ''} /> */}
        </div>
    );
};

export default EmotionDetection;