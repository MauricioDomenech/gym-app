import React from 'react';
import { useData } from '../../contexts/DataContext';
import type { WeeklySummary as WeeklySummaryType } from '../../models/types';
import { NutritionCalculations } from '../../utils/calculations';

interface WeeklySummaryProps {
  className?: string;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ className = '' }) => {
  const { getWeekNutrition } = useData();

  // Calculate summaries for both weeks
  const week1Data = getWeekNutrition(1);
  const week2Data = getWeekNutrition(2);

  const week1Summary: WeeklySummaryType = {
    ...NutritionCalculations.calculateWeeklySummary(week1Data),
    week: 1,
  };

  const week2Summary: WeeklySummaryType = {
    ...NutritionCalculations.calculateWeeklySummary(week2Data),
    week: 2,
  };

  const combinedSummary = NutritionCalculations.calculateCombinedSummary(week1Summary, week2Summary);

  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const dayLabels = {
    lunes: 'Lun',
    martes: 'Mar',
    miercoles: 'Mié',
    jueves: 'Jue',
    viernes: 'Vie',
    sabado: 'Sáb',
    domingo: 'Dom',
  };

  const renderSummaryCard = (summary: WeeklySummaryType, title: string) => {
    const goalProgress = NutritionCalculations.calculateGoalProgress(summary.averageDaily);

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>

        {/* Daily Breakdown */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Distribución Diaria
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">Día</th>
                  <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Prot</th>
                  <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Grasa</th>
                  <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Carbs</th>
                  <th className="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Cal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {days.map(day => {
                  const dayTotals = summary.totalsByDay[day];
                  return (
                    <tr key={day}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">
                        {dayLabels[day as keyof typeof dayLabels]}
                      </td>
                      <td className="text-right py-2 text-blue-600 dark:text-blue-400">
                        {dayTotals.proteinas.toFixed(0)}g
                      </td>
                      <td className="text-right py-2 text-green-600 dark:text-green-400">
                        {dayTotals.grasas.toFixed(0)}g
                      </td>
                      <td className="text-right py-2 text-yellow-600 dark:text-yellow-400">
                        {dayTotals.carbs.toFixed(0)}g
                      </td>
                      <td className="text-right py-2 text-red-600 dark:text-red-400">
                        {dayTotals.calorias.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Totals */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Totales de la {title === 'Resumen General (Ambas Semanas)' ? 'Ambas Semanas' : 'Semana'}
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Proteínas</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {summary.weeklyTotals.proteinas.toFixed(0)}g
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Grasas</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {summary.weeklyTotals.grasas.toFixed(0)}g
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Carbohidratos</p>
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                {summary.weeklyTotals.carbs.toFixed(0)}g
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Calorías</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                {summary.weeklyTotals.calorias.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Averages & Goals */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Promedios Diarios y Objetivos
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Proteínas</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Objetivo: 195g/día
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${NutritionCalculations.getProgressColor(goalProgress.protein.percentage)}`}>
                  {summary.averageDaily.proteinas.toFixed(1)}g
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {goalProgress.protein.percentage.toFixed(0)}% del objetivo
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Calorías</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Objetivo: 1450 cal/día
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${NutritionCalculations.getProgressColor(goalProgress.calories.percentage)}`}>
                  {summary.averageDaily.calorias.toFixed(0)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {goalProgress.calories.percentage.toFixed(0)}% del objetivo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${className} space-y-8`}>
      {/* Combined Summary */}
      {renderSummaryCard(combinedSummary, 'Resumen General (Ambas Semanas)')}

      {/* Individual Week Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderSummaryCard(week1Summary, 'Semana 1')}
        {renderSummaryCard(week2Summary, 'Semana 2')}
      </div>

      {/* Additional Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Análisis y Recomendaciones
        </h3>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Objetivo del Plan</h4>
            <p>Este plan está diseñado para recomposición corporal con un objetivo de 195g de proteína diaria y aproximadamente 1450 calorías para una persona de 96kg.</p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Distribución de Macronutrientes</h4>
            <p>La distribución está optimizada para maximizar la síntesis de proteínas y mantener un déficit calórico controlado para la pérdida de grasa.</p>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Suplementación</h4>
            <p>Incluye 6g de creatina diaria y proteína de suero post-entreno para optimizar la recuperación y el rendimiento.</p>
          </div>
        </div>
      </div>
    </div>
  );
};