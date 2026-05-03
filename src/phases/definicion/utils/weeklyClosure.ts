import { RECOMP_PLAN } from '../types/definicion';
import type {
  DefinicionBodyComposition,
  DefinicionCardioConfig,
  DefinicionCardioLog,
  DefinicionDailyWeight,
  DefinicionWorkoutDay,
  DefinicionWorkoutProgress,
  RIRValue,
} from '../types/definicion';
import { parseWorkoutNotes } from './workoutNotes';

export const DAYS_OF_WEEK = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export type ReadinessStatus = 'ready' | 'partial' | 'missing';

export interface WeeklyClosureChecklistItem {
  label: string;
  value: string;
  ok: boolean;
  required: boolean;
}

export interface WeeklyClosureSummary {
  week: number;
  readiness: ReadinessStatus;
  statusLabel: string;
  statusDetail: string;
  requiredCompleted: number;
  requiredTotal: number;
  metrics: {
    weeklyChangeKg: number | null;
    targetWeeklyLossRangeKg: string;
    dailyWeightAverageKg: number | null;
    dailyWeightEntries: number;
    workoutCompleted: number;
    workoutPlanned: number;
    workoutPercent: number;
    cardioCompleted: number;
    cardioPlanned: number;
    cardioPercent: number;
    rirLogs: number;
    averageRir: number | null;
    zeroRirLogs: number;
    feedbackLogs: number;
    coachTargets: number;
    nutritionAdherencePercent: number | null;
    relaxMeals: number | null;
    sleepAverage: number | null;
    hunger: number | null;
    energy: number | null;
    discomforts: string | null;
  };
  planningSignals: {
    dataQuality: ReadinessStatus;
    decisionFocus: string[];
    recommendations: string[];
  };
  checklist: WeeklyClosureChecklistItem[];
  nextStep: string;
}

interface BuildWeeklyClosureParams {
  week: number;
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  workoutProgress: DefinicionWorkoutProgress[];
  bodyComposition: DefinicionBodyComposition[];
  cardioLogs: DefinicionCardioLog[];
  dailyWeights: DefinicionDailyWeight[];
  getCardioConfig: (day: string) => DefinicionCardioConfig | null;
}

