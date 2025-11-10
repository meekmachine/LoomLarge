import React from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button } from '@chakra-ui/react';

const FinishModal = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Thank You for Participating!</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <p>Your contributions are valuable. We appreciate your time.</p>
          <Button colorScheme="blue" onClick={onClose}>Close</Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FinishModal;
