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
  Button
} from '@chakra-ui/react';
import { FaUpload } from 'react-icons/fa';

/**
 * LoadModal
 * ---------
 * Props:
 *  - isOpen: boolean
 *  - onClose: function
 *  - onLoadFile: callback for when user picks a .json file
 *  - title?: string (optional)
 *  - label?: string (optional)
 */
export default function LoadModal({
  isOpen,
  onClose,
  onLoadFile,
  title = 'Load Configuration',
  label = 'Select JSON File'
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
            <Box
              border="2px dashed"
              borderColor="gray.300"
              p={6}
              textAlign="center"
              borderRadius="md"
            >
              {/* Hidden input for .json file */}
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={onLoadFile}
              />
              <label htmlFor="file-upload">
                <Button
                  leftIcon={<FaUpload />}
                  as="span"
                  size="sm"
                  mt={2}
                  colorScheme="teal"
                >
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