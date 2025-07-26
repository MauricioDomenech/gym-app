import React, { useState } from 'react';
import type { TableColumn } from '../../models/types';

interface ColumnToggleProps {
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => Promise<void>;
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({ columns, onColumnsChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = async (key: string) => {
    const updatedColumns = columns.map(column =>
      column.key === key ? { ...column, visible: !column.visible } : column
    );
    try {
      await onColumnsChange(updatedColumns);
    } catch (error) {
      console.error('Error updating columns:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
          />
        </svg>
        Columnas
        <svg
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mostrar columnas
              </div>
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => toggleColumn(column.key)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                    {column.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};