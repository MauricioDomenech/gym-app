import React from 'react';
import { useData } from '../../contexts/DataContext';
import { WorkoutTracker } from './WorkoutTracker';
import { CopyWeekData } from './CopyWeekData';

interface ExerciseListProps {
  className?: string;
}

export const ExerciseList: React.FC<ExerciseListProps> = ({ className = '' }) => {
  const { currentWeek, currentDay, getWorkoutData } = useData();

  const workoutData = getWorkoutData(currentWeek, currentDay);

  if (!workoutData || workoutData.exercises.length === 0) {
    return (
      <div className={`${className} bg-white dark:bg-slate-800 rounded-lg shadow p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Entrenamiento - {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {currentDay === 'domingo' 
            ? 'Día de descanso activo - No hay ejercicios programados'
            : 'No hay ejercicios disponibles para este día.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} bg-white dark:bg-slate-800 rounded-lg shadow`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entrenamiento - {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {workoutData.type}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <CopyWeekData currentWeek={currentWeek} />
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="p-6">
        <div className="space-y-6">
          {workoutData.exercises.map((exercise, index) => (
            <div key={exercise.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              {/* Exercise Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white">
                    {index + 1}. {exercise.name}
                  </h4>
                  {/* Only show sets/reps for weight exercises */}
                  {exercise.sets > 1 && exercise.reps > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {exercise.sets} series x {exercise.reps} repeticiones
                    </p>
                  )}
                  {exercise.notes && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {exercise.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Workout Tracker */}
              <WorkoutTracker exercise={exercise} />
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Consejos para el entrenamiento:
          </h5>
          {/* Show different tips based on exercise types */}
          {workoutData.exercises.some(ex => ex.sets > 1 && ex.reps > 0) ? (
            // Weight-based exercises tips
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Registra el peso utilizado en cada serie</li>
              <li>• Mantén un descanso de 60-90 segundos entre series</li>
              <li>• Progresa gradualmente aumentando el peso cuando puedas completar todas las repeticiones</li>
              <li>• Enfócate en la técnica correcta antes que en el peso</li>
            </ul>
          ) : (
            // Cardio/time-based exercises tips
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Marca cada ejercicio como completado una vez finalizado</li>
              <li>• Mantén la intensidad apropiada durante todo el ejercicio</li>
              <li>• Hidrátate adecuadamente antes, durante y después del entrenamiento</li>
              <li>• Escucha a tu cuerpo y ajusta la intensidad si es necesario</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};