export function buildWeeklyClosureSummary(params: BuildWeeklyClosureParams): WeeklyClosureSummary {
  const {
    week,
    workoutData,
    workoutProgress,
    bodyComposition,
    cardioLogs,
    dailyWeights,
    getCardioConfig,
  } = params;

  const weekWorkoutProgress = workoutProgress.filter(p => p.week === week);
  const weekBody = bodyComposition.find(b => b.week === week);
  const previousBody = [...bodyComposition]
    .filter(b => b.week < week)
    .sort((a, b) => b.week - a.week)[0];
  const weekDailyWeights = dailyWeights.filter(w => w.week === week);
  const weekCardioLogs = cardioLogs.filter(c => c.week === week);

  const plannedWorkoutExercises = DAYS_OF_WEEK.reduce((sum, day) => {
    return sum + (workoutData[week]?.[day]?.exercises.length || 0);
  }, 0);
  const completedWorkoutExercises = weekWorkoutProgress.filter(p => p.weights.some(weight => weight > 0)).length;
  const workoutPercent = plannedWorkoutExercises > 0
    ? Math.round((completedWorkoutExercises / plannedWorkoutExercises) * 100)
    : 0;

  const rirLogs = weekWorkoutProgress.filter(p => p.rir !== null && p.rir !== undefined).length;
  const rirValues = weekWorkoutProgress
    .map(p => p.rir)
    .filter((rir): rir is RIRValue => typeof rir === 'number');
  const averageRir = rirValues.length > 0
    ? Math.round((rirValues.reduce<number>((sum, rir) => sum + rir, 0) / rirValues.length) * 100) / 100
    : null;
  const zeroRirLogs = rirValues.filter(rir => rir === 0).length;
  const feedbackLogs = weekWorkoutProgress.filter(p => parseWorkoutNotes(p.observations).userFeedback).length;
  const coachTargets = weekWorkoutProgress.filter(p => parseWorkoutNotes(p.observations).coachPlan).length;

  const plannedCardioDays = DAYS_OF_WEEK.filter(day => {
    const config = getCardioConfig(day);
    return config && !config.opcional;
  });
  const completedCardio = weekCardioLogs.filter(c => c.completado).length;
  const cardioPercent = plannedCardioDays.length > 0
    ? Math.round((completedCardio / plannedCardioDays.length) * 100)
    : 0;

  const dailyWeightAverage = weekDailyWeights.length > 0
    ? weekDailyWeights.reduce((sum, entry) => sum + entry.peso, 0) / weekDailyWeights.length
    : null;
  const weeklyChange = weekBody && previousBody
    ? Math.round((weekBody.peso - previousBody.peso) * 100) / 100
    : null;

  const checklist: WeeklyClosureChecklistItem[] = [
    {
      label: 'Peso semanal / BIA',
      value: weekBody ? `${weekBody.peso} kg registrado` : 'Sin registro semanal',
      ok: Boolean(weekBody),
      required: true,
    },
    {
      label: 'Pesos diarios',
      value: dailyWeightAverage !== null
        ? `${weekDailyWeights.length} registros, promedio ${dailyWeightAverage.toFixed(1)} kg`
        : 'Sin pesos diarios',
      ok: weekDailyWeights.length >= 3,
      required: true,
    },
    {
      label: 'Cardio obligatorio',
      value: `${completedCardio}/${plannedCardioDays.length} sesiones completadas`,
      ok: completedCardio >= plannedCardioDays.length,
      required: true,
    },
    {
      label: 'Entrenamiento',
      value: `${completedWorkoutExercises}/${plannedWorkoutExercises} ejercicios con peso (${workoutPercent}%)`,
      ok: workoutPercent >= 70,
      required: true,
    },
    {
      label: 'RIR',
      value: `${rirLogs} ejercicios con RIR`,
      ok: rirLogs >= Math.ceil(Math.max(completedWorkoutExercises, 1) * 0.5),
      required: false,
    },
    {
      label: 'Feedback de ejercicios',
      value: `${feedbackLogs} comentarios guardados`,
      ok: feedbackLogs > 0,
      required: false,
    },
    {
      label: 'Adherencia nutricional',
      value: weekBody?.adherenciaNutricion != null
        ? `${weekBody.adherenciaNutricion}% adherencia, ${weekBody.comidasRelax ?? 0} comidas relax`
        : 'Sin adherencia registrada',
      ok: weekBody?.adherenciaNutricion != null,
      required: true,
    },
  ];

  const requiredItems = checklist.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item => item.ok).length;
  const readiness: ReadinessStatus = requiredCompleted === requiredItems.length
    ? 'ready'
    : requiredCompleted >= Math.ceil(requiredItems.length / 2)
      ? 'partial'
      : 'missing';

  const status = getWeeklyClosureStatus(readiness);
  const planningSignals = buildPlanningSignals({
    readiness,
    weeklyChange,
    workoutPercent,
    cardioPercent,
    feedbackLogs,
    rirLogs,
    averageRir,
    zeroRirLogs,
    nutritionAdherence: weekBody?.adherenciaNutricion ?? null,
    relaxMeals: weekBody?.comidasRelax ?? null,
    dailyWeightEntries: weekDailyWeights.length,
  });

  return {
    week,
    readiness,
    statusLabel: status.label,
    statusDetail: status.detail,
    requiredCompleted,
    requiredTotal: requiredItems.length,
    metrics: {
      weeklyChangeKg: weeklyChange,
      targetWeeklyLossRangeKg: `${RECOMP_PLAN.targetWeeklyLossMin}-${RECOMP_PLAN.targetWeeklyLossMax}`,
      dailyWeightAverageKg: dailyWeightAverage !== null ? Math.round(dailyWeightAverage * 100) / 100 : null,
      dailyWeightEntries: weekDailyWeights.length,
      workoutCompleted: completedWorkoutExercises,
      workoutPlanned: plannedWorkoutExercises,
      workoutPercent,
      cardioCompleted: completedCardio,
      cardioPlanned: plannedCardioDays.length,
      cardioPercent,
      rirLogs,
      averageRir,
      zeroRirLogs,
      feedbackLogs,
      coachTargets,
      nutritionAdherencePercent: weekBody?.adherenciaNutricion ?? null,
      relaxMeals: weekBody?.comidasRelax ?? null,
      sleepAverage: weekBody?.suenoPromedio ?? null,
      hunger: weekBody?.hambre ?? null,
      energy: weekBody?.energia ?? null,
      discomforts: weekBody?.molestias?.trim() || null,
    },
    planningSignals,
    checklist,
    nextStep: readiness === 'ready'
      ? `Exporta la semana ${week}, revisamos conversando y recien despues genero el JSON de la semana ${week + 1}.`
      : `Completa los faltantes de la semana ${week} y vuelve al cierre antes de exportar.`,
  };
}

interface PlanningSignalParams {
  readiness: ReadinessStatus;
  weeklyChange: number | null;
  workoutPercent: number;
  cardioPercent: number;
  feedbackLogs: number;
  rirLogs: number;
  averageRir: number | null;
  zeroRirLogs: number;
  nutritionAdherence: number | null;
  relaxMeals: number | null;
  dailyWeightEntries: number;
}

