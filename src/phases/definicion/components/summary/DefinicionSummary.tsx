import React from 'react';
import { useDefinicionData } from '../../contexts/DefinicionDataContext';
import { DefinicionBodyChart } from '../body/DefinicionBodyChart';
import { DefinicionWeeklyCheckin } from '../checkin/DefinicionWeeklyCheckin';
import { DefinicionWeeklyReport } from './DefinicionWeeklyReport';
import { DefinicionWeeklyDataExchange } from './DefinicionWeeklyDataExchange';
import { DEFINICION_SUB_PHASES, TOTAL_WEEKS, getMesocycleInfo } from '../../types/definicion';
import type { DefinicionNutritionTotals } from '../../types/definicion';

export const DefinicionSummary: React.FC = () => {
  const { nutritionData, workoutData, workoutProgress, bodyComposition, cardioLogs, currentWeek } = useDefinicionData();

  const getDaysOfWeek = () => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  const getSubPhaseNutritionAverage = (startWeek: number, endWeek: number) => {
    const totals: DefinicionNutritionTotals = { kcal: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0, fibra_g: 0, calorias: 0 };
    let dayCount = 0;

    for (let week = startWeek; week <= endWeek; week++) {
      getDaysOfWeek().forEach(day => {
        const dayData = nutritionData[week]?.[day];
        if (dayData) {
          totals.kcal += dayData.totals.kcal;
          totals.proteinas_g += dayData.totals.proteinas_g;
          totals.carbohidratos_g += dayData.totals.carbohidratos_g;
          totals.grasas_g += dayData.totals.grasas_g;
          totals.fibra_g += dayData.totals.fibra_g;
          dayCount++;
        }
      });
    }

    if (dayCount === 0) return totals;
    return {
      kcal: totals.kcal / dayCount,
      proteinas_g: totals.proteinas_g / dayCount,
      carbohidratos_g: totals.carbohidratos_g / dayCount,
      grasas_g: totals.grasas_g / dayCount,
      fibra_g: totals.fibra_g / dayCount,
      calorias: totals.kcal / dayCount,
    };
  };

  const getWorkoutStats = () => {
    let totalExercises = 0;
    for (let week = 1; week <= TOTAL_WEEKS; week++) {
      getDaysOfWeek().forEach(day => {
        const workout = workoutData[week]?.[day];
        if (workout) totalExercises += workout.exercises.length;
      });
    }

    return {
      totalTracked: workoutProgress.length,
      totalExercises,
      completionRate: totalExercises > 0 ? (workoutProgress.length / totalExercises) * 100 : 0,
    };
  };

  const getCardioStats = () => {
    const completed = cardioLogs.filter(l => l.completado);
    const totalMinutes = completed.reduce((sum, l) => sum + l.duracionMinutos, 0);

    return {
      sessionsCompleted: completed.length,
      totalMinutes,
      lissCount: completed.filter(l => l.tipo === 'liss').length,
      hiitCount: completed.filter(l => l.tipo === 'hiit').length,
    };
  };

  const workoutStats = getWorkoutStats();
  const cardioStats = getCardioStats();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Resumen del Plan de Definicion
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Plan de 22 semanas — Analisis completo
        </p>
      </div>

      {/* Weekly Check-in */}
      <DefinicionWeeklyCheckin />

      {/* Phase Timeline Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Progreso por Sub-Fase
        </h3>
        <div className="space-y-4">
          {DEFINICION_SUB_PHASES.map(phase => {
            const avgNutrition = getSubPhaseNutritionAverage(phase.semanaInicio, phase.semanaFin);
            const phaseProgress = workoutProgress.filter(p =>
              p.week >= phase.semanaInicio && p.week <= phase.semanaFin
            ).length;
            const phaseWeeksCount = phase.semanaFin - phase.semanaInicio + 1;
            const bodyEntry = bodyComposition.find(b =>
              b.week >= phase.semanaInicio && b.week <= phase.semanaFin
            );

            return (
              <div
                key={phase.id}
                className={`p-4 rounded-lg border-2 ${
                  phase.esDietBreak
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                    : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {phase.nombre}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Semanas {phase.semanaInicio}-{phase.semanaFin} ({phaseWeeksCount} sem.) — {phase.kcalDiarias} kcal/dia
                      {phase.deficit > 0 && ` (deficit ${phase.deficit} kcal)`}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Promedio kcal</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300">
                        {avgNutrition.kcal.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ejercicios</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300">
                        {phaseProgress}
                      </p>
                    </div>
                    {bodyEntry && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Peso</p>
                        <p className="font-bold text-violet-700 dark:text-violet-300">
                          {bodyEntry.peso} kg
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Workout Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-emerald-600 dark:text-emerald-400 text-3xl mb-2">💪</div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Entrenamiento</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {workoutStats.totalTracked}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ejercicios registrados
            </p>
            {workoutStats.completionRate > 0 && (
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {workoutStats.completionRate.toFixed(1)}% completado
              </div>
            )}
          </div>
        </div>

        {/* Cardio Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-cyan-600 dark:text-cyan-400 text-3xl mb-2">🏃</div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cardio</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {cardioStats.sessionsCompleted}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              sesiones ({cardioStats.totalMinutes} min total)
            </p>
            <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400">
              LISS: {cardioStats.lissCount} | HIIT: {cardioStats.hiitCount}
            </div>
          </div>
        </div>

        {/* Body Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-violet-600 dark:text-violet-400 text-3xl mb-2">📏</div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Composicion</h4>
            {bodyComposition.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {bodyComposition[bodyComposition.length - 1].peso} kg
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  peso actual
                </p>
                {bodyComposition.length >= 2 && (
                  <div className={`mt-2 text-xs font-medium ${
                    bodyComposition[bodyComposition.length - 1].peso < bodyComposition[0].peso
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(bodyComposition[bodyComposition.length - 1].peso - bodyComposition[0].peso).toFixed(1)} kg desde inicio
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Sin datos aun
              </p>
            )}
          </div>
        </div>

        {/* Weeks Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-emerald-600 dark:text-emerald-400 text-3xl mb-2">📅</div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Progreso</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {currentWeek}/{TOTAL_WEEKS}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              semanas
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: `${(currentWeek / TOTAL_WEEKS) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body Chart */}
      {bodyComposition.length > 1 && (
        <DefinicionBodyChart data={bodyComposition} currentWeek={currentWeek} />
      )}

      {/* Mesocycle Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Vista por Semanas
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Sem</th>
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Fase</th>
                <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300">Meso</th>
                <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300">Ej. Reg.</th>
                <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300">Cardio</th>
                <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300">Peso</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
                const meso = getMesocycleInfo(week);
                const subPhase = DEFINICION_SUB_PHASES.find(p => week >= p.semanaInicio && week <= p.semanaFin);
                const weekProgress = workoutProgress.filter(p => p.week === week).length;
                const weekCardio = cardioLogs.filter(l => l.week === week && l.completado).length;
                const bodyEntry = bodyComposition.find(b => b.week === week);

                return (
                  <tr
                    key={week}
                    className={`border-b border-gray-100 dark:border-slate-800 ${
                      week === currentWeek ? 'bg-emerald-50 dark:bg-emerald-900/20 font-medium' : ''
                    } ${meso.isDeload ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}
                  >
                    <td className="py-1.5 px-2 font-medium">S{week}</td>
                    <td className="py-1.5 px-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded-full ${
                        subPhase?.esDietBreak
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {subPhase?.nombreCorto}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center text-xs">
                      {meso.isDietBreak ? 'DB' : `M${meso.mesocycleNumber}.${meso.weekInMesocycle}`}
                      {meso.isDeload && ' ↻'}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {weekProgress > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{weekProgress}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {weekCardio > 0 ? (
                        <span className="text-cyan-600 dark:text-cyan-400">{weekCardio}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {bodyEntry ? (
                        <span className="text-violet-600 dark:text-violet-400">{bodyEntry.peso}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Data Export/Import */}
      <DefinicionWeeklyDataExchange />

      {/* Weekly Report Export */}
      <DefinicionWeeklyReport />

      {/* Tips */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          Consejos para la Definicion
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Nutricion</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Mantiene la proteina alta (~180g/dia)</li>
              <li>Los diet breaks ayudan a la adherencia</li>
              <li>Ajusta calorias gradualmente entre fases</li>
              <li>No bajes mas de 500-600 kcal de deficit</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Entrenamiento</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Registra tu RIR en cada ejercicio para monitorear fatiga</li>
              <li>Los deloads son obligatorios, no los saltes</li>
              <li>Prioriza mantener fuerza sobre volumen</li>
              <li>El cardio LISS preserva mas musculo que HIIT</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
