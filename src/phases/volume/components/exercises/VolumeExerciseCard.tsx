import React from 'react';
import { AlternativesList } from './AlternativesList';
import { VolumeIndividualTracker } from './VolumeIndividualTracker';
import type { VolumeExercise } from '../../types/volume';

interface VolumeExerciseCardProps {
  exercise: VolumeExercise;
  index: number;
  onShowImage: (imagePath: string, exerciseName: string) => void;
}

export const VolumeExerciseCard: React.FC<VolumeExerciseCardProps> = ({
  exercise,
  index,
  onShowImage,
}) => {

  return (
    <div className="border border-orange-200 dark:border-slate-700 rounded-lg p-6 bg-gradient-to-r from-white to-orange-50 dark:from-slate-800 dark:to-slate-800/50">
      {/* Exercise Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-8 h-8 bg-orange-600 text-white text-sm font-bold rounded-full">
              {index + 1}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {exercise.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              📊 {exercise.series} series
            </span>
            <span className="font-medium">
              🔁 {exercise.repeticiones} repeticiones
            </span>
          </div>
        </div>

        {/* Exercise Image Button */}
        <button
          onClick={() => onShowImage(exercise.imagen, exercise.name)}
          className="ml-4 p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors duration-200"
          title={`Ver imagen: ${exercise.name}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Exercise Description/Notes if needed */}
      {exercise.name.includes('(') && (
        <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-md">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            💡 {exercise.name.match(/\((.*?)\)/)?.[1] || 'Ver detalles en la imagen'}
          </p>
        </div>
      )}

      {/* Alternatives Section */}
      {exercise.alternativas.length > 0 && (
        <div className="mt-6 border-t border-orange-200 dark:border-slate-700 pt-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Ejercicios Alternativos
          </h4>
          
          <AlternativesList
            exercise={exercise}
            onShowImage={onShowImage}
          />
        </div>
      )}


      {/* Individual Exercise Tracker */}
      <div className="mt-6">
        <VolumeIndividualTracker
          exercise={exercise}
        />
      </div>
    </div>
  );
};