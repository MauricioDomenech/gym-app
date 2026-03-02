import type { BaseExercise, BaseWorkoutDay, BaseNutritionTotals, BaseAppState } from '../../../shared/types/base';
export type { DayOfWeek } from '../../../shared/types/base';

// ========================================
// SUB-PHASE CONFIGURATION
// ========================================

export type DefinicionSubPhase = 'deficit_1' | 'diet_break_1' | 'deficit_2' | 'diet_break_2' | 'deficit_3';

export interface DefinicionSubPhaseConfig {
  id: DefinicionSubPhase;
  nombre: string;
  nombreCorto: string;
  semanaInicio: number;
  semanaFin: number;
  kcalDiarias: number;
  deficit: number;
  esDietBreak: boolean;
  color: string;
  darkColor: string;
}

export const DEFINICION_SUB_PHASES: DefinicionSubPhaseConfig[] = [
  { id: 'deficit_1', nombre: 'Fase 1 — Deficit', nombreCorto: 'Fase 1', semanaInicio: 1, semanaFin: 7, kcalDiarias: 2150, deficit: 550, esDietBreak: false, color: 'emerald-600', darkColor: 'emerald-400' },
  { id: 'diet_break_1', nombre: 'Diet Break 1', nombreCorto: 'DB 1', semanaInicio: 8, semanaFin: 8, kcalDiarias: 2700, deficit: 0, esDietBreak: true, color: 'amber-500', darkColor: 'amber-400' },
  { id: 'deficit_2', nombre: 'Fase 2 — Deficit', nombreCorto: 'Fase 2', semanaInicio: 9, semanaFin: 15, kcalDiarias: 2250, deficit: 450, esDietBreak: false, color: 'emerald-600', darkColor: 'emerald-400' },
  { id: 'diet_break_2', nombre: 'Diet Break 2', nombreCorto: 'DB 2', semanaInicio: 16, semanaFin: 16, kcalDiarias: 2700, deficit: 0, esDietBreak: true, color: 'amber-500', darkColor: 'amber-400' },
  { id: 'deficit_3', nombre: 'Fase 3 — Deficit', nombreCorto: 'Fase 3', semanaInicio: 17, semanaFin: 22, kcalDiarias: 2300, deficit: 400, esDietBreak: false, color: 'emerald-600', darkColor: 'emerald-400' },
];

export const TOTAL_WEEKS = 22;

// ========================================
// MESOCYCLE UTILITIES
// ========================================

export interface MesocycleInfo {
  mesocycleNumber: number;
  weekInMesocycle: number; // 1-5
  isDeload: boolean;
  isDietBreak: boolean;
}

export function getSubPhaseForWeek(week: number): DefinicionSubPhaseConfig {
  const phase = DEFINICION_SUB_PHASES.find(p => week >= p.semanaInicio && week <= p.semanaFin);
  return phase || DEFINICION_SUB_PHASES[0];
}

export function getMesocycleInfo(week: number): MesocycleInfo {
  const subPhase = getSubPhaseForWeek(week);

  if (subPhase.esDietBreak) {
    return {
      mesocycleNumber: subPhase.id === 'diet_break_1' ? 2 : 4,
      weekInMesocycle: 1,
      isDeload: false,
      isDietBreak: true,
    };
  }

  // Training weeks follow 5-week mesocycles: 4 progressive + 1 deload
  // Deficit 1 (sem 1-7): meso 1 = sem 1-5 (deload sem 5), rest sem 6-7 start meso 2
  // Deficit 2 (sem 9-15): meso 3 = sem 9-13 (deload sem 13), rest sem 14-15
  // Deficit 3 (sem 17-22): meso 5 = sem 17-21 (deload sem 21), sem 22

  const weekInPhase = week - subPhase.semanaInicio + 1;
  const mesocycleWeek = ((weekInPhase - 1) % 5) + 1;
  const mesocycleNumber = Math.floor((weekInPhase - 1) / 5);

  let baseMeso = 1;
  if (subPhase.id === 'deficit_2') baseMeso = 3;
  if (subPhase.id === 'deficit_3') baseMeso = 5;

  return {
    mesocycleNumber: baseMeso + mesocycleNumber,
    weekInMesocycle: mesocycleWeek,
    isDeload: mesocycleWeek === 5,
    isDietBreak: false,
  };
}

