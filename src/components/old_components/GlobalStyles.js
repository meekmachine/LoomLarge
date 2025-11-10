

// GlobalStyles.js
import React from 'react';
import { Global } from '@emotion/react';

export default function GlobalStyles() {
  return (
    <Global
      styles={{
        '.chakra-portal': {
          position: 'absolute',
          top: '10px',
          right: '200px',
        },
      }}
    />
  );
}