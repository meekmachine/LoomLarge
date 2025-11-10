// MenuWrapper.jsx
import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  IconButton
} from '@chakra-ui/react';
import { FaUser } from 'react-icons/fa';

function MenuWrapper({ children }) {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<FaUser />}
        variant="ghost"
        aria-label="Open Menu"
        ml={8}                    // <--- Adds a left margin
      />
      <MenuList
        bgColor="whiteAlpha.700"  // Semi-transparent white
        backdropFilter="blur(8px)"// Blurs background behind it
        borderRadius="md"         // Rounded corners
        boxShadow="xl"           // Drop shadow (can be 'lg', 'xl', etc.)
        p={2}                     // Adds padding
      >
        {children}
      </MenuList>
    </Menu>
  );
}

export default MenuWrapper;