import React, { useState } from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';
import type { VolumeCopyWeekDataProps, VolumeWorkoutProgress } from '../../types/volume';

export const VolumeCopyWeekData: React.FC<VolumeCopyWeekDataProps> = ({ currentWeek }) => {
  const { workoutProgress, saveWorkoutProgress } = useVolumeData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek === 1 ? 2 : 1);
  const [isCopying, setIsCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get available weeks (always 1 and 2, excluding current)
  const getAvailableWeeks = () => {
    const allPossibleWeeks = [1, 2];
    return allPossibleWeeks.filter(week => week !== currentWeek);
  };


  // Get exercise breakdown by type
  const getExerciseBreakdown = (week: number) => {
    const weekProgress = workoutProgress.filter(p => p.week === week);
    const mainExercises = weekProgress.filter(p => !p.isAlternative).length;
    const alternatives = weekProgress.filter(p => p.isAlternative).length;
    
    return { mainExercises, alternatives, total: weekProgress.length };
  };

  const copyWeekData = async () => {
    setIsCopying(true);
    setCopyResult(null);

    try {
      // Get all data from selected week
      const sourceWeekData = workoutProgress.filter(p => p.week === selectedWeek);
      
      if (sourceWeekData.length === 0) {
        setCopyResult({
          success: false,
          message: `No se encontraron datos en la semana ${selectedWeek}`
        });
        setIsCopying(false);
        return;
      }

      // Create new records for current week
      const copyPromises = sourceWeekData.map(async (sourceProgress) => {
        const newProgress: VolumeWorkoutProgress = {
          exerciseId: sourceProgress.exerciseId,
          day: sourceProgress.day,
          week: currentWeek,
          weights: [...sourceProgress.weights], // Copy weights array
          seriesCount: sourceProgress.seriesCount,
          date: new Date().toISOString(),
          isAlternative: sourceProgress.isAlternative,
          alternativeIndex: sourceProgress.alternativeIndex,
          observations: sourceProgress.observations, // Copy observations
        };

        await saveWorkoutProgress(newProgress);
      });

      await Promise.all(copyPromises);

      const breakdown = getExerciseBreakdown(selectedWeek);
      setCopyResult({
        success: true,
        message: `✅ Se copiaron ${sourceWeekData.length} ejercicios de la semana ${selectedWeek} a la semana ${currentWeek}\n(${breakdown.mainExercises} principales + ${breakdown.alternatives} alternativas)`
      });

      // Close modal after 4 seconds
      setTimeout(() => {
        setIsOpen(false);
        setCopyResult(null);
      }, 4000);

    } catch (error) {
      console.error('Error copying volume week data:', error);
      setCopyResult({
        success: false,
        message: '❌ Error al copiar los datos. Inténtalo de nuevo.'
      });
    } finally {
      setIsCopying(false);
    }
  };

  const availableWeeks = getAvailableWeeks();

  return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
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
                <span className="text-orange-600 dark:text-orange-400">🔄</span> Copiar datos a Semana {currentWeek}
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
                  Selecciona la semana de la cual copiar los datos de entrenamiento de volumen:
                </p>

                <div className="space-y-3 mb-6">
                  {availableWeeks.map(week => {
                    const breakdown = getExerciseBreakdown(week);
                    return (
                      <label key={week} className="flex items-center p-3 border border-orange-200 dark:border-orange-700 rounded-md cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                        <input
                          type="radio"
                          name="sourceWeek"
                          value={week}
                          checked={selectedWeek === week}
                          onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-orange-300 dark:border-orange-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Semana {week}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {breakdown.total > 0 
                              ? (
                                <div>
                                  <div>{breakdown.total} ejercicios registrados</div>
                                  <div className="text-xs">
                                    {breakdown.mainExercises} principales • {breakdown.alternatives} alternativas
                                  </div>
                                </div>
                              )
                              : 'Sin datos (se copiará estructura vacía)'
                            }
                          </div>
                        </div>
                        {breakdown.total > 0 && (
                          <div className="text-right">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                              {breakdown.total}
                            </div>
                            <div className="text-xs text-gray-500">ejercicios</div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Info box */}
                <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="text-xs text-orange-800 dark:text-orange-200">
                    <div className="font-medium mb-1">ℹ️ Qué se copiará:</div>
                    <ul className="space-y-1">
                      <li>• Ejercicios principales con sus pesos</li>
                      <li>• Alternativas seleccionadas con sus pesos</li>
                      <li>• Cantidad de series utilizadas</li>
                      <li>• Observaciones de cada ejercicio</li>
                      <li>• Se respetará la configuración de cada ejercicio</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={copyWeekData}
                    disabled={isCopying}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors ${
                      isCopying
                        ? 'bg-orange-400 cursor-not-allowed'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {isCopying ? 'Copiando...' : `Copiar desde Semana ${selectedWeek}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className={`text-sm whitespace-pre-line ${copyResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {copyResult.message}
                </div>
                {copyResult.success && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="text-xs text-green-700 dark:text-green-300">
                      <div className="font-medium mb-1">✨ Datos copiados exitosamente</div>
                      <div>Este modal se cerrará automáticamente...</div>
                    </div>
                  </div>
                )}
                {!copyResult.success && (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Verifica que tengas datos registrados en la semana origen
                    </div>
                    <button
                      onClick={() => setCopyResult(null)}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};