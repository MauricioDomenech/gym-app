import React, { useState } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { TOTAL_WEEKS, getSubPhaseForWeek, getMesocycleInfo } from '../../types/definicion';
import type { DefinicionCopyWeekDataProps, DefinicionWorkoutProgress } from '../../types/definicion';

export const DefinicionCopyWeekData: React.FC<DefinicionCopyWeekDataProps> = ({ currentWeek }) => {
  const { workoutProgress, saveWorkoutProgress } = useDefinicionData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek > 1 ? currentWeek - 1 : 2);
  const [isCopying, setIsCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);

  const getAvailableWeeks = () => {
    const weeks: number[] = [];
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      if (w !== currentWeek) {
        weeks.push(w);
      }
    }
    return weeks;
  };

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
      const sourceWeekData = workoutProgress.filter(p => p.week === selectedWeek);

      if (sourceWeekData.length === 0) {
        setCopyResult({
          success: false,
          message: `No se encontraron datos en la semana ${selectedWeek}`,
        });
        setIsCopying(false);
        return;
      }

      const copyPromises = sourceWeekData.map(async (sourceProgress) => {
        const newProgress: DefinicionWorkoutProgress = {
          exerciseId: sourceProgress.exerciseId,
          day: sourceProgress.day,
          week: currentWeek,
          weights: [...sourceProgress.weights],
          seriesCount: sourceProgress.seriesCount,
          date: new Date().toISOString(),
          isAlternative: sourceProgress.isAlternative,
          alternativeIndex: sourceProgress.alternativeIndex,
          observations: sourceProgress.observations,
          rir: sourceProgress.rir,
        };
        await saveWorkoutProgress(newProgress);
      });

      await Promise.all(copyPromises);

      const breakdown = getExerciseBreakdown(selectedWeek);
      setCopyResult({
        success: true,
        message: `Se copiaron ${sourceWeekData.length} ejercicios de la semana ${selectedWeek} a la semana ${currentWeek}\n(${breakdown.mainExercises} principales + ${breakdown.alternatives} alternativas)`,
      });

      setTimeout(() => {
        setIsOpen(false);
        setCopyResult(null);
      }, 4000);
    } catch (error) {
      console.error('Error copying definicion week data:', error);
      setCopyResult({
        success: false,
        message: 'Error al copiar los datos. Intentalo de nuevo.',
      });
    } finally {
      setIsCopying(false);
    }
  };

  const availableWeeks = getAvailableWeeks();
  const weeksWithData = availableWeeks.filter(w => getExerciseBreakdown(w).total > 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar datos
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Copiar datos a Semana {currentWeek}
              </h3>
              <button
                onClick={() => { setIsOpen(false); setCopyResult(null); }}
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

                {weeksWithData.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                    No hay semanas con datos registrados para copiar.
                  </div>
                ) : (
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {weeksWithData.map(week => {
                      const breakdown = getExerciseBreakdown(week);
                      const subPhase = getSubPhaseForWeek(week);
                      const meso = getMesocycleInfo(week);

                      return (
                        <label key={week} className="flex items-center p-3 border border-emerald-200 dark:border-emerald-700 rounded-md cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <input
                            type="radio"
                            name="sourceWeek"
                            value={week}
                            checked={selectedWeek === week}
                            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300 dark:border-emerald-600"
                          />
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Semana {week}
                              {meso.isDeload && <span className="ml-1 text-purple-600 dark:text-purple-400">(Deload)</span>}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {subPhase.nombreCorto} — {breakdown.total} ejercicios
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {breakdown.total}
                            </div>
                            <div className="text-xs text-gray-500">ej.</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="text-xs text-emerald-800 dark:text-emerald-200">
                    <div className="font-medium mb-1">Que se copiara:</div>
                    <ul className="space-y-1">
                      <li>Pesos de cada serie</li>
                      <li>RIR registrado</li>
                      <li>Observaciones</li>
                      <li>Cantidad de series</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => { setIsOpen(false); setCopyResult(null); }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={copyWeekData}
                    disabled={isCopying || weeksWithData.length === 0}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                      isCopying || weeksWithData.length === 0
                        ? 'bg-emerald-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isCopying ? 'Copiando...' : `Copiar desde S${selectedWeek}`}
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
                      <div className="font-medium mb-1">Datos copiados exitosamente</div>
                      <div>Este modal se cerrara automaticamente...</div>
                    </div>
                  </div>
                )}
                {!copyResult.success && (
                  <div className="mt-4">
                    <button
                      onClick={() => setCopyResult(null)}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
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
