import {
  DEFINICION_SUB_PHASES,
  TOTAL_WEEKS,
  getMesocycleInfo,
  getCurrentRPE,
} from '../types/definicion';
import type {
  DefinicionBodyComposition,
  DefinicionWorkoutProgress,
  DefinicionWorkoutDay,
  DefinicionCardioLog,
  WeightProjection,
  ProgressAlert,
  AdherenceMetrics,
  PhaseComparison,
  WeeklyCheckinData,
} from '../types/definicion';
import { DefinicionExerciseParser } from '../services/definicionExerciseParser';

const START_WEIGHT = 102;
const GOAL_WEIGHT = 93;
const KCAL_PER_KG_FAT = 7700;
const DAYS_OF_WEEK = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

// ========================================
// 1. EXPECTED WEIGHT
// ========================================

export function getExpectedWeight(week: number, startWeight: number = START_WEIGHT): number {
  if (week < 1) return startWeight;
  const clampedWeek = Math.min(week, TOTAL_WEEKS);
  let weight = startWeight;
  for (let w = 1; w <= clampedWeek; w++) {
    const subPhase = DEFINICION_SUB_PHASES.find(p => w >= p.semanaInicio && w <= p.semanaFin);
    if (subPhase && !subPhase.esDietBreak) {
      weight -= (subPhase.deficit * 7) / KCAL_PER_KG_FAT;
    }
    // Diet break: weight stays the same
  }
  return Math.round(weight * 100) / 100;
}

// ========================================
// 2. WEIGHT PROJECTION
// ========================================

