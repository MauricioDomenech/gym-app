import React, { useState } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DefinicionExerciseCard } from './DefinicionExerciseCard';
import { DefinicionExerciseImageModal } from './DefinicionExerciseImageModal';
import { DefinicionCopyWeekData } from './DefinicionCopyWeekData';
import { getMesocycleInfo } from '../../types/definicion';

export const DefinicionExerciseList: React.FC = () => {
  const { getCurrentWorkout, currentDay, currentWeek } = useDefinicionData();
  const [selectedImagePath, setSelectedImagePath] = useState<string>('');
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const workoutData = getCurrentWorkout();
  const mesocycle = getMesocycleInfo(currentWeek);

  const handleShowImage = (imagePath: string, exerciseName: string) => {
    setSelectedImagePath(imagePath);
    setSelectedExerciseName(exerciseName);
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImagePath('');
    setSelectedExerciseName('');
  };

  if (!workoutData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-emerald-600 dark:text-emerald-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Dia de descanso
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No hay entrenamiento programado para {currentDay}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="text-emerald-600 dark:text-emerald-400 mr-2">💪</span>
              Entrenamiento - Definicion
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {workoutData.tipo} — {workoutData.musculos}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DefinicionCopyWeekData currentWeek={currentWeek} />
          </div>
        </div>

        {/* Workout Content */}
        <div className="p-6">
          {/* Workout Info */}
          <div className={`mb-6 p-4 rounded-lg ${
            mesocycle.isDeload
              ? 'bg-purple-50 dark:bg-purple-900/20'
              : mesocycle.isDietBreak
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : 'bg-emerald-50 dark:bg-emerald-900/20'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              mesocycle.isDeload
                ? 'text-purple-800 dark:text-purple-200'
                : mesocycle.isDietBreak
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-emerald-800 dark:text-emerald-200'
            }`}>
              Informacion del Entrenamiento
            </h3>
            <div className={`text-sm ${
              mesocycle.isDeload
                ? 'text-purple-700 dark:text-purple-300'
                : mesocycle.isDietBreak
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-300'
            }`}>
              <p><strong>Dia:</strong> {workoutData.dia} — {workoutData.tipo}</p>
              <p><strong>Grupos musculares:</strong> {workoutData.musculos}</p>
              <p><strong>Total ejercicios:</strong> {workoutData.exercises.length}</p>
              {mesocycle.isDeload && (
                <p className="mt-1 font-medium">↻ Semana de Deload — Reduce volumen y RPE</p>
              )}
            </div>
          </div>

          {/* Exercise Cards */}
          <div className="space-y-6">
            {workoutData.exercises.map((exercise, index) => (
              <DefinicionExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                onShowImage={handleShowImage}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <DefinicionExerciseImageModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        exerciseName={selectedExerciseName}
        imagePath={selectedImagePath}
      />
    </>
  );
};
