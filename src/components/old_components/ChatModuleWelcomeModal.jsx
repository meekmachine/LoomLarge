// src/components/ChatModuleWelcomeModal.js
import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button } from '@chakra-ui/react';

const ChatModuleWelcomeModal = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={true} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Welcome!</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    Welcome to the chat module. I'm here to assist you with anything you need.
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onClose}>
                        Start Chat
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ChatModuleWelcomeModal;