import React from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DefinicionColumnToggle } from './DefinicionColumnToggle';
import { getSubPhaseForWeek } from '../../types/definicion';
import type { DefinicionNutritionItem } from '../../types/definicion';

export const DefinicionNutritionTable: React.FC = () => {
  const { getCurrentNutrition, tableColumns, currentDay, currentWeek } = useDefinicionData();

  const nutritionData = getCurrentNutrition();
  const subPhase = getSubPhaseForWeek(currentWeek);

  if (!nutritionData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-emerald-600 dark:text-emerald-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No hay datos nutricionales disponibles
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Los datos para {currentDay} no estan disponibles.
          </p>
        </div>
      </div>
    );
  }

  const visibleColumns = tableColumns.filter(col => col.visible);

  const getCellContent = (item: DefinicionNutritionItem, columnKey: keyof DefinicionNutritionItem): string => {
    const value = item[columnKey];
    if (columnKey === 'notas' && !value) return '-';
    if (columnKey === 'hora' && value) return value;
    return value || '-';
  };

  const getCellClassName = (item: DefinicionNutritionItem, columnKey: keyof DefinicionNutritionItem): string => {
    const baseClasses = 'px-4 py-3 text-sm';

    if (item.comida.toUpperCase().includes('TOTAL')) {
      return `${baseClasses} bg-emerald-50 dark:bg-emerald-900/20 font-semibold text-emerald-900 dark:text-emerald-100`;
    }

    if (columnKey === 'comida') return `${baseClasses} font-medium text-gray-900 dark:text-white`;
    if (columnKey === 'alimento') return `${baseClasses} text-gray-700 dark:text-gray-300`;
    if (columnKey === 'hora') return `${baseClasses} text-emerald-600 dark:text-emerald-400 font-mono`;
    if (['kcal', 'proteinas_g', 'carbohidratos_g', 'grasas_g'].includes(columnKey)) {
      return `${baseClasses} text-right font-mono text-gray-700 dark:text-gray-300`;
    }
    if (columnKey === 'notas') return `${baseClasses} text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate`;
    return `${baseClasses} text-gray-600 dark:text-gray-400`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-emerald-200 dark:border-slate-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <span className="text-emerald-600 dark:text-emerald-400 mr-2">🍽️</span>
            Plan Nutricional - Definicion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subPhase.nombre} — {subPhase.kcalDiarias} kcal/dia
            {subPhase.deficit > 0 && ` (deficit ${subPhase.deficit} kcal)`}
          </p>
        </div>
        <DefinicionColumnToggle />
      </div>

      {/* Nutrition Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-emerald-50 dark:bg-slate-700">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-emerald-800 dark:text-emerald-200 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {nutritionData.meals.map((item, index) => (
              <tr
                key={index}
                className={`
                  hover:bg-emerald-25 dark:hover:bg-slate-700/50 transition-colors duration-150
                  ${item.comida.toUpperCase().includes('TOTAL')
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-white dark:bg-slate-800'
                  }
                `}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={`${index}-${column.key}`}
                    className={getCellClassName(item, column.key)}
                    title={column.key === 'notas' ? item[column.key] : undefined}
                  >
                    {getCellContent(item, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-emerald-50 dark:bg-slate-700 border-t border-emerald-200 dark:border-slate-600">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Calorias</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {nutritionData.totals.kcal.toFixed(0)} kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Proteinas</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {nutritionData.totals.proteinas_g.toFixed(1)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Carbohidratos</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {nutritionData.totals.carbohidratos_g.toFixed(1)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Grasas</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {nutritionData.totals.grasas_g.toFixed(1)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Fibra</p>
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {nutritionData.totals.fibra_g.toFixed(1)}g
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
