import React, { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import TrafficLightIndicator from './TrafficLightIndicator';
import ChatModuleWelcomeModal from './ChatModuleWelcomeModal';  // Import the modal component

const ChatModule = ({ appState, setAppState, toast }) => {
    const [status, setStatus] = useState('listening');
    const [isModalOpen, setIsModalOpen] = useState(!appState.welcomeModalClosed);  // Modal open state

    useEffect(() => {
        setStatus(appState.isTalking ? 'talking' : 'listening');
    }, [appState.isTalking, appState.isListening]);

    // Ensure the welcome modal is open at the start if it hasn't been closed
    useEffect(() => {
        if (!appState.welcomeModalClosed) {
            setIsModalOpen(true);  // Show the welcome modal at the start
        }
    }, [appState.welcomeModalClosed]);

    // Handle closing the modal and starting the conversation
    const handleModalClose = () => {
        setIsModalOpen(false);  // Close the modal
        setAppState((prevState) => ({ ...prevState, welcomeModalClosed: true }));
    };

    return (
        <div>
            {/* Welcome Modal */}
            <ChatModuleWelcomeModal isOpen={isModalOpen} onClose={handleModalClose} />

            {/* Traffic Light Indicator */}
            <TrafficLightIndicator status={status} />
        </div>
    );
};

export default ChatModule;