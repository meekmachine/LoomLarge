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
  Button
} from '@chakra-ui/react';

/**
 * SaveModal
 * ---------
 * Props:
 *  - isOpen: boolean
 *  - onClose: function
 *  - filename: string (the current filename or key name)
 *  - setFilename: function to update filename or key name
 *  - onSave: function to actually handle the save (could be JSON or localStorage)
 *  - title?: custom modal title (optional)
 *  - label?: custom label for the input (optional)
 */
export default function SaveModal({
  isOpen,
  onClose,
  filename,
  setFilename,
  onSave,
  title = 'Save Configuration',
  label = 'Filename'
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>{label}</FormLabel>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. myAnimation.json or myAnimKey"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={onSave}
          >
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}