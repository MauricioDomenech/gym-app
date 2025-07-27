import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import type { WorkoutProgress } from '../../models/types';

interface CopyWeekDataProps {
  currentWeek: number;
}

export const CopyWeekData: React.FC<CopyWeekDataProps> = ({ currentWeek }) => {
  const { workoutProgress, addWorkoutProgress } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isCopying, setIsCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Obtener semanas disponibles que tienen datos
  const getAvailableWeeks = () => {
    const weeks = new Set<number>();
    workoutProgress.forEach(progress => {
      if (progress.week !== currentWeek) {
        weeks.add(progress.week);
      }
    });
    return Array.from(weeks).sort();
  };

  // Contar ejercicios en una semana
  const getExerciseCount = (week: number) => {
    return workoutProgress.filter(p => p.week === week).length;
  };

  const copyWeekData = async () => {
    setIsCopying(true);
    setCopyResult(null);

    try {
      // Obtener todos los datos de la semana seleccionada
      const sourceWeekData = workoutProgress.filter(p => p.week === selectedWeek);
      
      if (sourceWeekData.length === 0) {
        setCopyResult({
          success: false,
          message: `No se encontraron datos en la semana ${selectedWeek}`
        });
        setIsCopying(false);
        return;
      }

      // Crear nuevos registros para la semana actual
      const promises = sourceWeekData.map(async (sourceProgress) => {
        const newProgress: WorkoutProgress = {
          exerciseId: sourceProgress.exerciseId,
          day: sourceProgress.day,
          week: currentWeek,
          weights: [...sourceProgress.weights] as [number, number, number],
          date: new Date().toISOString()
        };

        await addWorkoutProgress(newProgress);
      });

      await Promise.all(promises);

      setCopyResult({
        success: true,
        message: `✅ Se copiaron ${sourceWeekData.length} ejercicios de la semana ${selectedWeek} a la semana ${currentWeek}`
      });

      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        setIsOpen(false);
        setCopyResult(null);
      }, 3000);

    } catch (error) {
      console.error('Error copying week data:', error);
      setCopyResult({
        success: false,
        message: '❌ Error al copiar los datos. Inténtalo de nuevo.'
      });
    } finally {
      setIsCopying(false);
    }
  };

  const availableWeeks = getAvailableWeeks();

  if (availableWeeks.length === 0) {
    return null; // No mostrar botón si no hay otras semanas con datos
  }

  return (
    <>
      {/* Botón para abrir modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar datos
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Copiar datos a Semana {currentWeek}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!copyResult ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Selecciona la semana de la cual copiar los datos de entrenamiento:
                </p>

                <div className="space-y-3 mb-6">
                  {availableWeeks.map(week => (
                    <label key={week} className="flex items-center p-3 border border-gray-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                      <input
                        type="radio"
                        name="sourceWeek"
                        value={week}
                        checked={selectedWeek === week}
                        onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Semana {week}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getExerciseCount(week)} ejercicios registrados
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={copyWeekData}
                    disabled={isCopying}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isCopying
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isCopying ? 'Copiando...' : 'Copiar datos'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className={`text-sm ${copyResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {copyResult.message}
                </div>
                {copyResult.success && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Este modal se cerrará automáticamente...
                  </div>
                )}
                {!copyResult.success && (
                  <button
                    onClick={() => setCopyResult(null)}
                    className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};