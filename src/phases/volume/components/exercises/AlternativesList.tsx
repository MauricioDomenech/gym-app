import React from 'react';
import type { AlternativesListProps } from '../../types/volume';

export const AlternativesList: React.FC<AlternativesListProps> = ({
  exercise,
  onShowImage,
}) => {
  const handleShowAlternativeImage = (alternativeIndex: number) => {
    const alternative = exercise.alternativas[alternativeIndex];
    if (alternative) {
      onShowImage(alternative.imagen, alternative.nombre);
    }
  };

  return (
    <div className="space-y-3">
      {/* Alternative Exercises */}
      {exercise.alternativas.map((alternative, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {alternative.nombre}
          </span>
          
          <button
            onClick={() => handleShowAlternativeImage(index)}
            className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 flex items-center gap-1"
            title={`Ver imagen: ${alternative.nombre}`}
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