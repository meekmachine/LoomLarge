

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Box,
  Button,
  Input,
  useToast
} from '@chakra-ui/react';
import { FaUpload } from 'react-icons/fa';

export default function LoadConfigModal({ isOpen, onClose, onLoad }) {
  const toast = useToast();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        onLoad(evt.target.result);
        toast({
          title: 'Configuration Loaded',
          description: 'AU config from JSON',
          status: 'success',
          duration: 3000
        });
        onClose();
      } catch (err) {
        toast({
          title: 'Error loading JSON',
          description: err.message,
          status: 'error',
          duration: 3000
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Load Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Select JSON File</FormLabel>
            <Box border="2px dashed" borderColor="gray.300" p={6} textAlign="center">
              <Input
                type="file"
                accept=".json"
                onChange={handleFile}
                display="none"
                id="file-upload-modal"
              />
              <label htmlFor="file-upload-modal">
                <Button leftIcon={<FaUpload />} as="span" size="sm" colorScheme="teal">
                  Select File
                </Button>
              </label>
            </Box>
          </FormControl>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}