export function getWeightProjection(bodyData: DefinicionBodyComposition[]): WeightProjection {
  if (bodyData.length < 2) {
    return {
      projectedFinishWeight: START_WEIGHT,
      weeklyLossRate: 0,
      weeksToGoal: null,
      onTrack: false,
      dataPoints: bodyData.length,
    };
  }

  const sorted = [...bodyData].sort((a, b) => a.week - b.week);
  const n = sorted.length;

  // Linear regression: y = intercept + slope * x
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const entry of sorted) {
    sumX += entry.week;
    sumY += entry.peso;
    sumXY += entry.week * entry.peso;
    sumX2 += entry.week * entry.week;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return {
      projectedFinishWeight: sorted[sorted.length - 1].peso,
      weeklyLossRate: 0,
      weeksToGoal: null,
      onTrack: false,
      dataPoints: n,
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const projectedFinishWeight = Math.round((intercept + slope * TOTAL_WEEKS) * 100) / 100;
  const weeklyLossRate = Math.round(-slope * 100) / 100;

  const lastWeight = sorted[sorted.length - 1].peso;
  let weeksToGoal: number | null = null;
  if (slope < 0 && weeklyLossRate > 0) {
    weeksToGoal = Math.round(((lastWeight - GOAL_WEIGHT) / weeklyLossRate) * 10) / 10;
    if (weeksToGoal < 0) weeksToGoal = 0;
  }

  const onTrack = Math.abs(projectedFinishWeight - GOAL_WEIGHT) <= 1;

  return { projectedFinishWeight, weeklyLossRate, weeksToGoal, onTrack, dataPoints: n };
}

// ========================================
// 3. PROGRESS ALERTS
// ========================================

interface ProgressAlertsParams {
  bodyComposition: DefinicionBodyComposition[];
  workoutProgress: DefinicionWorkoutProgress[];
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  cardioLogs: DefinicionCardioLog[];
  currentWeek: number;
}

export function getProgressAlerts(params: ProgressAlertsParams): ProgressAlert[] {
  const { bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek } = params;
  const alerts: ProgressAlert[] = [];
  const sorted = [...bodyComposition].sort((a, b) => a.week - b.week);

  // 1. Plateau: 2+ consecutive entries with < 0.2kg difference
  if (sorted.length >= 2) {
    let consecutivePlateau = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i].peso - sorted[i - 1].peso) < 0.2) {
        consecutivePlateau++;
        if (consecutivePlateau >= 2) {
          alerts.push({
            id: 'plateau',
            severity: 'warning',
            title: 'Posible estancamiento',
            message: `Tu peso se ha mantenido estable (±0.2kg) durante ${consecutivePlateau} registros consecutivos. Considera revisar tu déficit calórico o ajustar el cardio.`,
            week: sorted[i].week,
          });
          break;
        }
      } else {
        consecutivePlateau = 1;
      }
    }
  }

  // 2. Rapid loss: > 1% body weight per week between entries
  if (sorted.length >= 2) {
    for (let i = 1; i < sorted.length; i++) {
      const loss = sorted[i - 1].peso - sorted[i].peso;
      if (loss <= 0) continue;
      const weekDelta = sorted[i].week - sorted[i - 1].week;
      const percentLoss = (loss / sorted[i - 1].peso) * 100;
      const weeklyPercentLoss = percentLoss / Math.max(weekDelta, 1);
      if (weeklyPercentLoss > 1) {
        alerts.push({
          id: 'rapid-loss',
          severity: 'warning',
          title: 'Pérdida de peso muy rápida',
          message: `Perdiste ${loss.toFixed(1)}kg (${weeklyPercentLoss.toFixed(1)}%/sem) entre la semana ${sorted[i - 1].week} y ${sorted[i].week}. Una pérdida mayor al 1% semanal puede implicar pérdida muscular.`,
          week: sorted[i].week,
        });
        break;
      }
    }
  }

  // 3. Weight not logged this week
  if (currentWeek > 0) {
    const hasCurrentWeekEntry = bodyComposition.some(b => b.week === currentWeek);
    if (!hasCurrentWeekEntry) {
      alerts.push({
        id: 'weight-not-logged',
        severity: 'info',
        title: 'Peso no registrado',
        message: `No has registrado tu peso en la semana ${currentWeek}. El seguimiento semanal es clave para evaluar el progreso.`,
        week: currentWeek,
      });
    }
  }

  // 4. Low training adherence (< 70%)
  if (currentWeek > 0) {
    const weekWorkouts = workoutData[currentWeek];
    if (weekWorkouts) {
      let totalExercises = 0;
      let completedExercises = 0;
      for (const day of DAYS_OF_WEEK) {
        const dayWorkout = weekWorkouts[day];
        if (dayWorkout) {
          const exerciseCount = dayWorkout.exercises.length;
          totalExercises += exerciseCount;
          const dayCompleted = workoutProgress.filter(
            p => p.week === currentWeek && p.day === day
          ).length;
          completedExercises += Math.min(dayCompleted, exerciseCount);
        }
      }
      if (totalExercises > 0) {
        const percent = (completedExercises / totalExercises) * 100;
        if (percent < 70) {
          alerts.push({
            id: 'low-training',
            severity: 'warning',
            title: 'Adherencia baja al entrenamiento',
            message: `Solo has completado el ${Math.round(percent)}% de los ejercicios planificados esta semana. Intenta mantener al menos un 70%.`,
            week: currentWeek,
          });
        }
      }
    }
  }

  // 5. Low cardio adherence (< 50%)
  if (currentWeek > 0) {
    let plannedCardio = 0;
    let completedCardio = 0;
    for (const day of DAYS_OF_WEEK) {
      const config = DefinicionExerciseParser.getCardioConfig(day);
      if (config && config.tipo !== null) {
        plannedCardio++;
        const hasLog = cardioLogs.some(
          l => l.week === currentWeek && l.day === day && l.completado
        );
        if (hasLog) completedCardio++;
      }
    }
    if (plannedCardio > 0) {
      const percent = (completedCardio / plannedCardio) * 100;
      if (percent < 50) {
        alerts.push({
          id: 'low-cardio',
          severity: 'warning',
          title: 'Adherencia baja al cardio',
          message: `Has completado solo ${completedCardio} de ${plannedCardio} sesiones de cardio planificadas esta semana (${Math.round(percent)}%).`,
          week: currentWeek,
        });
      }
    }
  }

  // 6. On track (success)
  if (bodyComposition.length >= 3) {
    const projection = getWeightProjection(bodyComposition);
    if (projection.onTrack) {
      alerts.push({
        id: 'on-track',
        severity: 'success',
        title: 'Objetivo alcanzable',
        message: `Según tu progreso actual, se proyecta un peso final de ${projection.projectedFinishWeight.toFixed(1)}kg. ¡Vas por buen camino hacia los ${GOAL_WEIGHT}kg!`,
      });
    }
  }

  // 7. Compound strength drop
  if (currentWeek > 1) {
    const mesocycleInfo = getMesocycleInfo(currentWeek);
    if (!mesocycleInfo.isDeload && !mesocycleInfo.isDietBreak) {
      const trainingDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;

      for (const day of trainingDays) {
        const dayWorkout = workoutData[currentWeek]?.[day];
        if (!dayWorkout || dayWorkout.exercises.length === 0) continue;

        const compound = dayWorkout.exercises[0];

        const exerciseWeights = workoutProgress
          .filter(p => p.exerciseId === compound.id && !p.isAlternative && p.weights.length > 0)
          .sort((a, b) => a.week - b.week);

        if (exerciseWeights.length < 2) continue;

        const allWeights = exerciseWeights.flatMap(p => p.weights).filter(w => Number.isFinite(w) && w > 0);
        if (allWeights.length === 0) continue;
        const peak = Math.max(...allWeights);

        const recentWeights = exerciseWeights
          .filter(p => {
            if (p.week < currentWeek - 1) return false;
            const weekInfo = getMesocycleInfo(p.week);
            return !weekInfo.isDietBreak;
          })
          .flatMap(p => p.weights)
          .filter(w => Number.isFinite(w) && w > 0);

        if (recentWeights.length === 0) continue;
        const current = Math.max(...recentWeights);

        if (peak <= 0) continue;
        const dropPercent = ((peak - current) / peak) * 100;

        if (dropPercent >= 15) {
          alerts.push({
            id: `strength-drop-${day}`,
            severity: 'error',
            title: `Caída de fuerza severa: ${compound.name}`,
            message: `${compound.name} ha caído un ${dropPercent.toFixed(0)}% respecto al pico histórico (${peak}kg → ${current}kg). Esto puede indicar pérdida muscular o fatiga acumulada.`,
            week: currentWeek,
          });
        } else if (dropPercent >= 10) {
          alerts.push({
            id: `strength-drop-${day}`,
            severity: 'warning',
            title: `Caída de fuerza: ${compound.name}`,
            message: `${compound.name} ha caído un ${dropPercent.toFixed(0)}% respecto al pico histórico (${peak}kg → ${current}kg). Monitorea si continúa la tendencia.`,
            week: currentWeek,
          });
        }
      }
    }
  }

  // 8. Lean mass loss
  if (sorted.length >= 2) {
    const withBF = sorted.filter(b => b.grasaCorporal != null && b.grasaCorporal! > 0);

    if (withBF.length >= 2) {
      for (let i = 1; i < withBF.length; i++) {
        const prevLeanMass = withBF[i - 1].peso * (1 - withBF[i - 1].grasaCorporal! / 100);
        const currLeanMass = withBF[i].peso * (1 - withBF[i].grasaCorporal! / 100);
        const leanMassDrop = prevLeanMass - currLeanMass;

        if (leanMassDrop > 1.5) {
          alerts.push({
            id: 'lean-mass-loss',
            severity: 'error',
            title: 'Posible pérdida de masa magra',
            message: `Tu masa magra bajó ${leanMassDrop.toFixed(1)}kg entre la semana ${withBF[i - 1].week} y ${withBF[i].week} (${prevLeanMass.toFixed(1)}kg → ${currLeanMass.toFixed(1)}kg). Considera aumentar proteína o reducir el déficit.`,
            week: withBF[i].week,
          });
          break;
        }
      }
    } else {
      const withWaist = sorted.filter(b => b.cintura != null && b.cintura! > 0);

      if (withWaist.length >= 2) {
        for (let i = 1; i < withWaist.length; i++) {
          const waistDiff = Math.abs(withWaist[i].cintura! - withWaist[i - 1].cintura!);
          const weightDrop = withWaist[i - 1].peso - withWaist[i].peso;

          if (waistDiff <= 0.5 && weightDrop > 2) {
            alerts.push({
              id: 'lean-mass-proxy',
              severity: 'warning',
              title: 'Posible pérdida de masa magra (proxy)',
              message: `Tu cintura no redujo (±${waistDiff.toFixed(1)}cm) pero perdiste ${weightDrop.toFixed(1)}kg entre la semana ${withWaist[i - 1].week} y ${withWaist[i].week}. Cuando se pierde grasa, la cintura debería acompañar. Esta discrepancia puede indicar pérdida muscular.`,
              week: withWaist[i].week,
            });
            break;
          }
        }
      }
    }
  }

  return alerts;
}

