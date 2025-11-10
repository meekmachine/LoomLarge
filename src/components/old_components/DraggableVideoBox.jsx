import React, { useState, useEffect } from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

const DraggableVideoBox = ({ videoElementRef, emotionState }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Handle dragging behavior
  const handleMouseDown = (event) => {
    setDragging(true);
  };

  const handleMouseMove = (event) => {
    if (dragging) {
      const x = event.clientX - event.target.offsetWidth / 2;
      const y = event.clientY - event.target.offsetHeight / 2;
      setPosition({ x, y });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);

    // Snap to corner logic: bottom-left or bottom-right based on position
    const windowWidth = window.innerWidth;
    const newX = position.x < windowWidth / 2 ? 10 : windowWidth - event.target.offsetWidth - 10;
    const newY = window.innerHeight - event.target.offsetHeight - 10;

    setPosition({ x: newX, y: newY });
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Box
      position="fixed"
      width={collapsed ? '100px' : '300px'}
      height={collapsed ? '50px' : '200px'}
      cursor={collapsed ? 'default' : 'move'}
      onMouseDown={!collapsed ? handleMouseDown : null}
      onMouseMove={!collapsed ? handleMouseMove : null}
      onMouseUp={!collapsed ? handleMouseUp : null}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
      }}
      border="2px solid gray"
      borderRadius="10px"
      overflow="hidden"
      boxShadow="lg"
      bg="gray.900"
    >
      <Box position="absolute" top="0" right="0">
        <IconButton
          icon={collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          size="sm"
          onClick={toggleCollapse}
          aria-label="Toggle collapse"
        />
      </Box>

      {!collapsed && (
        <>
          <video ref={videoElementRef} autoPlay muted style={{ width: '100%', height: '100%' }} />
          <Box position="absolute" bottom="0" left="0" p="2" color="white" bg="rgba(0, 0, 0, 0.5)">
            {emotionState.detectedEmotion && (
              <div>Detected Emotion: {emotionState.detectedEmotion}</div>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default DraggableVideoBox;