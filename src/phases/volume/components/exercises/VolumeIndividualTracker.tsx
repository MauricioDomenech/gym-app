import React, { useState, useEffect } from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';
import { parseSeriesString } from '../../types/volume';
import type { VolumeIndividualTrackerProps, VolumeWorkoutProgress } from '../../types/volume';

export const VolumeIndividualTracker: React.FC<VolumeIndividualTrackerProps> = ({ 
  exercise, 
  onProgressSaved 
}) => {
  const { 
    currentWeek, 
    currentDay, 
    saveWorkoutProgress, 
    getExerciseProgress 
  } = useVolumeData();

  // Parse exercise series to get dynamic input count
  const seriesInfo = parseSeriesString(exercise.series);
  const [currentSeriesCount, setCurrentSeriesCount] = useState(seriesInfo.defaultSeries);
  
  // Dynamic weights state based on series count
  const [weights, setWeights] = useState<number[]>(new Array(currentSeriesCount).fill(0));
  const [savedWeights, setSavedWeights] = useState<number[]>(new Array(currentSeriesCount).fill(0));
  const [observations, setObservations] = useState<string>('');
  const [savedObservations, setSavedObservations] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Use the same tracking ID for all alternatives (shared tracking)
  const getTrackingId = (): string => {
    return exercise.id; // Same ID for main exercise and all alternatives
  };


  // Load existing progress when component mounts or day/week changes
  // Note: selectedAlternativeIndex is not included as dependency since we want shared tracking
  useEffect(() => {
    const trackingId = getTrackingId();
    
    // Always load as main exercise (no alternative tracking)
    const existingProgress = getExerciseProgress(
      trackingId, 
      currentDay, 
      currentWeek, 
      false, // Always false for shared tracking
      null // No alternative index
    );
    
    if (existingProgress && existingProgress.weights.length > 0) {
      // Load existing progress
      const loadedSeriesCount = existingProgress.seriesCount || existingProgress.weights.length;
      setCurrentSeriesCount(loadedSeriesCount);
      setWeights([...existingProgress.weights]);
      setSavedWeights([...existingProgress.weights]);
      setObservations(existingProgress.observations || '');
      setSavedObservations(existingProgress.observations || '');
    } else {
      // Reset to default for new exercise
      const newWeights = new Array(seriesInfo.defaultSeries).fill(0);
      setCurrentSeriesCount(seriesInfo.defaultSeries);
      setWeights(newWeights);
      setSavedWeights(newWeights);
      setObservations('');
      setSavedObservations('');
    }
  }, [exercise.id, currentDay, currentWeek, getExerciseProgress]); // Removed selectedAlternativeIndex

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  // Handle series count change
  const handleSeriesCountChange = (newCount: number) => {
    if (newCount < seriesInfo.minSeries || newCount > seriesInfo.maxSeries) return;
    
    const newWeights = [...weights];
    
    // Add zeros if increasing series count
    while (newWeights.length < newCount) {
      newWeights.push(0);
    }
    
    // Remove excess if decreasing series count
    while (newWeights.length > newCount) {
      newWeights.pop();
    }
    
    setCurrentSeriesCount(newCount);
    setWeights(newWeights);
  };

  // Handle individual weight change
  const handleWeightChange = (seriesIndex: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newWeights = [...weights];
    newWeights[seriesIndex] = numericValue;
    setWeights(newWeights);
  };

  // Save progress to database
  const saveProgress = async () => {
    setIsSaving(true);
    setJustSaved(false);
    
    // Clear previous timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    try {
      const trackingId = getTrackingId();

      const progress: VolumeWorkoutProgress = {
        exerciseId: trackingId,
        day: currentDay,
        week: currentWeek,
        weights: [...weights], // Copy weights array
        seriesCount: currentSeriesCount,
        date: new Date().toISOString(),
        isAlternative: false, // Always save as main exercise for shared tracking
        alternativeIndex: null, // No alternative index for shared tracking
        observations: observations.trim(),
      };

      await saveWorkoutProgress(progress);
      
      // Update saved weights and observations after successful save
      setSavedWeights([...weights]);
      setSavedObservations(observations.trim());
      
      // Show "Registrado" for 5 seconds
      setJustSaved(true);
      const timer = setTimeout(() => {
        setJustSaved(false);
        setSaveTimer(null);
      }, 5000);
      setSaveTimer(timer);
      
      // Notify parent component
      onProgressSaved?.();
      
    } catch (error) {
      console.error('Error saving volume progress:', error);
      alert('Error al guardar el progreso. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all weights
  const clearWeights = () => {
    const newWeights = new Array(currentSeriesCount).fill(0);
    setWeights(newWeights);
  };

  const hasProgress = weights.some(weight => weight > 0) || observations.trim().length > 0;
  const hasSavedProgress = savedWeights.some(weight => weight > 0) || savedObservations.length > 0;
  const canAdjustSeries = seriesInfo.minSeries !== seriesInfo.maxSeries;

  return (
    <div className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
      {/* Exercise Name */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Seguimiento:
        </h4>
      </div>

      {/* Series Count Selector (if variable) */}
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
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-orange-200 dark:hover:bg-orange-800'
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
          {weights.map((weight, index) => (
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
                  className="w-full px-2 py-1 border border-orange-300 dark:border-orange-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <span className="absolute right-2 top-1 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Show in multiple rows if more than 4 series */}
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
                      className="w-full px-2 py-1 border border-orange-300 dark:border-orange-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

      {/* Observations Section */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Observaciones (opcional)
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Agrega observaciones sobre este ejercicio..."
          rows={3}
          className="w-full px-2 py-2 border border-orange-300 dark:border-orange-700 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
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
                : 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
            }`}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          
          {hasProgress && (
            <button
              onClick={clearWeights}
              className="px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 border border-orange-300 dark:border-orange-700 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors duration-200"
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
            ✅ Registrado
          </div>
        )}
      </div>

      {/* Progress Summary */}
      {hasSavedProgress && (
        <div className="space-y-2">
          {savedWeights.some(w => w > 0) && (
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs border border-green-200 dark:border-green-800">
              <span className="text-green-700 dark:text-green-300 font-medium">
                🎯 Último registro ({savedWeights.length} series):
              </span>
              <span className="ml-2 text-green-800 dark:text-green-200">
                {savedWeights.filter(w => w > 0).map((w, i) => `S${i + 1}: ${w}kg`).join(' • ') || 'Sin pesos registrados'}
              </span>
            </div>
          )}
          
          {savedObservations && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                📝 Observaciones guardadas:
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
        💡 <strong>Series recomendadas:</strong> {exercise.series} • <strong>Repeticiones:</strong> {exercise.repeticiones}
        {canAdjustSeries && (
          <span className="block mt-1">
            Puedes ajustar entre {seriesInfo.minSeries} y {seriesInfo.maxSeries} series según tu nivel
          </span>
        )}
      </div>
    </div>
  );
};