function buildPlanningSignals(params: PlanningSignalParams): WeeklyClosureSummary['planningSignals'] {
  const decisionFocus: string[] = [];
  const recommendations: string[] = [];
  const adherenceIsUsable = params.nutritionAdherence !== null && params.nutritionAdherence >= 80;

  if (params.dailyWeightEntries < 3) {
    decisionFocus.push('Peso: faltan pesos diarios para interpretar tendencia.');
  }

  if (params.nutritionAdherence === null) {
    decisionFocus.push('Nutricion: falta adherencia semanal y comidas relax.');
    recommendations.push('No ajustar calorias solo por peso si no hay adherencia nutricional registrada.');
  } else if (params.nutritionAdherence < 80) {
    decisionFocus.push(`Nutricion: adherencia baja (${params.nutritionAdherence}%).`);
    recommendations.push('Antes de bajar calorias, priorizar mejorar ejecucion del plan durante una semana.');
  }

  if (params.relaxMeals !== null && params.relaxMeals >= 4) {
    decisionFocus.push(`Nutricion: ${params.relaxMeals} comidas relax pueden distorsionar el peso semanal.`);
  }

  if (params.cardioPercent < 100) {
    decisionFocus.push(`Cardio: completado ${params.cardioPercent}% del cardio obligatorio.`);
    recommendations.push('No compensar con recorte agresivo de calorias; primero completar el cardio planificado.');
  }

  if (params.workoutPercent < 70) {
    decisionFocus.push(`Entrenamiento: solo ${params.workoutPercent}% de ejercicios con peso.`);
  }

  if (params.feedbackLogs === 0) {
    decisionFocus.push('Entrenamiento: falta feedback cualitativo de ejercicios.');
    recommendations.push('Registrar al menos feedback corto en ejercicios pesados o con molestias para ajustar cargas.');
  }

  if (params.averageRir !== null && params.averageRir < 1) {
    decisionFocus.push(`Fatiga: RIR promedio bajo (${params.averageRir}).`);
    recommendations.push('Vigilar fatiga antes de subir cargas o volumen.');
  }

  if (params.zeroRirLogs >= 5) {
    decisionFocus.push(`Intensidad: ${params.zeroRirLogs} registros a RIR 0.`);
  }

  if (params.weeklyChange !== null) {
    const weeklyLoss = -params.weeklyChange;
    if (weeklyLoss > RECOMP_PLAN.rapidWeeklyLossKg) {
      decisionFocus.push(`Peso: bajada rapida (${weeklyLoss.toFixed(2)} kg).`);
      recommendations.push('Si fuerza o energia bajan, considerar subir calorias o reducir agresividad.');
    } else if (adherenceIsUsable && weeklyLoss < RECOMP_PLAN.targetWeeklyLossMin) {
      decisionFocus.push(`Peso: bajada menor al objetivo (${weeklyLoss.toFixed(2)} kg).`);
      recommendations.push('Si adherencia y cardio fueron altos, evaluar ajuste pequeno tras conversar.');
    } else if (adherenceIsUsable && weeklyLoss <= RECOMP_PLAN.targetWeeklyLossMax) {
      decisionFocus.push(`Peso: ritmo dentro del objetivo (${weeklyLoss.toFixed(2)} kg).`);
      recommendations.push('Mantener calorias y progresion si fuerza, energia y hambre estan controladas.');
    }
  }

  if (decisionFocus.length === 0) {
    decisionFocus.push('Datos completos sin alertas relevantes.');
  }

  if (recommendations.length === 0) {
    recommendations.push(params.readiness === 'ready'
      ? 'Semana lista para revisar y decidir el siguiente JSON.'
      : 'Completar datos faltantes antes de tomar decisiones finas.');
  }

  return {
    dataQuality: params.readiness,
    decisionFocus,
    recommendations,
  };
}

export function getWeeklyClosureStatus(readiness: ReadinessStatus): { label: string; detail: string; classes: string } {
  const statusConfig = {
    ready: {
      label: 'Lista para revisar',
      detail: 'Hay datos suficientes para charlar la semana antes de generar el siguiente JSON.',
      classes: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    },
    partial: {
      label: 'Revisable con faltantes',
      detail: 'Podemos analizar la semana, pero conviene completar los datos marcados antes del export.',
      classes: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    },
    missing: {
      label: 'Faltan datos clave',
      detail: 'Todavia no hay suficiente informacion para decidir ajustes con confianza.',
      classes: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    },
  } as const;

  return statusConfig[readiness];
}
