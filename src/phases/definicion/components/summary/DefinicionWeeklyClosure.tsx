import React, { useMemo, useState } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { RECOMP_PLAN, TOTAL_WEEKS } from '../../types/definicion';
import {
  buildWeeklyClosureSummary,
  getWeeklyClosureStatus,
} from '../../utils/weeklyClosure';
import type { WeeklyClosureChecklistItem } from '../../utils/weeklyClosure';

export const DefinicionWeeklyClosure: React.FC = () => {
  const {
    workoutData,
    workoutProgress,
    bodyComposition,
    cardioLogs,
    dailyWeights,
    getCardioConfig,
  } = useDefinicionData();

  const latestWeekWithData = Math.max(
    1,
    ...workoutProgress.map(p => p.week),
    ...bodyComposition.map(b => b.week),
    ...cardioLogs.map(c => c.week),
    ...dailyWeights.map(w => w.week)
  );
  const [selectedWeek, setSelectedWeek] = useState(Math.min(latestWeekWithData, TOTAL_WEEKS));

  const closure = useMemo(() => buildWeeklyClosureSummary({
    week: selectedWeek,
    workoutData,
    workoutProgress,
    bodyComposition,
    cardioLogs,
    dailyWeights,
    getCardioConfig,
  }), [selectedWeek, workoutData, workoutProgress, bodyComposition, cardioLogs, dailyWeights, getCardioConfig]);
  const statusConfig = getWeeklyClosureStatus(closure.readiness);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Cierre Semanal
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Checklist para revisar la semana antes de crear el import siguiente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Semana</label>
          <select
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(Number(event.target.value))}
            className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-700 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>S{week}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${statusConfig.classes}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{statusConfig.label}</p>
            <p className="mt-1 text-sm opacity-90">{statusConfig.detail}</p>
          </div>
          <div className="text-sm font-semibold">
            {closure.requiredCompleted}/{closure.requiredTotal} claves completas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
        <ClosureMetric label="Cambio vs registro previo" value={closure.metrics.weeklyChangeKg !== null ? `${closure.metrics.weeklyChangeKg > 0 ? '+' : ''}${closure.metrics.weeklyChangeKg} kg` : '-'} />
        <ClosureMetric label="Ritmo objetivo" value={`${RECOMP_PLAN.targetWeeklyLossMin}-${RECOMP_PLAN.targetWeeklyLossMax} kg/sem`} />
        <ClosureMetric label="Cardio" value={`${closure.metrics.cardioPercent}%`} />
        <ClosureMetric label="Objetivos importados" value={`${closure.metrics.coachTargets}`} />
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {closure.checklist.map(item => (
          <ChecklistRow key={item.label} item={item} />
        ))}
      </div>

      <div className="mt-5 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Siguiente paso</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {closure.nextStep}
        </p>
      </div>
    </div>
  );
};

const ClosureMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
    <p className="text-xs text-emerald-700 dark:text-emerald-300">{label}</p>
    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const ChecklistRow: React.FC<{ item: WeeklyClosureChecklistItem }> = ({ item }) => (
  <div className={`p-3 rounded-lg border ${
    item.ok
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : item.required
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
  }`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{item.value}</p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        item.ok
          ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
          : item.required
            ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
            : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200'
      }`}>
        {item.ok ? 'OK' : item.required ? 'Falta' : 'Opcional'}
      </span>
    </div>
  </div>
);