// ========================================
// 4. ADHERENCE METRICS
// ========================================

interface AdherenceParams {
  workoutProgress: DefinicionWorkoutProgress[];
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  cardioLogs: DefinicionCardioLog[];
  bodyComposition: DefinicionBodyComposition[];
  currentWeek: number;
}

export function getAdherenceMetrics(params: AdherenceParams): AdherenceMetrics {
  const { workoutProgress, workoutData, cardioLogs, bodyComposition, currentWeek } = params;

  // --- Training ---
  let weekTotalExercises = 0;
  let weekCompletedExercises = 0;
  let overallTotalExercises = 0;
  let overallCompletedExercises = 0;

  // Current week
  const currentWeekWorkouts = workoutData[currentWeek];
  if (currentWeekWorkouts) {
    for (const day of DAYS_OF_WEEK) {
      const dayWorkout = currentWeekWorkouts[day];
      if (dayWorkout) {
        weekTotalExercises += dayWorkout.exercises.length;
        const completed = workoutProgress.filter(
          p => p.week === currentWeek && p.day === day
        ).length;
        weekCompletedExercises += Math.min(completed, dayWorkout.exercises.length);
      }
    }
  }

  // Overall (all weeks up to currentWeek)
  for (let w = 1; w <= Math.max(currentWeek, 1); w++) {
    const weekWorkouts = workoutData[w];
    if (weekWorkouts) {
      for (const day of DAYS_OF_WEEK) {
        const dayWorkout = weekWorkouts[day];
        if (dayWorkout) {
          overallTotalExercises += dayWorkout.exercises.length;
          const completed = workoutProgress.filter(
            p => p.week === w && p.day === day
          ).length;
          overallCompletedExercises += Math.min(completed, dayWorkout.exercises.length);
        }
      }
    }
  }

  // Streak: consecutive weeks (backwards from currentWeek) with >= 80%
  let streak = 0;
  for (let w = currentWeek; w >= 1; w--) {
    const wWorkouts = workoutData[w];
    if (!wWorkouts) break;

    let wTotal = 0;
    let wCompleted = 0;
    for (const day of DAYS_OF_WEEK) {
      const dayWorkout = wWorkouts[day];
      if (dayWorkout) {
        wTotal += dayWorkout.exercises.length;
        const completed = workoutProgress.filter(
          p => p.week === w && p.day === day
        ).length;
        wCompleted += Math.min(completed, dayWorkout.exercises.length);
      }
    }
    if (wTotal > 0 && (wCompleted / wTotal) * 100 >= 80) {
      streak++;
    } else {
      break;
    }
  }

  const weekTrainingPercent = weekTotalExercises > 0
    ? Math.round((weekCompletedExercises / weekTotalExercises) * 100)
    : 0;
  const overallTrainingPercent = overallTotalExercises > 0
    ? Math.round((overallCompletedExercises / overallTotalExercises) * 100)
    : 0;

  // --- Cardio ---
  let weekPlannedCardio = 0;
  let weekCompletedCardio = 0;
  let overallPlannedCardio = 0;
  let overallCompletedCardio = 0;
  let totalMinutes = 0;

  for (const day of DAYS_OF_WEEK) {
    const config = DefinicionExerciseParser.getCardioConfig(day);
    if (config && config.tipo !== null) {
      weekPlannedCardio++;
      const hasLog = cardioLogs.some(
        l => l.week === currentWeek && l.day === day && l.completado
      );
      if (hasLog) weekCompletedCardio++;
    }
  }

  for (let w = 1; w <= Math.max(currentWeek, 1); w++) {
    for (const day of DAYS_OF_WEEK) {
      const config = DefinicionExerciseParser.getCardioConfig(day);
      if (config && config.tipo !== null) {
        overallPlannedCardio++;
        const hasLog = cardioLogs.some(
          l => l.week === w && l.day === day && l.completado
        );
        if (hasLog) overallCompletedCardio++;
      }
    }
  }

  for (const log of cardioLogs) {
    if (log.completado) {
      totalMinutes += log.duracionMinutos;
    }
  }

  const weekCardioPercent = weekPlannedCardio > 0
    ? Math.round((weekCompletedCardio / weekPlannedCardio) * 100)
    : 0;
  const overallCardioPercent = overallPlannedCardio > 0
    ? Math.round((overallCompletedCardio / overallPlannedCardio) * 100)
    : 0;

  // --- Body Tracking ---
  const weeksTracked = new Set(bodyComposition.map(b => b.week)).size;
  const weeksElapsed = Math.max(currentWeek, 1);
  const consistency = weeksElapsed > 0
    ? Math.round((weeksTracked / weeksElapsed) * 100)
    : 0;

  // --- RPE ---
  const progressWithRpe = workoutProgress.filter(p => p.rpeActual != null);
  let totalDelta = 0;
  let rpeCount = 0;

  for (const progress of progressWithRpe) {
    const mesocycleInfo = getMesocycleInfo(progress.week);
    // Find the exercise to get rpeProgresion and rpeDeload
    const weekWorkouts = workoutData[progress.week];
    if (weekWorkouts) {
      const dayWorkout = weekWorkouts[progress.day];
      if (dayWorkout) {
        const exercise = dayWorkout.exercises.find(e => e.id === progress.exerciseId);
        if (exercise) {
          const expectedRpe = getCurrentRPE(exercise.rpeProgresion, exercise.rpeDeload, mesocycleInfo);
          totalDelta += Math.abs((progress.rpeActual as number) - expectedRpe);
          rpeCount++;
        }
      }
    }
  }

  const averageDelta = rpeCount > 0 ? Math.round((totalDelta / rpeCount) * 100) / 100 : 0;
  const adherencePercent = Math.max(0, Math.round(100 - averageDelta * 10));

  return {
    training: { weekPercent: weekTrainingPercent, overallPercent: overallTrainingPercent, streak },
    cardio: { weekPercent: weekCardioPercent, overallPercent: overallCardioPercent, totalMinutes },
    bodyTracking: { weeksTracked, weeksElapsed, consistency },
    rpe: { averageDelta, adherencePercent },
  };
}

