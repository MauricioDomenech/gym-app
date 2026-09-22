import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PhaseProvider, usePhase } from './contexts/PhaseContext';
import type { PhaseType } from './contexts/PhaseContext';
import { PhaseSelector } from './components/phase/PhaseSelector';
import { TodayApp } from './components/today/TodayApp';
import { MaintenanceApp } from './phases/maintenance';
import { VolumeApp } from './phases/volume';
import { DefinicionApp } from './phases/definicion';

type AppScreen = 'today' | 'plan' | 'legacy';

const PhaseAwareContent: React.FC = () => {
  const { currentPhase, isPhaseSelected } = usePhase();
  const [screen, setScreen] = React.useState<AppScreen>('today');

  const openLegacy = () => {
    setScreen(isPhaseSelected ? 'legacy' : 'plan');
  };

  if (screen === 'today') {
    return (
      <TodayApp
        onOpenLegacy={openLegacy}
      />
    );
  }

  if (screen === 'plan') {
    return (
      <PhaseSelector
        onBack={() => setScreen('today')}
        onPhaseSelected={() => setScreen('legacy')}
      />
    );
  }

  if (!isPhaseSelected || currentPhase === null) {
    return <PhaseSelector onBack={() => setScreen('today')} onPhaseSelected={() => setScreen('legacy')} />;
  }

  return <LegacyPhaseView phase={currentPhase} onBack={() => setScreen('today')} />;
};

interface LegacyPhaseViewProps {
  onBack: () => void;
  phase: Exclude<PhaseType, null>;
}

const LegacyPhaseView: React.FC<LegacyPhaseViewProps> = ({ onBack, phase }) => {
  let phaseApp: React.ReactNode;

  if (phase === 'volume') {
    phaseApp = <VolumeApp />;
  } else if (phase === 'definicion') {
    phaseApp = <DefinicionApp />;
  } else {
    phaseApp = <MaintenanceApp />;
  }

  return (
    <div className="legacy-app-shell">
      <div className="legacy-return-bar">
        <button onClick={onBack} type="button">← Volver a Hoy</button>
      </div>
      {phaseApp}
    </div>
  );
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
