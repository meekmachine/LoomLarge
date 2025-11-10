import React, { useState, useEffect } from 'react';
import Loader from './Loader';
import SliderDrawer from './SliderDrawer';
import { useUnityState } from '../unityMiddleware';
import AnimationManager from '../VISOS/effectors/visualizers/AnimationManager';
import faceLoader from '../faceLoader';  // Ensure this is the correct import for faceLoader
import { ActionUnitsList } from '../unity/facs/shapeDict';
import { useToast } from '@chakra-ui/react';
import GameText from './GameText';
import FaceDetection from './FaceDetection';
import Survey from './Survey';
import { questions } from './utils/surveyQuestions';
import { saveToFirebase } from './utils/firebaseUtils';
import expressionPrompts from './utils/expressionPrompts';  // Import the list of prompts
import WelcomeModal from './WelcomeModal'; // Import WelcomeModal
import FinishModal from './FinishModal'; // Import FinishModal

function AppSurvey() {
    const { isLoaded, facslib } = useUnityState();
    const [auStates, setAuStates] = useState(ActionUnitsList.reduce((acc, au) => ({
        ...acc, [au.id]: { intensity: 0, name: au.name, notes: "" },
    }), {}));
    const [animationManager, setAnimationManager] = useState(null);
    const [drawerControls, setDrawerControls] = useState({
        isOpen: false, showUnusedSliders: false, cameraEnabled: false,
    });
    const [currentPromptB5T, setCurrentPromptB5T] = useState('');
    const [setupComplete, setSetupComplete] = useState(false);
    const [currentPromptIndex, setCurrentPromptIndex] = useState(0); // Track the current prompt index
    const [isSurveyActive, setIsSurveyActive] = useState(false);
    const [isRequestLoading, setRequestIsLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true); // Manage welcome modal state
    const [showFinish, setShowFinish] = useState(false); // Manage finish modal state
    const toast = useToast();

    useEffect(() => {
        if (isLoaded && facslib && !animationManager) {
            const manager = new AnimationManager(facslib, setAuStates);
            setAnimationManager(manager);
            setSetupComplete(true);
        }
    }, [isLoaded, facslib]);

    useEffect(() => {
        if (setupComplete && !showWelcome && currentPromptIndex < expressionPrompts.length) {
            loadCurrentPrompt();
        }
    }, [setupComplete, showWelcome, currentPromptIndex]);

    const loadCurrentPrompt = () => {
        const currentPrompt = expressionPrompts[currentPromptIndex].prompt;
        setCurrentPromptB5T(expressionPrompts[currentPromptIndex].B5T);
        faceLoader(currentPrompt, animationManager, setIsSurveyActive, setRequestIsLoading, toast);
    };

    const handleSurveyComplete = (responses) => {
        console.log("Survey responses:", responses);
        setIsSurveyActive(false);
        const nextIndex = currentPromptIndex + 1;
        if (nextIndex < expressionPrompts.length) {
            setCurrentPromptIndex(nextIndex); // Move to the next prompt
        } else {
            setShowFinish(true); // Show finish modal after last survey
        }
        saveToFirebase('StaticExpressions', {
            responses,
            currentPromptB5T,
            actionUnits: auStates,
        }, toast);
    };

    return (
        <div className="App">
            <Loader isLoading={!isLoaded || !setupComplete} />

            {isLoaded && setupComplete && animationManager && (
                <>
                {showWelcome && <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />}
            {showFinish && <FinishModal isOpen={showFinish} onClose={() => setShowFinish(false)} />}
                    {isRequestLoading && <GameText />}
                    <SliderDrawer
                        auStates={auStates}
                        setAuStates={setAuStates}
                        animationManager={animationManager}
                        drawerControls={drawerControls}
                        setDrawerControls={setDrawerControls}
                    />
                    {isSurveyActive && (
                        <Survey
                            questions={questions}
                            currentPromptB5T={currentPromptB5T}
                            onSurveyComplete={handleSurveyComplete}
                            index={currentPromptIndex + 1}
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default AppSurvey;
