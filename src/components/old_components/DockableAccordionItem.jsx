// DockableAccordionItem.jsx
import React, { useState, useRef } from 'react';
import {
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  HStack,
  Portal,
  IconButton,
  Text
} from '@chakra-ui/react';
import Draggable from 'react-draggable';
import { CloseIcon, DragHandleIcon } from '@chakra-ui/icons';

function DockableAccordionItem({
  title,
  isDefaultExpanded = false,
  children
}) {
  const [isDocked, setIsDocked] = useState(true);
  const [isExpanded, setIsExpanded] = useState(isDefaultExpanded);
  const [pos, setPos] = useState({ x: 150, y: 100 });

  const dragRef = useRef(null);

  const handleStop = (e, data) => {
    setPos({ x: data.x, y: data.y });
  };

  // If docked => standard Chakra Accordion usage
  if (isDocked) {
    return (
      <AccordionItem border="none">
        <h2>
          <AccordionButton
            onClick={() => setIsExpanded(!isExpanded)}
            bg="gray.100"
            _expanded={{ bg: 'gray.200' }}
          >
            <Box flex="1" textAlign="left">
              {title}
            </Box>

            {/* 
              A dock handle that is NOT a <Button>.
              We use <Box> with onClick to undock.
            */}
            <HStack
              spacing={2}
              _hover={{ '.drag-trigger': { opacity: 1, visibility: 'visible' } }}
            >
              <Box
                className="drag-trigger"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                w="20px"
                h="20px"
                opacity={0}
                visibility="hidden"
                cursor="pointer"
                onClick={(e) => {
                  // Prevent toggling the accordion
                  e.stopPropagation();
                  setIsDocked(false);
                }}
              >
                <DragHandleIcon boxSize={3} />
              </Box>

              <AccordionIcon />
            </HStack>
          </AccordionButton>
        </h2>
        {isExpanded && (
          <AccordionPanel pb={4}>
            {children}
          </AccordionPanel>
        )}
      </AccordionItem>
    );
  }

  // If undocked => render in a draggable Portal
  return (
    <Portal>
      <Draggable
        nodeRef={dragRef}
        position={pos}
        onStop={handleStop}
        handle=".drag-handle"
      >
        <Box
          ref={dragRef}
          position="absolute"
          zIndex={9999}
          w="300px"
          minW="200px"
          minH="100px"
          bg="white"
          border="1px solid #ccc"
          borderRadius="md"
          boxShadow="lg"
          sx={{ resize: 'both', overflow: 'auto' }}
        >
          {/* Title bar (drag handle) */}
          <Box
            className="drag-handle"
            bg="gray.200"
            p={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderTopRadius="md"
            cursor="move"
          >
            <Text fontWeight="bold">{title}</Text>
            {/* We can safely use <IconButton> here 
                because it's NOT in <AccordionButton>. */}
            <IconButton
              size="xs"
              aria-label="Dock item"
              icon={<CloseIcon />}
              onClick={() => setIsDocked(true)}
            />
          </Box>

          {/* Body content */}
          <Box p={4}>
            {children}
          </Box>
        </Box>
      </Draggable>
    </Portal>
  );
}

export default DockableAccordionItem;