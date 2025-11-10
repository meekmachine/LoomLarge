import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button
} from '@chakra-ui/react';

function WelcomeModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Welcome to the Savoir-Faire Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <p>This quiz is designed to test your knowledge and understanding of facial expressions and their nuances. Please agree to participate and follow the prompts carefully.</p>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Agree and Start
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default WelcomeModal;
