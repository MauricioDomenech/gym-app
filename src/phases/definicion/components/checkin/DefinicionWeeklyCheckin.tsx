import React, { useMemo } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { buildWeeklyCheckinData } from '../../utils/progressAnalytics';
import { DefinicionProgressChart } from './DefinicionProgressChart';
import { TOTAL_WEEKS } from '../../types/definicion';
import type { ProgressAlert } from '../../types/definicion';

export const DefinicionWeeklyCheckin: React.FC = () => {
  const { bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek } = useDefinicionData();

  // Fix M1: When in Summary (currentWeek=0), calculate the effective week from actual data
  const effectiveWeek = useMemo(() => {
    if (currentWeek > 0) return currentWeek;
    const maxBodyWeek = bodyComposition.length > 0
      ? Math.max(...bodyComposition.map(b => b.week))
      : 0;
    const maxProgressWeek = workoutProgress.length > 0
      ? Math.max(...workoutProgress.map(p => p.week))
      : 0;
    return Math.max(maxBodyWeek, maxProgressWeek, 1);
  }, [currentWeek, bodyComposition, workoutProgress]);

  const checkinData = useMemo(() =>
    buildWeeklyCheckinData({
      bodyComposition,
      workoutProgress,
      workoutData,
      cardioLogs,
      currentWeek: effectiveWeek,
    }),
    [bodyComposition, workoutProgress, workoutData, cardioLogs, effectiveWeek]
  );

  const projection = checkinData.projection;

  const status = useMemo(() => {
    if (checkinData.actualWeight === null) {
      return { label: 'Sin datos de peso', color: 'gray', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-700 dark:text-gray-300', icon: '?' };
    }
    const diff = checkinData.weightDiff ?? 0;
    if (diff < -2) {
      return { label: 'Perdida muy rapida', color: 'red', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300', icon: '!!' };
    }
    if (diff < -0.5) {
      return { label: 'Adelantado al ritmo', color: 'cyan', bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', textClass: 'text-cyan-700 dark:text-cyan-300', icon: 'i' };
    }
    if (diff > 0.5) {
      return { label: 'Por encima del ritmo', color: 'amber', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', icon: '!' };
    }
    return { label: 'En ritmo', color: 'green', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-300', icon: '\u2713' };
  }, [checkinData.actualWeight, checkinData.weightDiff]);

  // Last 4 body composition entries for mini table
  const sortedBody = useMemo(() =>
    [...bodyComposition].sort((a, b) => a.week - b.week).slice(-4),
    [bodyComposition]
  );

  // Phase comparisons with data
  const phasesWithData = useMemo(() =>
    checkinData.phaseComparisons.filter(p => p.startWeight !== null && p.endWeight !== null),
    [checkinData.phaseComparisons]
  );

  return (
    <div className="space-y-6">
      {/* 1. Banner de Estado General */}
      <div className={`rounded-lg shadow-lg p-6 ${status.bgClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${status.textClass} bg-white/60 dark:bg-black/20`}>
              {status.icon}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${status.textClass}`}>{status.label}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Semana {effectiveWeek} de {TOTAL_WEEKS}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {checkinData.actualWeight !== null && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Actual</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{checkinData.actualWeight} kg</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{checkinData.expectedWeight.toFixed(1)} kg</p>
            </div>
            {checkinData.weightDiff !== null && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                <p className={`text-lg font-bold ${checkinData.weightDiff <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {checkinData.weightDiff > 0 ? '+' : ''}{checkinData.weightDiff.toFixed(1)} kg
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-white/40 dark:bg-black/20 rounded-full h-2.5">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min((effectiveWeek / TOTAL_WEEKS) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {Math.round((effectiveWeek / TOTAL_WEEKS) * 100)}% completado
          </p>
        </div>
      </div>

      {/* 2. Analisis de Peso */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Analisis de Peso</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Peso Actual</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {checkinData.actualWeight !== null ? `${checkinData.actualWeight} kg` : '-'}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Peso Esperado</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{checkinData.expectedWeight.toFixed(1)} kg</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
            <p className={`text-xl font-bold ${
              checkinData.weightDiff === null ? 'text-gray-400' :
              checkinData.weightDiff <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {checkinData.weightDiff !== null ? `${checkinData.weightDiff > 0 ? '+' : ''}${checkinData.weightDiff.toFixed(1)} kg` : '-'}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Perdida/sem</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {projection.weeklyLossRate > 0 ? `${projection.weeklyLossRate.toFixed(2)} kg` : '-'}
            </p>
          </div>
        </div>

        {/* Mini table: last 4 entries */}
        {sortedBody.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Semana</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Peso</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {sortedBody.map((entry, idx) => {
                  const prev = idx > 0 ? sortedBody[idx - 1] : null;
                  const change = prev ? entry.peso - prev.peso : null;
                  return (
                    <tr key={entry.week} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white">S{entry.week}</td>
                      <td className="py-1.5 px-2 text-center text-gray-900 dark:text-white">{entry.peso} kg</td>
                      <td className={`py-1.5 px-2 text-center font-medium ${
                        change === null ? 'text-gray-400' :
                        change <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Grafico de Progreso */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grafico de Progreso</h3>
        <DefinicionProgressChart bodyData={bodyComposition} projection={projection} />
      </div>

      {/* 4. Adherencia (grid 2x2) */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adherencia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entrenamiento */}
          <AdherenceCard
            title="Entrenamiento"
            value={checkinData.adherence.training.overallPercent}
            subtitle={`Racha: ${checkinData.adherence.training.streak} semanas`}
            color="emerald"
          />
          {/* Cardio */}
          <AdherenceCard
            title="Cardio"
            value={checkinData.adherence.cardio.overallPercent}
            subtitle={`${checkinData.adherence.cardio.totalMinutes} min totales`}
            color="cyan"
          />
          {/* Peso */}
          <AdherenceCard
            title="Seguimiento de Peso"
            value={checkinData.adherence.bodyTracking.weeksElapsed > 0
              ? Math.round((checkinData.adherence.bodyTracking.weeksTracked / checkinData.adherence.bodyTracking.weeksElapsed) * 100)
              : 0}
            subtitle={`${checkinData.adherence.bodyTracking.weeksTracked} / ${checkinData.adherence.bodyTracking.weeksElapsed} semanas`}
            color="violet"
          />
          {/* RPE */}
          <AdherenceCard
            title="RPE"
            value={checkinData.adherence.rpe.adherencePercent}
            subtitle={`Delta promedio: ${checkinData.adherence.rpe.averageDelta.toFixed(1)}`}
            color="amber"
          />
        </div>
      </div>

      {/* 5. Comparacion por Fases */}
      {phasesWithData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comparacion por Fases</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Fase</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Cambio peso</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Ritmo/sem</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Entreno</th>
                  <th className="text-center py-2 px-2 text-gray-600 dark:text-gray-400">Cardio</th>
                </tr>
              </thead>
              <tbody>
                {phasesWithData.map(phase => (
                  <tr key={phase.phaseId} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white">{phase.phaseName}</td>
                    <td className={`py-1.5 px-2 text-center font-medium ${
                      phase.weightChange !== null && phase.weightChange <= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {phase.weightChange !== null ? `${phase.weightChange > 0 ? '+' : ''}${phase.weightChange.toFixed(1)} kg` : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">
                      {phase.weeklyRate !== null ? `${phase.weeklyRate.toFixed(2)} kg` : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">{phase.trainingAdherence}%</td>
                    <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">{phase.cardioAdherence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Alertas Activas */}
      {checkinData.alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alertas</h3>
          <div className="space-y-3">
            {checkinData.alerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

interface AdherenceCardProps {
  title: string;
  value: number;
  subtitle: string;
  color: 'emerald' | 'cyan' | 'violet' | 'amber';
}

const colorMap = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', track: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', track: 'bg-cyan-100 dark:bg-cyan-900/30' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', track: 'bg-violet-100 dark:bg-violet-900/30' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', track: 'bg-amber-100 dark:bg-amber-900/30' },
};

const AdherenceCard: React.FC<AdherenceCardProps> = ({ title, value, subtitle, color }) => {
  const colors = colorMap[color];
  return (
    <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
        <p className={`text-2xl font-bold ${colors.text}`}>{value}%</p>
      </div>
      <div className={`w-full ${colors.track} rounded-full h-2`}>
        <div
          className={`${colors.bg} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{subtitle}</p>
    </div>
  );
};

const alertStyles: Record<string, { bg: string; border: string; icon: string; iconBg: string }> = {
  success: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: '\u2713', iconBg: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'i', iconBg: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: '!', iconBg: 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300' },
  error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: '!!', iconBg: 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300' },
};

const AlertItem: React.FC<{ alert: ProgressAlert }> = ({ alert }) => {
  const style = alertStyles[alert.severity] || alertStyles.info;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${style.iconBg}`}>
        {style.icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{alert.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
      </div>
    </div>
  );
};
