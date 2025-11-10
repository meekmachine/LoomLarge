// SoundDrawer.js
import React from 'react';
import { Drawer } from '@chakra-ui/react';

// Example: you might have your own audio hooks or external library
// We'll show a simple "playSound" placeholders
function playOpenSound() {
  console.log('[SoundDrawer] playOpenSound()');
  // Insert real code to play "drawerOpen.mp3" or similar
}
function playCloseSound() {
  console.log('[SoundDrawer] playCloseSound()');
  // Insert real code to play "drawerClose.mp3" or similar
}

/**
 * SoundDrawer
 * A wrapper around Chakra <Drawer> that plays universal open/close SFX
 * onOpenComplete => calls playOpenSound()
 * onCloseComplete => calls playCloseSound()
 */
export default function SoundDrawer(props) {
  const { onOpenComplete, onCloseComplete, ...rest } = props;

  // We'll intercept these events:
  const handleOpenComplete = () => {
    playOpenSound();
    if (typeof onOpenComplete === 'function') {
      onOpenComplete();
    }
  };

  const handleCloseComplete = () => {
    playCloseSound();
    if (typeof onCloseComplete === 'function') {
      onCloseComplete();
    }
  };

  return (
    <Drawer
      {...rest}
      onOpenComplete={handleOpenComplete}
      onCloseComplete={handleCloseComplete}
    />
  );
}