import React, { useState, useRef, useEffect } from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';

export const VolumeColumnToggle: React.FC = () => {
  const { tableColumns, updateTableColumns } = useVolumeData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleColumn = async (columnKey: string) => {
    const updatedColumns = tableColumns.map(col =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    
    try {
      await updateTableColumns(updatedColumns);
    } catch (error) {
      console.error('Error updating volume table columns:', error);
    }
  };

  const visibleCount = tableColumns.filter(col => col.visible).length;
  const totalCount = tableColumns.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors duration-200"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        Columnas ({visibleCount}/{totalCount})
        <svg className={`w-4 h-4 ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-slate-700 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-medium text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/20">
              Seleccionar columnas visibles
            </div>
            {tableColumns.map((column) => (
              <label
                key={column.key}
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleToggleColumn(column.key)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 dark:border-slate-600 rounded"
                />
                <span className="ml-3">{column.label}</span>
                {['comida', 'alimento'].includes(column.key) && (
                  <span className="ml-auto text-xs text-orange-600 dark:text-orange-400">
                    Requerida
                  </span>
                )}
              </label>
            ))}
            
            <div className="border-t border-gray-200 dark:border-slate-700 mt-2 pt-2">
              <button
                onClick={() => {
                  const allVisible = tableColumns.map(col => ({ ...col, visible: true }));
                  updateTableColumns(allVisible);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-slate-700"
              >
                Mostrar todas
              </button>
              <button
                onClick={() => {
                  const essentialVisible = tableColumns.map(col => ({ 
                    ...col, 
                    visible: ['comida', 'alimento', 'kcal', 'proteinas_g', 'carbohidratos_g', 'grasas_g'].includes(col.key)
                  }));
                  updateTableColumns(essentialVisible);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-slate-700"
              >
                Solo esenciales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};