import React, { useMemo } from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { buildWeeklyCheckinData } from '../../utils/progressAnalytics';
import { DefinicionProgressChart } from './DefinicionProgressChart';
import { RECOMP_PLAN, TOTAL_WEEKS } from '../../types/definicion';
import type { ProgressAlert } from '../../types/definicion';

function parseNotesBlock(notes: string, blockName: string): Record<string, string> {
  const regex = new RegExp(`\\n?\\[${blockName}\\]\\n([\\s\\S]*?)\\n\\[\\/${blockName}\\]`);
  const match = notes.match(regex);
  if (!match) return {};

  return match[1].split('\n').reduce<Record<string, string>>((acc, line) => {
    const separator = line.indexOf('=');
    if (separator <= 0) return acc;
    acc[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    return acc;
  }, {});
}

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
  const currentBody = useMemo(() =>
    bodyComposition.find(b => b.week === effectiveWeek) || null,
    [bodyComposition, effectiveWeek]
  );

  const previousBody = useMemo(() =>
    [...bodyComposition]
      .filter(b => b.week < effectiveWeek)
      .sort((a, b) => b.week - a.week)[0] || null,
    [bodyComposition, effectiveWeek]
  );

  const weeklyChange = currentBody && previousBody
    ? Math.round((currentBody.peso - previousBody.peso) * 100) / 100
    : null;
  const weeklyLoss = weeklyChange !== null ? -weeklyChange : null;

  const biaData = useMemo(() => {
    const fallback = parseNotesBlock(currentBody?.notas || '', 'BIA_EXTRA');
    return {
      grasaVisceral: currentBody?.grasaVisceral?.toString() || fallback.grasaVisceral,
      masaMuscular: currentBody?.masaMuscular?.toString() || fallback.masaMuscular,
      aguaCorporal: currentBody?.aguaCorporal?.toString() || fallback.aguaCorporal,
      tmb: currentBody?.tmb?.toString() || fallback.tmb,
      imc: currentBody?.imc?.toString() || fallback.imc,
    };
  }, [currentBody]);
  const adherenceData = useMemo(() => {
    const fallback = parseNotesBlock(currentBody?.notas || '', 'CHECKIN_RECOMP_LENTA');
    return {
      comidasRelax: currentBody?.comidasRelax?.toString() || fallback.comidasRelax,
      adherenciaNutricion: currentBody?.adherenciaNutricion?.toString() || fallback.adherenciaNutricion,
      suenoPromedio: currentBody?.suenoPromedio?.toString() || fallback.suenoPromedio,
      hambre: currentBody?.hambre?.toString() || fallback.hambre,
      energia: currentBody?.energia?.toString() || fallback.energia,
      molestias: currentBody?.molestias || fallback.molestias,
    };
  }, [currentBody]);

  const status = useMemo(() => {
    if (checkinData.actualWeight === null) {
      return { label: 'Sin datos de peso', color: 'gray', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-700 dark:text-gray-300', icon: '?' };
    }
    if (weeklyLoss === null) {
      return { label: 'Primer dato de seguimiento', color: 'blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300', icon: 'i' };
    }
    if (weeklyLoss > RECOMP_PLAN.rapidWeeklyLossKg) {
      return { label: 'Bajada demasiado rapida', color: 'red', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300', icon: '!!' };
    }
    if (weeklyLoss > RECOMP_PLAN.acceptableWeeklyLossMax) {
      return { label: 'Ritmo alto, vigilar recuperacion', color: 'cyan', bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', textClass: 'text-cyan-700 dark:text-cyan-300', icon: 'i' };
    }
    if (weeklyLoss >= RECOMP_PLAN.targetWeeklyLossMin && weeklyLoss <= RECOMP_PLAN.targetWeeklyLossMax) {
      return { label: 'Ritmo objetivo', color: 'green', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-300', icon: '\u2713' };
    }
    if (weeklyLoss >= 0) {
      return { label: 'Bajada lenta o estable', color: 'amber', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', icon: '!' };
    }
    return { label: 'Peso al alza', color: 'amber', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', icon: '!' };
  }, [checkinData.actualWeight, weeklyLoss]);

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
                {RECOMP_PLAN.name} — Semana {effectiveWeek}
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Objetivo/sem</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{RECOMP_PLAN.targetWeeklyLossMin}-{RECOMP_PLAN.targetWeeklyLossMax} kg</p>
            </div>
            {weeklyChange !== null && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Cambio</p>
                <p className={`text-lg font-bold ${weeklyChange <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)} kg
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

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marco Actual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <PlanMetric label="Objetivo" value={RECOMP_PLAN.targetLabel} />
          <PlanMetric label="Calorias" value={`${RECOMP_PLAN.kcalRange} (~${RECOMP_PLAN.kcalAverage})`} />
          <PlanMetric label="Proteina" value={RECOMP_PLAN.proteinRange} />
          <PlanMetric label="Alerta roja" value={`>${RECOMP_PLAN.rapidWeeklyLossKg} kg/sem`} />
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Cambio Semanal</p>
            <p className={`text-xl font-bold ${
              weeklyChange === null ? 'text-gray-400' :
              weeklyChange <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {weeklyChange !== null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg` : '-'}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Rango Objetivo</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{RECOMP_PLAN.targetWeeklyLossMin}-{RECOMP_PLAN.targetWeeklyLossMax}</p>
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

      {(Object.keys(biaData).length > 0 || Object.keys(adherenceData).length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Check-in Semanal</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MiniMetric label="Grasa visceral" value={biaData.grasaVisceral} />
            <MiniMetric label="Masa muscular" value={biaData.masaMuscular ? `${biaData.masaMuscular} kg` : undefined} />
            <MiniMetric label="Agua" value={biaData.aguaCorporal ? `${biaData.aguaCorporal}%` : undefined} />
            <MiniMetric label="Comidas relax" value={adherenceData.comidasRelax} />
            <MiniMetric label="Adherencia" value={adherenceData.adherenciaNutricion ? `${adherenceData.adherenciaNutricion}%` : undefined} />
            <MiniMetric label="Sueno" value={adherenceData.suenoPromedio ? `${adherenceData.suenoPromedio} h` : undefined} />
            <MiniMetric label="Hambre" value={adherenceData.hambre} />
            <MiniMetric label="Energia" value={adherenceData.energia} />
            <MiniMetric label="TMB" value={biaData.tmb ? `${biaData.tmb} kcal` : undefined} />
            <MiniMetric label="IMC" value={biaData.imc} />
          </div>
          {adherenceData.molestias && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Molestias: {adherenceData.molestias}</p>
          )}
        </div>
      )}

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
          {/* RIR */}
          {checkinData.adherence.rir.totalLogs > 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Intensidad (RIR)</p>
                <p className={`text-2xl font-bold ${
                  checkinData.adherence.rir.averageRIR >= 1 && checkinData.adherence.rir.averageRIR <= 2
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : checkinData.adherence.rir.averageRIR < 1
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {checkinData.adherence.rir.averageRIR.toFixed(1)}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                RIR promedio ({checkinData.adherence.rir.totalLogs} registros) —
                {checkinData.adherence.rir.averageRIR >= 1 && checkinData.adherence.rir.averageRIR <= 2
                  ? ' Zona ideal para definicion'
                  : checkinData.adherence.rir.averageRIR < 1
                    ? ' Demasiada intensidad, cuidado con la fatiga'
                    : ' Podrias empujar un poco mas'}
              </p>
            </div>
          ) : (
            <AdherenceCard
              title="Intensidad (RIR)"
              value={0}
              subtitle="Sin registros de RIR"
              color="amber"
            />
          )}
        </div>
      </div>

      {/* 5. Resumen del Plan */}
      {phasesWithData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen del Plan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400">Plan</th>
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

const PlanMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
    <p className="text-xs text-emerald-700 dark:text-emerald-300">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const MiniMetric: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</p>
  </div>
);

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
