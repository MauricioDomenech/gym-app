import type { BaseExercise, BaseWorkoutDay, BaseNutritionTotals, BaseAppState } from '../../../shared/types/base';
export type { DayOfWeek } from '../../../shared/types/base';

// Maintenance-specific Nutrition Data Types
export interface NutritionItem {
  comida: string;
  alimento: string;
  cantidad: string;
  proteinas: string;
  grasas: string;
  carbs: string;
  fibra: string;
  calorias: string;
}

export interface DayNutrition {
  day: string;
  meals: NutritionItem[];
  totals: NutritionTotals;
}

export interface NutritionTotals extends BaseNutritionTotals {
  proteinas: number;
  grasas: number;
  carbs: number;
  fibra: number;
}

// Maintenance-specific Exercise Data Types
export interface Exercise extends BaseExercise {
  sets: number;
  reps: number;
}

export interface WorkoutDay extends BaseWorkoutDay {
  exercises: Exercise[];
}

export interface WorkoutProgress {
  exerciseId: string;
  day: string;
  week: number;
  weights: [number, number, number]; // 3 columnas para pesos
  date: string;
}

// Maintenance-specific Week Plan Types
export interface WeekPlan {
  week: number;
  days: {
    [key: string]: {
      nutrition: DayNutrition;
      workout: WorkoutDay;
    };
  };
}

// Maintenance-specific Shopping List Types
export interface ShoppingItem {
  alimento: string;
  cantidad: number;
  unidad: string;
  purchased: boolean;
}

export interface ShoppingList {
  selectedWeeks: number[];
  selectedDays: string[];
  items: ShoppingItem[];
  generatedDate: string;
}

// Maintenance-specific App State Types
export interface MaintenanceAppState extends BaseAppState {
  weekPlans: WeekPlan[];
  workoutProgress: WorkoutProgress[];
  shoppingLists: ShoppingList[];
}

// Maintenance-specific UI Component Types
export interface TableColumn {
  key: keyof NutritionItem;
  label: string;
  visible: boolean;
}

// Maintenance-specific Weekly Summary Types
export interface WeeklySummary {
  week: number;
  totalsByDay: { [day: string]: NutritionTotals };
  weeklyTotals: NutritionTotals;
  averageDaily: NutritionTotals;
}