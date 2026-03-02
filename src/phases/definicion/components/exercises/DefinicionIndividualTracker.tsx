import React, { useState, useEffect } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { parseSeriesString, getMesocycleInfo, getCurrentRPE } from '../../types/definicion';
import type { DefinicionIndividualTrackerProps, DefinicionWorkoutProgress } from '../../types/definicion';

export const DefinicionIndividualTracker: React.FC<DefinicionIndividualTrackerProps> = ({
  exercise,
  onProgressSaved,
}) => {
  const {
    currentWeek,
    currentDay,
    saveWorkoutProgress,
    getExerciseProgress,
  } = useDefinicionData();

  const seriesInfo = parseSeriesString(exercise.series);
  const mesocycle = getMesocycleInfo(currentWeek);
  const targetRPE = getCurrentRPE(exercise.rpeProgresion, exercise.rpeDeload, mesocycle);

  const [currentSeriesCount, setCurrentSeriesCount] = useState(seriesInfo.defaultSeries);
  const [weights, setWeights] = useState<number[]>(new Array(currentSeriesCount).fill(0));
  const [savedWeights, setSavedWeights] = useState<number[]>(new Array(currentSeriesCount).fill(0));
  const [observations, setObservations] = useState<string>('');
  const [savedObservations, setSavedObservations] = useState<string>('');
  const [rpeActual, setRpeActual] = useState<number | null>(null);
  const [savedRpeActual, setSavedRpeActual] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const getTrackingId = (): string => {
    return exercise.id;
  };

  useEffect(() => {
    const trackingId = getTrackingId();
    const existingProgress = getExerciseProgress(
      trackingId,
      currentDay,
      currentWeek,
      false,
      null
    );

    if (existingProgress && existingProgress.weights.length > 0) {
      const loadedSeriesCount = existingProgress.seriesCount || existingProgress.weights.length;
      setCurrentSeriesCount(loadedSeriesCount);
      setWeights([...existingProgress.weights]);
      setSavedWeights([...existingProgress.weights]);
      setObservations(existingProgress.observations || '');
      setSavedObservations(existingProgress.observations || '');
      setRpeActual(existingProgress.rpeActual ?? null);
      setSavedRpeActual(existingProgress.rpeActual ?? null);
    } else {
      const newWeights = new Array(seriesInfo.defaultSeries).fill(0);
      setCurrentSeriesCount(seriesInfo.defaultSeries);
      setWeights(newWeights);
      setSavedWeights(newWeights);
      setObservations('');
      setSavedObservations('');
      setRpeActual(null);
      setSavedRpeActual(null);
    }
  }, [exercise.id, currentDay, currentWeek, getExerciseProgress]);

  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  const handleSeriesCountChange = (newCount: number) => {
    if (newCount < seriesInfo.minSeries || newCount > seriesInfo.maxSeries) return;

    const newWeights = [...weights];
    while (newWeights.length < newCount) {
      newWeights.push(0);
    }
    while (newWeights.length > newCount) {
      newWeights.pop();
    }

    setCurrentSeriesCount(newCount);
    setWeights(newWeights);
  };

  const handleWeightChange = (seriesIndex: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newWeights = [...weights];
    newWeights[seriesIndex] = numericValue;
    setWeights(newWeights);
  };

  const saveProgress = async () => {
    setIsSaving(true);
    setJustSaved(false);

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    try {
      const trackingId = getTrackingId();
      const progress: DefinicionWorkoutProgress = {
        exerciseId: trackingId,
        day: currentDay,
        week: currentWeek,
        weights: [...weights],
        seriesCount: currentSeriesCount,
        date: new Date().toISOString(),
        isAlternative: false,
        alternativeIndex: null,
        observations: observations.trim(),
        rpeActual: rpeActual,
      };

      await saveWorkoutProgress(progress);
      setSavedWeights([...weights]);
      setSavedObservations(observations.trim());
      setSavedRpeActual(rpeActual);

      setJustSaved(true);
      const timer = setTimeout(() => {
        setJustSaved(false);
        setSaveTimer(null);
      }, 5000);
      setSaveTimer(timer);

      onProgressSaved?.();
    } catch (error) {
      console.error('Error saving definicion progress:', error);
      alert('Error al guardar el progreso. Intentalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearWeights = () => {
    const newWeights = new Array(currentSeriesCount).fill(0);
    setWeights(newWeights);
    setRpeActual(null);
  };

  const hasProgress = weights.some(weight => weight > 0) || observations.trim().length > 0 || rpeActual !== null;
  const hasSavedProgress = savedWeights.some(weight => weight > 0) || savedObservations.length > 0 || savedRpeActual !== null;
  const canAdjustSeries = seriesInfo.minSeries !== seriesInfo.maxSeries;

  const rpeOptions = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  return (
    <div className="space-y-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Seguimiento:
        </h4>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          mesocycle.isDeload
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            : targetRPE >= 9
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        }`}>
          RPE Objetivo: {targetRPE}
          {mesocycle.isDeload && ' (Deload)'}
        </span>
      </div>

      {/* Series Count Selector */}
      {canAdjustSeries && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Series a realizar:
          </label>
          <div className="flex items-center gap-1">
            {Array.from({ length: seriesInfo.maxSeries - seriesInfo.minSeries + 1 }, (_, i) => {
              const count = seriesInfo.minSeries + i;
              return (
                <button
                  key={count}
                  onClick={() => handleSeriesCountChange(count)}
                  className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${
                    currentSeriesCount === count
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
                  }`}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight Inputs */}
      <div className="space-y-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(currentSeriesCount, 4)}, 1fr)` }}>
          {weights.slice(0, Math.min(currentSeriesCount, 4)).map((weight, index) => (
            <div key={index}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Serie {index + 1}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={weight || ''}
                  onChange={(e) => handleWeightChange(index, e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1 border border-emerald-300 dark:border-emerald-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute right-2 top-1 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          ))}
        </div>

        {currentSeriesCount > 4 && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(currentSeriesCount - 4, 4)}, 1fr)` }}>
            {weights.slice(4).map((weight, index) => {
              const actualIndex = index + 4;
              return (
                <div key={actualIndex}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Serie {actualIndex + 1}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={weight || ''}
                      onChange={(e) => handleWeightChange(actualIndex, e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 border border-emerald-300 dark:border-emerald-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RPE Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          RPE percibido:
        </label>
        <div className="flex flex-wrap gap-1">
          {rpeOptions.map(rpe => (
            <button
              key={rpe}
              onClick={() => setRpeActual(rpeActual === rpe ? null : rpe)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors duration-200 ${
                rpeActual === rpe
                  ? rpe >= 9
                    ? 'bg-red-600 text-white'
                    : rpe >= 8
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
              }`}
            >
              {rpe}
            </button>
          ))}
        </div>
        {rpeActual !== null && (
          <p className={`text-xs ${
            rpeActual > targetRPE + 0.5
              ? 'text-red-600 dark:text-red-400'
              : rpeActual < targetRPE - 0.5
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {rpeActual > targetRPE + 0.5
              ? `RPE superior al objetivo (${targetRPE}). Considera reducir carga.`
              : rpeActual < targetRPE - 0.5
                ? `RPE inferior al objetivo (${targetRPE}). Puedes aumentar carga.`
                : `RPE en rango con el objetivo (${targetRPE}).`
            }
          </p>
        )}
      </div>

      {/* Observations */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Observaciones (opcional)
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Agrega observaciones sobre este ejercicio..."
          rows={3}
          className="w-full px-2 py-2 border border-emerald-300 dark:border-emerald-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={saveProgress}
            disabled={isSaving || !hasProgress}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
              isSaving || !hasProgress
                ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
            }`}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>

          {hasProgress && (
            <button
              onClick={clearWeights}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-200"
            >
              Limpiar
            </button>
          )}
        </div>

        {justSaved && (
          <div className="flex items-center text-xs text-green-600 dark:text-green-400 animate-pulse">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Registrado
          </div>
        )}
      </div>

      {/* Progress Summary */}
      {hasSavedProgress && (
        <div className="space-y-2">
          {savedWeights.some(w => w > 0) && (
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs border border-green-200 dark:border-green-800">
              <span className="text-green-700 dark:text-green-300 font-medium">
                Ultimo registro ({savedWeights.length} series):
              </span>
              <span className="ml-2 text-green-800 dark:text-green-200">
                {savedWeights.filter(w => w > 0).map((w, i) => `S${i + 1}: ${w}kg`).join(' | ') || 'Sin pesos registrados'}
              </span>
            </div>
          )}

          {savedRpeActual !== null && (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                RPE registrado:
              </span>
              <span className="ml-2 text-emerald-800 dark:text-emerald-200">
                {savedRpeActual} (objetivo: {targetRPE})
              </span>
            </div>
          )}

          {savedObservations && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Observaciones guardadas:
              </span>
              <div className="mt-1 text-blue-800 dark:text-blue-200">
                {savedObservations}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 p-2 rounded border">
        <strong>Series recomendadas:</strong> {exercise.series} | <strong>Repeticiones:</strong> {exercise.repeticiones} | <strong>Descanso:</strong> {exercise.descanso}
        {canAdjustSeries && (
          <span className="block mt-1">
            Puedes ajustar entre {seriesInfo.minSeries} y {seriesInfo.maxSeries} series segun tu nivel
          </span>
        )}
      </div>
    </div>
  );
};