export function getCurrentRPE(rpeProgresion: number[], rpeDeload: number, mesocycleInfo: MesocycleInfo): number {
  if (mesocycleInfo.isDietBreak || mesocycleInfo.isDeload) {
    return rpeDeload;
  }
  const weekIdx = Math.min(mesocycleInfo.weekInMesocycle - 1, rpeProgresion.length - 1);
  return rpeProgresion[weekIdx] || rpeProgresion[rpeProgresion.length - 1] || 8;
}

export function getCSVFolderForWeek(week: number): string {
  const subPhase = getSubPhaseForWeek(week);
  switch (subPhase.id) {
    case 'deficit_1': return 'deficit_fase1';
    case 'diet_break_1': return 'diet_break';
    case 'deficit_2': return 'deficit_fase2';
    case 'diet_break_2': return 'diet_break';
    case 'deficit_3': return 'deficit_fase3';
    default: return 'deficit_fase1';
  }
}

export function getWeeksForSubPhase(subPhaseId: DefinicionSubPhase): number[] {
  const phase = DEFINICION_SUB_PHASES.find(p => p.id === subPhaseId);
  if (!phase) return [];
  const weeks: number[] = [];
  for (let w = phase.semanaInicio; w <= phase.semanaFin; w++) {
    weeks.push(w);
  }
  return weeks;
}

// ========================================
// NUTRITION TYPES
// ========================================

export interface DefinicionNutritionItem {
  comida: string;
  hora: string;
  alimento: string;
  cantidad: string;
  unidad: string;
  kcal: string;
  proteinas_g: string;
  carbohidratos_g: string;
  grasas_g: string;
  fibra_g: string;
  notas: string;
}

export interface DefinicionDayNutrition {
  day: string;
  meals: DefinicionNutritionItem[];
  totals: DefinicionNutritionTotals;
}

export interface DefinicionNutritionTotals extends BaseNutritionTotals {
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
  fibra_g: number;
  kcal: number;
}

// ========================================
// EXERCISE TYPES
// ========================================

export interface DefinicionAlternative {
  nombre: string;
  imagen: string;
}

export interface DefinicionExercise extends BaseExercise {
  series: string;
  repeticiones: string;
  descanso: string;
  imagen: string;
  alternativas: DefinicionAlternative[];
  rpeProgresion: number[];
  rpeDeload: number;
}

export interface DefinicionWorkoutDay extends BaseWorkoutDay {
  orden: number;
  dia: string;
  tipo: string;
  musculos: string;
  exercises: DefinicionExercise[];
}

// ========================================
// CARDIO TYPES
// ========================================

export interface DefinicionCardioConfig {
  tipo: 'liss' | 'hiit' | null;
  duracion: string;
  detalle: string;
  opcional?: boolean;
}

export interface DefinicionCardioLog {
  day: string;
  week: number;
  tipo: 'liss' | 'hiit' | 'caminata';
  duracionMinutos: number;
  completado: boolean;
  notas: string;
  date: string;
}

// ========================================
// BODY COMPOSITION TYPES
// ========================================

export interface DefinicionBodyComposition {
  week: number;
  date: string;
  peso: number;
  grasaCorporal?: number;
  cintura?: number;
  cadera?: number;
  pecho?: number;
  brazo?: number;
  muslo?: number;
  notas: string;
}

// ========================================
// WORKOUT PROGRESS TYPES
// ========================================

export interface DefinicionWorkoutProgress {
  exerciseId: string;
  day: string;
  week: number;
  weights: number[];
  seriesCount: number;
  date: string;
  isAlternative: boolean;
  alternativeIndex?: number | null;
  observations?: string;
  rpeActual?: number | null;
}

// ========================================
// SHOPPING LIST TYPES
// ========================================

export interface DefinicionShoppingItem {
  alimento: string;
  cantidad: number;
  unidad: string;
  purchased: boolean;
}

export interface DefinicionShoppingList {
  selectedWeeks: number[];
  selectedDays: string[];
  items: DefinicionShoppingItem[];
  generatedDate: string;
}

// ========================================
// APP STATE & UI TYPES
// ========================================

