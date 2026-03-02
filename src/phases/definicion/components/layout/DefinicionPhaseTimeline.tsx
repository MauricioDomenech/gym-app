import React from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DEFINICION_SUB_PHASES, getSubPhaseForWeek, TOTAL_WEEKS } from '../../types/definicion';

export const DefinicionPhaseTimeline: React.FC = () => {
  const { currentWeek, setCurrentWeek } = useDefinicionData();
  const currentSubPhase = getSubPhaseForWeek(currentWeek);

  const handleSubPhaseClick = (subPhase: typeof DEFINICION_SUB_PHASES[0]) => {
    setCurrentWeek(subPhase.semanaInicio);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-emerald-200 dark:border-slate-700 px-4 py-3">
      {/* Desktop: full timeline */}
      <div className="hidden sm:block max-w-4xl mx-auto">
        <div className="flex items-center gap-1 mb-2">
          {DEFINICION_SUB_PHASES.map((phase) => {
            const widthPercent = ((phase.semanaFin - phase.semanaInicio + 1) / TOTAL_WEEKS) * 100;
            const isActive = phase.id === currentSubPhase.id;
            const isDietBreak = phase.esDietBreak;

            return (
              <button
                key={phase.id}
                onClick={() => handleSubPhaseClick(phase)}
                style={{ width: `${widthPercent}%` }}
                className={`h-8 rounded-md text-xs font-medium transition-all duration-200 ${
                  isDietBreak
                    ? isActive
                      ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : isActive
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                }`}
              >
                {phase.nombreCorto}
              </button>
            );
          })}
        </div>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            Semana {currentWeek}/{TOTAL_WEEKS}
          </span>
          {' — '}
          <span>{currentSubPhase.nombre}</span>
          {' '}
          <span className="text-gray-500">({currentSubPhase.kcalDiarias} kcal/dia)</span>
        </div>
      </div>

      {/* Mobile: compact with arrows */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const idx = DEFINICION_SUB_PHASES.findIndex(p => p.id === currentSubPhase.id);
              if (idx > 0) handleSubPhaseClick(DEFINICION_SUB_PHASES[idx - 1]);
            }}
            disabled={DEFINICION_SUB_PHASES[0].id === currentSubPhase.id}
            className="p-2 text-emerald-600 dark:text-emerald-400 disabled:opacity-30"
          >
            ←
          </button>
          <div className="text-center">
            <div className={`text-sm font-semibold ${currentSubPhase.esDietBreak ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {currentSubPhase.nombre}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Semana {currentWeek}/{TOTAL_WEEKS} — {currentSubPhase.kcalDiarias} kcal
            </div>
          </div>
          <button
            onClick={() => {
              const idx = DEFINICION_SUB_PHASES.findIndex(p => p.id === currentSubPhase.id);
              if (idx < DEFINICION_SUB_PHASES.length - 1) handleSubPhaseClick(DEFINICION_SUB_PHASES[idx + 1]);
            }}
            disabled={DEFINICION_SUB_PHASES[DEFINICION_SUB_PHASES.length - 1].id === currentSubPhase.id}
            className="p-2 text-emerald-600 dark:text-emerald-400 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};
