

import React, { createContext, useContext, useState, useMemo } from "react";

/**
 * Context type for holding Three.js engine state.
 */
type ThreeState = {
  isLoaded: boolean;
  engine: any | null;
  setThreeState: React.Dispatch<React.SetStateAction<ThreeState>>;
  reset: () => void;
};

const defaultValue: ThreeState = {
  isLoaded: false,
  engine: null,
  setThreeState: () => {},
  reset: () => {}
};

const ThreeContext = createContext<ThreeState>(defaultValue);

/**
 * Provider to wrap the app and provide engine state.
 */
export const ThreeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<ThreeState>(defaultValue);
  const reset = () => setState(defaultValue);

  const value = useMemo(
    () => ({ ...state, setThreeState: setState, reset }),
    [state]
  );

  return <ThreeContext.Provider value={value}>{children}</ThreeContext.Provider>;
};

/**
 * Hook to access the Three.js state context.
 */
export const useThreeState = () => useContext(ThreeContext);