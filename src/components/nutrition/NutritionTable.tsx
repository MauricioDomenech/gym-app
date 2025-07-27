import React from 'react';
import { useData } from '../../contexts/DataContext';
import type { NutritionItem, TableColumn } from '../../models/types';
import { ColumnToggle } from './ColumnToggle';

interface NutritionTableProps {
  className?: string;
}

export const NutritionTable: React.FC<NutritionTableProps> = ({ className = '' }) => {
  const {
    currentWeek,
    currentDay,
    getNutritionData,
    tableColumns,
    updateTableColumns,
  } = useData();

  const nutritionData = getNutritionData(currentWeek, currentDay);
  const visibleColumns = tableColumns.filter(col => col.visible);

  if (!nutritionData) {
    return (
      <div className={`${className} bg-white dark:bg-slate-800 rounded-lg shadow p-6`}>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No hay datos nutricionales disponibles para esta selección.
        </p>
      </div>
    );
  }

  const renderCellValue = (item: NutritionItem, column: TableColumn): React.ReactNode => {
    const value = item[column.key];
    
    // Style subtotals and totals differently
    if (item.comida.includes('SUBTOTAL') || item.comida.includes('TOTALES')) {
      return <span className="font-bold text-blue-600 dark:text-blue-400">{value}</span>;
    }
    
    return value;
  };

  const getRowClasses = (item: NutritionItem): string => {
    let baseClasses = 'border-b border-gray-200 dark:border-slate-700';
    
    if (item.comida.includes('TOTALES')) {
      baseClasses += ' bg-blue-50 dark:bg-blue-900/20 font-bold';
    } else if (item.comida.includes('SUBTOTAL')) {
      baseClasses += ' bg-gray-50 dark:bg-slate-800/50 font-semibold';
    } else {
      baseClasses += ' hover:bg-gray-50 dark:hover:bg-slate-800/50';
    }
    
    return baseClasses;
  };

  return (
    <div className={`${className} bg-white dark:bg-slate-800 rounded-lg shadow`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Plan Nutricional - {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
          </h3>
          <ColumnToggle 
            columns={tableColumns} 
            onColumnsChange={updateTableColumns} 
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {nutritionData.meals.map((item, index) => (
              <tr key={index} className={getRowClasses(item)}>
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  >
                    {renderCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 rounded-b-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Totales Diarios Calculados:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Proteínas:</span>
            <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
              {nutritionData.totals.proteinas.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Grasas:</span>
            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
              {nutritionData.totals.grasas.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Carbs:</span>
            <span className="ml-2 font-semibold text-yellow-600 dark:text-yellow-400">
              {nutritionData.totals.carbs.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Fibra:</span>
            <span className="ml-2 font-semibold text-purple-600 dark:text-purple-400">
              {nutritionData.totals.fibra.toFixed(1)}g
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Calorías:</span>
            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
              {nutritionData.totals.calorias.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};