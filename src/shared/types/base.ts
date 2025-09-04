// Base types that can be used across different phases

// UI Component Types
export type ThemeMode = 'light' | 'dark';

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

// Base App State Types
export interface BaseAppState {
  currentWeek: number;
  currentDay: string;
  theme: ThemeMode;
}

// Base Exercise Types (can be extended by specific phases)
export interface BaseExercise {
  id: string;
  name: string;
  notes?: string;
}

export interface BaseWorkoutDay {
  day: string;
  type: string;
}

// Base Nutrition Types (can be extended by specific phases)
export interface BaseNutritionTotals {
  calorias: number;
}