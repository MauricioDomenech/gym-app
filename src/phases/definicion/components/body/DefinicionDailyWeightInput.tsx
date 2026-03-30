import React, { useState, useEffect } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import type { DefinicionDailyWeight } from '../../types/definicion';

const DAYS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_SHORT: Record<string, string> = {
  lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D',
};

export const DefinicionDailyWeightInput: React.FC = () => {
  const { currentWeek, currentDay, dailyWeights, addDailyWeight } = useDefinicionData();

  const weekWeights = dailyWeights.filter(w => w.week === currentWeek);
  const todayEntry = weekWeights.find(w => w.day === currentDay);

  const [peso, setPeso] = useState<string>(todayEntry?.peso?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const entry = dailyWeights.find(w => w.week === currentWeek && w.day === currentDay);
    setPeso(entry?.peso?.toString() || '');
  }, [currentWeek, currentDay, dailyWeights]);

  const handleSave = async () => {
    const pesoNum = parseFloat(peso);
    if (!pesoNum || pesoNum <= 0) return;

    setIsSaving(true);
    try {
      const entry: DefinicionDailyWeight = {
        week: currentWeek,
        day: currentDay,
        peso: pesoNum,
        date: new Date().toISOString(),
        notas: '',
      };
      await addDailyWeight(entry);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error('Error saving daily weight:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  // Weekly average
  const weekPesos = weekWeights.map(w => w.peso).filter(p => p > 0);
  const weekAvg = weekPesos.length > 0
    ? (weekPesos.reduce((a, b) => a + b, 0) / weekPesos.length).toFixed(2)
    : null;

  // Previous week average for comparison
  const prevWeekWeights = dailyWeights.filter(w => w.week === currentWeek - 1);
  const prevPesos = prevWeekWeights.map(w => w.peso).filter(p => p > 0);
  const prevAvg = prevPesos.length > 0
    ? prevPesos.reduce((a, b) => a + b, 0) / prevPesos.length
    : null;

  const avgDiff = weekAvg && prevAvg ? (parseFloat(weekAvg) - prevAvg) : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">&#9878;</span>
          Peso diario - Semana {currentWeek}
        </h3>
        {weekAvg && (
          <div className="text-right">
            <span className="text-xs text-gray-500 dark:text-gray-400">Promedio: </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{weekAvg} kg</span>
            {avgDiff !== null && (
              <span className={`text-xs ml-1 ${avgDiff <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                ({avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(2)})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Week day pills */}
      <div className="flex gap-1 mb-3">
        {DAYS_ORDER.map(day => {
          const dayWeight = weekWeights.find(w => w.day === day);
          const isToday = day === currentDay;
          return (
            <div
              key={day}
              className={`flex-1 text-center rounded-md py-1 text-xs transition-colors ${
                isToday
                  ? 'ring-2 ring-emerald-500 dark:ring-emerald-400'
                  : ''
              } ${
                dayWeight
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className="font-medium">{DAYS_SHORT[day]}</div>
              <div className="text-[10px]">{dayWeight ? `${dayWeight.peso}` : '-'}</div>
            </div>
          );
        })}
      </div>

      {/* Input for current day */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="50"
          max="200"
          step="0.1"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Peso ${currentDay} (kg)`}
          className="flex-1 px-3 py-2 text-sm border border-emerald-300 dark:border-emerald-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !peso || parseFloat(peso) <= 0}
          className={`px-3 py-2 text-sm font-medium text-white rounded-md transition-colors ${
            isSaving || !peso || parseFloat(peso) <= 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isSaving ? '...' : todayEntry ? 'Actualizar' : 'Guardar'}
        </button>
        {justSaved && (
          <span className="text-xs text-green-600 dark:text-green-400 animate-pulse">OK</span>
        )}
      </div>

      {/* Info text */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        Pesarse en ayunas, post-bano, sin ropa. {weekPesos.length}/7 dias registrados.
      </p>
    </div>
  );
};
