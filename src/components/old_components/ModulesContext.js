import React, { createContext, useContext, useState } from 'react';

// Create a context for the modules
const ModulesContext = createContext(null);

// Custom hook to use the context
export const useModulesContext = () => {
    const context = useContext(ModulesContext);
    if (!context) {
        throw new Error('useModulesContext must be used within a ModulesProvider');
    }
    return context;
};

// Provider component
export const ModulesProvider = ({ children }) => {
    const [isTalking, setIsTalking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcribedText, setTranscribedText] = useState(null);
    const [speakingText, setSpeakingText] = useState(null);

    const value = {
        isTalking, setIsTalking,
        isListening, setIsListening,
        transcribedText, setTranscribedText,
        speakingText, setSpeakingText,
    };

    return (
        <ModulesContext.Provider value={value}>
            {children}
        </ModulesContext.Provider>
    );
};