export interface DefinicionAppState extends BaseAppState {
  workoutProgress: DefinicionWorkoutProgress[];
  shoppingLists: DefinicionShoppingList[];
  bodyComposition: DefinicionBodyComposition[];
  cardioLogs: DefinicionCardioLog[];
}

export interface DefinicionTableColumn {
  key: keyof DefinicionNutritionItem;
  label: string;
  visible: boolean;
}

export interface DefinicionWeeklySummary {
  week: number;
  totalsByDay: { [day: string]: DefinicionNutritionTotals };
  weeklyTotals: DefinicionNutritionTotals;
  averageDaily: DefinicionNutritionTotals;
}

export interface DefinicionPlan {
  plan: Array<{
    orden: number;
    dia: string;
    tipo: string;
    musculos: string;
    ejercicios: Array<{
      nombre: string;
      series: string;
      repeticiones: string;
      descanso: string;
      imagen: string;
      rpe_progresion: number[];
      rpe_deload: number;
      alternativas: Array<{ nombre: string; imagen: string }>;
    }>;
  }>;
  cardio: { [day: string]: DefinicionCardioConfig | null };
}

// ========================================
// COMPONENT PROP TYPES
// ========================================

export interface ExerciseImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  imagePath: string;
}

export interface AlternativesListProps {
  exercise: DefinicionExercise;
  onShowImage: (imagePath: string, exerciseName: string) => void;
}

export interface DefinicionIndividualTrackerProps {
  exercise: DefinicionExercise;
  onProgressSaved?: () => void;
}

export interface DefinicionCopyWeekDataProps {
  currentWeek: number;
}

export interface SeriesParseResult {
  minSeries: number;
  maxSeries: number;
  defaultSeries: number;
}

export function parseSeriesString(seriesStr: string): SeriesParseResult {
  if (seriesStr.includes('-')) {
    const [min, max] = seriesStr.split('-').map(s => parseInt(s.trim()));
    return {
      minSeries: min || 2,
      maxSeries: max || min || 3,
      defaultSeries: min || 2,
    };
  }

  const singleNumber = parseInt(seriesStr);
  if (!isNaN(singleNumber)) {
    return {
      minSeries: singleNumber,
      maxSeries: singleNumber,
      defaultSeries: singleNumber,
    };
  }

  return { minSeries: 3, maxSeries: 3, defaultSeries: 3 };
}

// ========================================
// PROGRESS ANALYTICS TYPES
// ========================================

export interface ProgressAlert {
  id: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  week?: number;
}

export interface WeightProjection {
  projectedFinishWeight: number;
  weeklyLossRate: number;
  weeksToGoal: number | null;
  onTrack: boolean;
  dataPoints: number;
}

export interface AdherenceMetrics {
  training: { weekPercent: number; overallPercent: number; streak: number };
  cardio: { weekPercent: number; overallPercent: number; totalMinutes: number };
  bodyTracking: { weeksTracked: number; weeksElapsed: number; consistency: number };
  rpe: { averageDelta: number; adherencePercent: number };
}

export interface PhaseComparison {
  phaseId: string;
  phaseName: string;
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number | null;
  weeklyRate: number | null;
  trainingAdherence: number;
  cardioAdherence: number;
}

export interface WeeklyCheckinData {
  currentWeek: number;
  expectedWeight: number;
  actualWeight: number | null;
  weightDiff: number | null;
  projection: WeightProjection;
  adherence: AdherenceMetrics;
  alerts: ProgressAlert[];
  phaseComparisons: PhaseComparison[];
}

export const DEFAULT_TABLE_COLUMNS: DefinicionTableColumn[] = [
  { key: 'comida', label: 'Comida', visible: true },
  { key: 'hora', label: 'Hora', visible: true },
  { key: 'alimento', label: 'Alimento', visible: true },
  { key: 'cantidad', label: 'Cantidad', visible: true },
  { key: 'unidad', label: 'Unidad', visible: true },
  { key: 'kcal', label: 'Kcal', visible: true },
  { key: 'proteinas_g', label: 'Proteinas', visible: true },
  { key: 'carbohidratos_g', label: 'Carbs', visible: true },
  { key: 'grasas_g', label: 'Grasas', visible: true },
  { key: 'fibra_g', label: 'Fibra', visible: false },
  { key: 'notas', label: 'Notas', visible: true },
];
