import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PhaseProvider, usePhase } from './contexts/PhaseContext';
import { PhaseSelector } from './components/phase/PhaseSelector';
import { MaintenanceApp } from './phases/maintenance';

const PhaseAwareContent: React.FC = () => {
  const { currentPhase, isPhaseSelected } = usePhase();

  if (!isPhaseSelected) {
    return <PhaseSelector />;
  }

  if (currentPhase === 'volume') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Fase de Volumen
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta fase estará disponible próximamente
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Volver al selector
          </button>
        </div>
      </div>
    );
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