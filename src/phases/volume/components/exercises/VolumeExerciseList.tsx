import React, { useState } from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';
import { VolumeExerciseCard } from './VolumeExerciseCard';
import { ExerciseImageModal } from './ExerciseImageModal';
import { VolumeCopyWeekData } from './VolumeCopyWeekData';

export const VolumeExerciseList: React.FC = () => {
  const { getCurrentWorkout, currentDay, currentWeek } = useVolumeData();
  const [selectedImagePath, setSelectedImagePath] = useState<string>('');
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const workoutData = getCurrentWorkout();

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
          <div className="text-orange-600 dark:text-orange-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No hay entrenamiento disponible
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            El entrenamiento para {currentDay} no está disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-orange-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="text-orange-600 dark:text-orange-400 mr-2">💪</span>
              Entrenamiento - Volumen
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {workoutData.musculos}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <VolumeCopyWeekData currentWeek={currentWeek} />
          </div>
        </div>

        {/* Workout Content */}
        <div className="p-6">
          {/* Workout Info */}
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Información del Entrenamiento
            </h3>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              <p><strong>Día:</strong> {workoutData.dia}</p>
              <p><strong>Grupos musculares:</strong> {workoutData.musculos}</p>
              <p><strong>Total ejercicios:</strong> {workoutData.exercises.length}</p>
            </div>
          </div>

          {/* Exercise Cards */}
          <div className="space-y-6">
            {workoutData.exercises.map((exercise, index) => (
              <VolumeExerciseCard
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
      <ExerciseImageModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        exerciseName={selectedExerciseName}
        imagePath={selectedImagePath}
      />
    </>
  );
};