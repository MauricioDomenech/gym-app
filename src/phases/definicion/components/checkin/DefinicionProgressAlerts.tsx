import React, { useMemo } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { getProgressAlerts } from '../../utils/progressAnalytics';

export const DefinicionProgressAlerts: React.FC = () => {
  const { bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek, setCurrentWeek } = useDefinicionData();

  const activeAlerts = useMemo(() => {
    const alerts = getProgressAlerts({ bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek });
    return alerts.filter(a => a.severity === 'warning' || a.severity === 'error');
  }, [bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek]);

  if (activeAlerts.length === 0) return null;

  const hasError = activeAlerts.some(a => a.severity === 'error');

  const bgClass = hasError
    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800';

  const textClass = hasError
    ? 'text-red-700 dark:text-red-300'
    : 'text-amber-700 dark:text-amber-300';

  const alertText = activeAlerts.length === 1 ? '1 alerta activa' : `${activeAlerts.length} alertas activas`;

  return (
    <div className={`${bgClass} rounded-lg p-3 mb-4`}>
      <div className="flex items-center justify-between">
        <span className={`${textClass} text-sm font-medium`}>
          ⚠ {alertText}
        </span>
        <button
          onClick={() => setCurrentWeek(0)}
          className={`${textClass} text-sm font-medium hover:underline`}
        >
          Ver check-in →
        </button>
      </div>
    </div>
  );
};
