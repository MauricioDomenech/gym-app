import type { BaseExercise, BaseWorkoutDay, BaseNutritionTotals, BaseAppState } from '../../../shared/types/base';
export type { DayOfWeek } from '../../../shared/types/base';

// ========================================
// SUB-PHASE CONFIGURATION
// ========================================

export type DefinicionSubPhase = 'recomp_lenta_2026';

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

export const TOTAL_WEEKS = 42;

export const RECOMP_PLAN = {
  name: 'Plan Recomp Lenta 2026',
  targetLabel: 'Bajar grasa lentamente hasta fin de 2026',
  endLabel: 'Diciembre 2026',
  totalWeeks: TOTAL_WEEKS,
  kcalRange: '1930-2028 kcal/dia',
  kcalAverage: 1965,
  proteinRange: '190-210 g/dia',
  targetWeeklyLossMin: 0.25,
  targetWeeklyLossMax: 0.45,
  acceptableWeeklyLossMax: 0.6,
  rapidWeeklyLossKg: 0.8,
  noChangeWeeksForAdjustment: 3,
} as const;

export const DEFINICION_SUB_PHASES: DefinicionSubPhaseConfig[] = [
  {
    id: 'recomp_lenta_2026',
    nombre: RECOMP_PLAN.name,
    nombreCorto: 'Recomp',
    semanaInicio: 1,
    semanaFin: TOTAL_WEEKS,
    kcalDiarias: RECOMP_PLAN.kcalAverage,
    deficit: 0,
    esDietBreak: false,
    color: 'emerald-600',
    darkColor: 'emerald-400',
  },
];

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
  const clampedWeek = Math.max(1, Math.min(week, TOTAL_WEEKS));
  const mesocycleWeek = ((clampedWeek - 1) % 5) + 1;
  const mesocycleNumber = Math.floor((clampedWeek - 1) / 5) + 1;

  return {
    mesocycleNumber,
    weekInMesocycle: mesocycleWeek,
    isDeload: false,
    isDietBreak: false,
  };
}

// ========================================
// RIR (Reps In Reserve) TYPES
// ========================================

export type RIRValue = 0 | 1 | 2 | 3;

export const RIR_OPTIONS: { value: RIRValue; label: string; description: string; color: string; activeColor: string }[] = [
  { value: 3, label: '3+', description: 'Facil, me sobraban varias reps', color: 'bg-emerald-600', activeColor: 'bg-emerald-600 text-white' },
  { value: 2, label: '2', description: 'Moderado, me quedaban 2 reps', color: 'bg-yellow-500', activeColor: 'bg-yellow-500 text-white' },
  { value: 1, label: '1', description: 'Duro, me quedaba 1 rep', color: 'bg-orange-500', activeColor: 'bg-orange-500 text-white' },
  { value: 0, label: '0', description: 'Al limite, no podia hacer mas', color: 'bg-red-600', activeColor: 'bg-red-600 text-white' },
];

export function getRIRLabel(rir: number): string {
  const option = RIR_OPTIONS.find(o => o.value === rir);
  return option ? option.description : '';
}

export function getCSVFolderForWeek(_week: number): string {
  void _week;
  return 'deficit_fase1';
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
  grasaSubcutanea?: number;
  grasaVisceral?: number;
  musculoEsqueletico?: number;
  masaMuscular?: number;
  aguaCorporal?: number;
  pesoSinGrasa?: number;
  masaOsea?: number;
  proteinaCorporal?: number;
  tmb?: number;
  imc?: number;
  cintura?: number;
  cadera?: number;
  pecho?: number;
  brazo?: number;
  muslo?: number;
  comidasRelax?: number;
  adherenciaNutricion?: number;
  suenoPromedio?: number;
  hambre?: number;
  energia?: number;
  molestias?: string;
  notas: string;
}

// ========================================
// DAILY WEIGHT TYPES
// ========================================

export interface DefinicionDailyWeight {
  week: number;
  day: string;
  peso: number;
  date: string;
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
  rir?: RIRValue | null;
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
  dailyWeights: DefinicionDailyWeight[];
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
  rir: { averageRIR: number; totalLogs: number };
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
