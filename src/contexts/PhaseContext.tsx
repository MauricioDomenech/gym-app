import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type PhaseType = 'maintenance' | 'volume' | null;

interface PhaseContextType {
  currentPhase: PhaseType;
  setPhase: (phase: PhaseType) => void;
  isPhaseSelected: boolean;
}

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

interface PhaseProviderProps {
  children: ReactNode;
}

export const PhaseProvider: React.FC<PhaseProviderProps> = ({ children }) => {
  const [currentPhase, setCurrentPhase] = useState<PhaseType>(null);

  const setPhase = (phase: PhaseType) => {
    setCurrentPhase(phase);
  };

  const isPhaseSelected = currentPhase !== null;

  return (
    <PhaseContext.Provider value={{ currentPhase, setPhase, isPhaseSelected }}>
      {children}
    </PhaseContext.Provider>
  );
};

export const usePhase = (): PhaseContextType => {
  const context = useContext(PhaseContext);
  if (context === undefined) {
    throw new Error('usePhase must be used within a PhaseProvider');
  }
  return context;
};