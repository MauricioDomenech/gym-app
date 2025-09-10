import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PhaseProvider, usePhase } from './contexts/PhaseContext';
import { PhaseSelector } from './components/phase/PhaseSelector';
import { MaintenanceApp } from './phases/maintenance';
import { VolumeApp } from './phases/volume';

const PhaseAwareContent: React.FC = () => {
  const { currentPhase, isPhaseSelected } = usePhase();

  if (!isPhaseSelected) {
    return <PhaseSelector />;
  }

  if (currentPhase === 'volume') {
    return <VolumeApp />;
  }

  // Maintenance phase
  return <MaintenanceApp />;
};

function App() {
  return (
    <ThemeProvider>
      <PhaseProvider>
        <PhaseAwareContent />
      </PhaseProvider>
    </ThemeProvider>
  );
}

export default App;