import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import type { Exercise, WorkoutProgress } from '../../types/maintenance';

interface WorkoutTrackerProps {
  exercise: Exercise;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({ exercise }) => {
  const { 
    currentWeek, 
    currentDay, 
    addWorkoutProgress, 
    getExerciseProgress 
  } = useData();

  const [weights, setWeights] = useState<[number, number, number]>([0, 0, 0]);
  const [savedWeights, setSavedWeights] = useState<[number, number, number]>([0, 0, 0]);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Load existing progress
  useEffect(() => {
    const existingProgress = getExerciseProgress(exercise.id, currentDay, currentWeek);
    if (existingProgress) {
      setWeights(existingProgress.weights);
      setSavedWeights(existingProgress.weights);
    } else {
      setWeights([0, 0, 0]);
      setSavedWeights([0, 0, 0]);
    }
  }, [exercise.id, currentDay, currentWeek, getExerciseProgress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  const handleWeightChange = (seriesIndex: number, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newWeights = [...weights] as [number, number, number];
    newWeights[seriesIndex] = numericValue;
    setWeights(newWeights);
  };

  const saveProgress = async () => {
    setIsSaving(true);
    setJustSaved(false);
    
    // Limpiar timer anterior si existe
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    try {
      const progress: WorkoutProgress = {
        exerciseId: exercise.id,
        day: currentDay,
        week: currentWeek,
        weights,
        date: new Date().toISOString(),
      };

      await addWorkoutProgress(progress);
      
      // Update saved weights after successful save
      setSavedWeights(weights);
      
      // Mostrar "Registrado" por 5 segundos
      setJustSaved(true);
      const timer = setTimeout(() => {
        setJustSaved(false);
        setSaveTimer(null);
      }, 5000);
      setSaveTimer(timer);
      
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasProgress = weights.some(weight => weight > 0);
  const hasSavedProgress = savedWeights.some(weight => weight > 0);
  // Check if this exercise needs weight tracking
  const needsWeights = exercise.sets > 1 && exercise.reps > 0;

  return (
    <div className="space-y-3">
      {needsWeights ? (
        // Weight Input Grid for resistance exercises
        <div className="grid grid-cols-3 gap-3">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Completion checkbox for cardio/time-based exercises
        <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasProgress}
              onChange={(e) => {
                if (e.target.checked) {
                  setWeights([1, 0, 0]); // Mark as completed
                } else {
                  setWeights([0, 0, 0]); // Mark as not completed
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Ejercicio completado
            </span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={saveProgress}
            disabled={isSaving}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
              isSaving
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          
          {hasProgress && (
            <button
              onClick={() => setWeights([0, 0, 0])}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              Limpiar
            </button>
          )}
        </div>

        {justSaved && (
          <div className="flex items-center text-xs text-green-600 dark:text-green-400 animate-fade-in">
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
        <div className="p-2 bg-gray-50 dark:bg-slate-900 rounded text-xs">
          {needsWeights ? (
            <>
              <span className="text-gray-600 dark:text-gray-400">Pesos registrados:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {savedWeights.map((w) => `${w}kg`).join(' • ')}
              </span>
            </>
          ) : (
            <span className="text-green-600 dark:text-green-400">✓ Ejercicio completado</span>
          )}
        </div>
      )}
    </div>
  );
};