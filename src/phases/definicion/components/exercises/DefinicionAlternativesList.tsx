import React from 'react';
import type { DefinicionExercise } from '../../types/definicion';

interface DefinicionAlternativesListProps {
  exercise: DefinicionExercise;
  onShowImage: (imagePath: string, exerciseName: string) => void;
}

export const DefinicionAlternativesList: React.FC<DefinicionAlternativesListProps> = ({
  exercise,
  onShowImage,
}) => {
  return (
    <div className="space-y-2">
      {exercise.alternativas.map((alt, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {alt.nombre}
          </span>
          <button
            onClick={() => onShowImage(alt.imagen, alt.nombre)}
            className="ml-2 p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors duration-200 text-xs"
            title={`Ver imagen: ${alt.nombre}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
