import type { BaseExercise, BaseWorkoutDay, BaseNutritionTotals, BaseAppState } from '../../../shared/types/base';
export type { DayOfWeek } from '../../../shared/types/base';

// Volume-specific Nutrition Data Types
export interface VolumeNutritionItem {
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

export interface VolumeDayNutrition {
  day: string;
  meals: VolumeNutritionItem[];
  totals: VolumeNutritionTotals;
}

export interface VolumeNutritionTotals extends BaseNutritionTotals {
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
  fibra_g: number;
  kcal: number;
}

// Volume-specific Exercise Data Types
export interface VolumeAlternative {
  nombre: string;
  imagen: string;
}

export interface VolumeExercise extends BaseExercise {
  series: string;
  repeticiones: string;
  imagen: string;
  alternativas: VolumeAlternative[];
}

export interface VolumeWorkoutDay extends BaseWorkoutDay {
  orden: number;
  dia: string;
  musculos: string;
  exercises: VolumeExercise[];
}

export interface VolumeWorkoutProgress {
  exerciseId: string;
  day: string;
  week: number;
  weights: number[]; // Arreglo dinámico de pesos según series del ejercicio
  seriesCount: number; // Cantidad de series usadas (2-5 series dependiendo del ejercicio)
  date: string;
  isAlternative: boolean;
  alternativeIndex?: number | null;
}

// Volume-specific Week Plan Types
export interface VolumeWeekPlan {
  week: number;
  days: {
    [key: string]: {
      nutrition: VolumeDayNutrition;
      workout: VolumeWorkoutDay;
    };
  };
}

// Volume-specific Shopping List Types
export interface VolumeShoppingItem {
  alimento: string;
  cantidad: number;
  unidad: string;
  purchased: boolean;
}

export interface VolumeShoppingList {
  selectedWeeks: number[];
  selectedDays: string[];
  items: VolumeShoppingItem[];
  generatedDate: string;
}

// Volume-specific App State Types
export interface VolumeAppState extends BaseAppState {
  weekPlans: VolumeWeekPlan[];
  workoutProgress: VolumeWorkoutProgress[];
  shoppingLists: VolumeShoppingList[];
}

// Volume-specific UI Component Types
export interface VolumeTableColumn {
  key: keyof VolumeNutritionItem;
  label: string;
  visible: boolean;
}

// Volume-specific Weekly Summary Types
export interface VolumeWeeklySummary {
  week: number;
  totalsByDay: { [day: string]: VolumeNutritionTotals };
  weeklyTotals: VolumeNutritionTotals;
  averageDaily: VolumeNutritionTotals;
}

// Volume-specific Plan Structure from JSON
export interface VolumePlan {
  plan: VolumeWorkoutDay[];
}

// Modal and UI Types
export interface ExerciseImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  imagePath: string;
}

export interface AlternativesListProps {
  exercise: VolumeExercise;
  onShowImage: (imagePath: string, exerciseName: string) => void;
}

// Volume Individual Tracker Types
export interface VolumeIndividualTrackerProps {
  exercise: VolumeExercise;
  onProgressSaved?: () => void;
}

// Volume Copy Week Data Types
export interface VolumeCopyWeekDataProps {
  currentWeek: number;
}

// Utility Types and Functions
export interface SeriesParseResult {
  minSeries: number;
  maxSeries: number;
  defaultSeries: number;
}

// Utility function to parse series string (e.g., "3", "2-3", "4")
export function parseSeriesString(seriesStr: string): SeriesParseResult {
  // Handle range format like "2-3"
  if (seriesStr.includes('-')) {
    const [min, max] = seriesStr.split('-').map(s => parseInt(s.trim()));
    return {
      minSeries: min || 2,
      maxSeries: max || min || 3,
      defaultSeries: min || 2, // Use minimum as default
    };
  }
  
  // Handle single number like "3" or "4"
  const singleNumber = parseInt(seriesStr);
  if (!isNaN(singleNumber)) {
    return {
      minSeries: singleNumber,
      maxSeries: singleNumber,
      defaultSeries: singleNumber,
    };
  }
  
  // Fallback for invalid strings
  return {
    minSeries: 3,
    maxSeries: 3,
    defaultSeries: 3,
  };
}