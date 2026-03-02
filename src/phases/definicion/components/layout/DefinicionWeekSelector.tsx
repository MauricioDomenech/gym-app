import React from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { getSubPhaseForWeek, getWeeksForSubPhase, getMesocycleInfo } from '../../types/definicion';

export const DefinicionWeekSelector: React.FC = () => {
  const { currentWeek, setCurrentWeek, workoutProgress } = useDefinicionData();
  const currentSubPhase = getSubPhaseForWeek(currentWeek);
  const weeksInPhase = getWeeksForSubPhase(currentSubPhase.id);

  const weekHasData = (week: number): boolean => {
    return workoutProgress.some(p => p.week === week);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-emerald-200 dark:border-slate-700">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Summary button */}
          <button
            onClick={() => setCurrentWeek(0)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentWeek === 0
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
            }`}
          >
            Res
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 flex-shrink-0" />

          {/* Week buttons */}
          {weeksInPhase.map(week => {
            const mesocycle = getMesocycleInfo(week);
            const isActive = currentWeek === week;
            const hasData = weekHasData(week);

            return (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
                  isActive
                    ? currentSubPhase.esDietBreak
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                    : mesocycle.isDeload
                      ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
                title={mesocycle.isDeload ? `Semana ${week} (Deload)` : `Semana ${week}`}
              >
                S{week}
                {mesocycle.isDeload && !isActive && (
                  <span className="ml-0.5 text-[10px]">↻</span>
                )}
                {hasData && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
