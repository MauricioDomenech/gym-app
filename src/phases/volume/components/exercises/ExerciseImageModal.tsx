import React, { useEffect } from 'react';
import type { ExerciseImageModalProps } from '../../types/volume';

export const ExerciseImageModal: React.FC<ExerciseImageModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  imagePath,
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  // Build complete image path dynamically
  const fullImagePath = `/images/${imagePath}`;
  const showPlaceholder = false; // Real images are now available

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-orange-200 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  {exerciseName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Demostración del ejercicio
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors duration-200"
                title="Cerrar (Esc)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {showPlaceholder ? (
              /* Placeholder while images are not uploaded */
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {exerciseName}
                </h4>
                
                <div className="max-w-md space-y-3">
                  <p className="text-gray-600 dark:text-gray-400">
                    La imagen para este ejercicio estará disponible próximamente.
                  </p>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>Imagen:</strong> {imagePath}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      Sube las imágenes de los ejercicios para verlas aquí
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Real image when available */
              <div className="flex justify-center">
                <img
                  src={fullImagePath}
                  alt={exerciseName}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="text-center py-8">
                        <p class="text-gray-500">No se pudo cargar la imagen</p>
                        <p class="text-sm text-gray-400 mt-2">${fullImagePath}</p>
                      </div>
                    `;
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-orange-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Presiona <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs">Esc</kbd> para cerrar
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};