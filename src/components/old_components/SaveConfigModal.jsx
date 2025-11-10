

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast
} from '@chakra-ui/react';

export default function SaveConfigModal({
  isOpen,
  onClose,
  filename,
  setFilename,
  onSave
}) {
  const toast = useToast();

  function handleSave() {
    onSave(filename);
    toast({
      title: 'Configuration Saved',
      description: `Saved as ${filename}`,
      status: 'success',
      duration: 3000
    });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Save Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Filename</FormLabel>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleSave}>
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}