// ========================================
// 5. PHASE COMPARISON
// ========================================

interface PhaseComparisonParams {
  bodyComposition: DefinicionBodyComposition[];
  workoutProgress: DefinicionWorkoutProgress[];
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  cardioLogs: DefinicionCardioLog[];
}

export function getPhaseComparison(params: PhaseComparisonParams): PhaseComparison[] {
  const { bodyComposition, workoutProgress, workoutData, cardioLogs } = params;

  return DEFINICION_SUB_PHASES.map(subPhase => {
    const phaseWeeks: number[] = [];
    for (let w = subPhase.semanaInicio; w <= subPhase.semanaFin; w++) {
      phaseWeeks.push(w);
    }
    const numWeeks = phaseWeeks.length;

    // Weight data for this phase
    const phaseBodyData = bodyComposition
      .filter(b => b.week >= subPhase.semanaInicio && b.week <= subPhase.semanaFin)
      .sort((a, b) => a.week - b.week);

    const startWeight = phaseBodyData.length > 0 ? phaseBodyData[0].peso : null;
    const endWeight = phaseBodyData.length > 0 ? phaseBodyData[phaseBodyData.length - 1].peso : null;
    const weightChange = startWeight !== null && endWeight !== null ? Math.round((endWeight - startWeight) * 100) / 100 : null;
    const weeklyRate = weightChange !== null && numWeeks > 0 ? Math.round((weightChange / numWeeks) * 100) / 100 : null;

    // Training adherence for this phase
    let totalExercises = 0;
    let completedExercises = 0;
    for (const w of phaseWeeks) {
      const weekWorkouts = workoutData[w];
      if (weekWorkouts) {
        for (const day of DAYS_OF_WEEK) {
          const dayWorkout = weekWorkouts[day];
          if (dayWorkout) {
            totalExercises += dayWorkout.exercises.length;
            const completed = workoutProgress.filter(
              p => p.week === w && p.day === day
            ).length;
            completedExercises += Math.min(completed, dayWorkout.exercises.length);
          }
        }
      }
    }
    const trainingAdherence = totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

    // Cardio adherence for this phase
    let plannedCardio = 0;
    let completedCardio = 0;
    for (const w of phaseWeeks) {
      for (const day of DAYS_OF_WEEK) {
        const config = DefinicionExerciseParser.getCardioConfig(day);
        if (config && config.tipo !== null) {
          plannedCardio++;
          const hasLog = cardioLogs.some(
            l => l.week === w && l.day === day && l.completado
          );
          if (hasLog) completedCardio++;
        }
      }
    }
    const cardioAdherence = plannedCardio > 0
      ? Math.round((completedCardio / plannedCardio) * 100)
      : 0;

    return {
      phaseId: subPhase.id,
      phaseName: subPhase.nombre,
      startWeight,
      endWeight,
      weightChange,
      weeklyRate,
      trainingAdherence,
      cardioAdherence,
    };
  });
}

