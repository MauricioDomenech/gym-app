// Nutrition Data Types
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

export interface NutritionTotals {
  proteinas: number;
  grasas: number;
  carbs: number;
  fibra: number;
  calorias: number;
}

// Exercise Data Types
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  exercises: Exercise[];
  type: string; // 'Empuje', 'Tirón', 'Piernas', 'Cardio', etc.
}

export interface WorkoutProgress {
  exerciseId: string;
  day: string;
  week: number;
  weights: [number, number, number]; // 3 columnas para pesos
  date: string;
}

// Week Plan Types
export interface WeekPlan {
  week: number;
  days: {
    [key: string]: {
      nutrition: DayNutrition;
      workout: WorkoutDay;
    };
  };
}

// Shopping List Types
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

// App State Types
export interface AppState {
  currentWeek: number;
  currentDay: string;
  theme: 'light' | 'dark';
  weekPlans: WeekPlan[];
  workoutProgress: WorkoutProgress[];
  shoppingLists: ShoppingList[];
}

// UI Component Types
export type ThemeMode = 'light' | 'dark';

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface TableColumn {
  key: keyof NutritionItem;
  label: string;
  visible: boolean;
}

// Weekly Summary Types
export interface WeeklySummary {
  week: number;
  totalsByDay: { [day: string]: NutritionTotals };
  weeklyTotals: NutritionTotals;
  averageDaily: NutritionTotals;
}