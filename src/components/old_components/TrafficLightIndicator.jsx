import { Box, Icon, Text } from '@chakra-ui/react';
import { FaCircle } from 'react-icons/fa';

const TrafficLightIndicator = ({ status }) => {
  const colors = {
    talking: 'red.500',
    listening: 'green.500',
    idle: 'yellow.500',
  };

  return (
    <Box
      position="fixed"
      zIndex="1000"
      bottom="20px"
      left="20px"
      bg="gray.700"
      borderRadius="md"
      p={4}
      boxShadow="xl"
      userSelect="none"
  
    >
      <Box display="flex" flexDirection="column" alignItems="center">
        <Icon as={FaCircle} color={colors[status]} boxSize={6} mb={2} />
        <Text color="white" fontWeight="bold">
          {status === 'talking' && 'Talking'}
          {status === 'listening' && 'Listening'}
          {status === 'idle' && 'Idle'}
        </Text>
      </Box>
    </Box>
  );
};

export default TrafficLightIndicator;