// ========================================
// BUILD WEEKLY CHECKIN DATA
// ========================================

interface BuildCheckinParams {
  bodyComposition: DefinicionBodyComposition[];
  workoutProgress: DefinicionWorkoutProgress[];
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  cardioLogs: DefinicionCardioLog[];
  currentWeek: number;
}

export function buildWeeklyCheckinData(params: BuildCheckinParams): WeeklyCheckinData {
  const { bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek } = params;

  const expectedWeight = getExpectedWeight(currentWeek);
  const currentWeekBody = bodyComposition.find(b => b.week === currentWeek);
  const actualWeight = currentWeekBody ? currentWeekBody.peso : null;
  const weightDiff = actualWeight !== null ? Math.round((actualWeight - expectedWeight) * 100) / 100 : null;

  const projection = getWeightProjection(bodyComposition);
  const adherence = getAdherenceMetrics({ workoutProgress, workoutData, cardioLogs, bodyComposition, currentWeek });
  const alerts = getProgressAlerts({ bodyComposition, workoutProgress, workoutData, cardioLogs, currentWeek });
  const phaseComparisons = getPhaseComparison({ bodyComposition, workoutProgress, workoutData, cardioLogs });

  return {
    currentWeek,
    expectedWeight,
    actualWeight,
    weightDiff,
    projection,
    adherence,
    alerts,
    phaseComparisons,
  };
}
