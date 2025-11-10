// src/unity/VISOS/perception/audio/audioMachine.js
import { createMachine, assign } from 'xstate';

export const audioMachine = createMachine({
  id: 'audioMachine',
  initial: 'idle',
  context: {
    error: null,
    supported: false,
    permissionGranted: false
  },
  states: {
    idle: {
      on: {
        INIT: 'checkingSupport'
      }
    },
    checkingSupport: {
      invoke: {
        src: 'checkBrowserSupport',
        onDone: {
          target: 'requestingPermission',
          actions: assign({
            supported: (_, event) => event.data
          })
        },
        onError: {
          target: 'unsupported',
          actions: assign({
            error: (_, event) => event.data
          })
        }
      }
    },
    requestingPermission: {
      on: {
        GRANTED: {
          target: 'micOn',
          actions: assign({ permissionGranted: true })
        },
        DENIED: {
          target: 'micOff',
          actions: assign({ permissionGranted: false })
        }
      }
    },
    micOn: {
      on: {
        STOP: 'micOff'
      }
    },
    micOff: {
      on: {
        START: 'requestingPermission'
      }
    },
    unsupported: {
      type: 'final'
    }
  }
},{
  // Optionally define any machine options, e.g. services:
  services: {
    // checkBrowserSupport could do a simple test for SpeechRecognition
    checkBrowserSupport: async () => {
      const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      if (!supported) throw new Error('SpeechRecognition not supported');
      return supported;
    }
  }
});