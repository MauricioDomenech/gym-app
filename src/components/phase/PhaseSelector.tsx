import React from 'react';
import { usePhase } from '../../contexts/PhaseContext';

export const PhaseSelector: React.FC = () => {
  const { setPhase } = usePhase();

  const handlePhaseSelect = (phase: 'maintenance' | 'volume') => {
    setPhase(phase);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Selecciona tu Fase
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Elige el tipo de entrenamiento que quieres seguir
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handlePhaseSelect('maintenance')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 transform hover:scale-105 flex flex-col items-center"
            >
              <div className="text-2xl mb-2">🏋️</div>
              <div className="text-lg">Mantenimiento</div>
              <div className="text-sm opacity-90 mt-1">
                Rutina de mantenimiento y tonificación
              </div>
            </button>

            <button
              onClick={() => handlePhaseSelect('volume')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 transform hover:scale-105 flex flex-col items-center"
            >
              <div className="text-2xl mb-2">💪</div>
              <div className="text-lg">Volumen</div>
              <div className="text-sm opacity-90 mt-1">
                Rutina de ganancia de masa muscular
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Podrás cambiar de fase en cualquier momento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};