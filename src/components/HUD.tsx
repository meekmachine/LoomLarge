

import { Box, Text } from "@chakra-ui/react";

export default function HUD() {
  return (
    <Box
      position="absolute"
      top="1rem"
      right="1rem"
      bg="rgba(0,0,0,0.6)"
      color="white"
      px={3}
      py={2}
      borderRadius="md"
      fontSize="sm"
      zIndex={10}
    >
      <Text fontWeight="bold">LoomLarge HUD</Text>
      <Text fontSize="xs">Status: Ready</Text>
    </Box>
  );
}