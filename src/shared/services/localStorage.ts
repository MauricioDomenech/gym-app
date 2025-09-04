import type { WorkoutProgress, ShoppingList, TableColumn } from '../../phases/maintenance/types/maintenance';
import type { ThemeMode } from '../types/base';

const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'gym-app-workout-progress',
  SHOPPING_LISTS: 'gym-app-shopping-lists',
  THEME: 'gym-app-theme',
  TABLE_COLUMNS: 'gym-app-table-columns',
  CURRENT_WEEK: 'gym-app-current-week',
  CURRENT_DAY: 'gym-app-current-day',
} as const;

export class LocalStorageService {
  // Generic storage methods
  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`📱 LocalStorage guardado: ${key}`, value);
    } catch (error) {
      console.error(`Failed to save to localStorage:`, error);
    }
  }

  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      const result = item ? JSON.parse(item) : defaultValue;
      if (item) {
        console.log(`📱 LocalStorage cargado: ${key}`, result);
      } else {
        console.log(`📱 LocalStorage usando default: ${key}`, defaultValue);
      }
      return result;
    } catch (error) {
      console.error(`Failed to read from localStorage:`, error);
      return defaultValue;
    }
  }

  // Workout Progress
  public static saveWorkoutProgress(progress: WorkoutProgress[]): void {
    this.setItem(STORAGE_KEYS.WORKOUT_PROGRESS, progress);
  }

  public static getWorkoutProgress(): WorkoutProgress[] {
    return this.getItem(STORAGE_KEYS.WORKOUT_PROGRESS, []);
  }

  public static addWorkoutProgress(progress: WorkoutProgress): void {
    const allProgress = this.getWorkoutProgress();
    const existingIndex = allProgress.findIndex(
      p => p.exerciseId === progress.exerciseId && 
           p.day === progress.day && 
           p.week === progress.week
    );

    if (existingIndex >= 0) {
      allProgress[existingIndex] = progress;
    } else {
      allProgress.push(progress);
    }

    this.saveWorkoutProgress(allProgress);
  }

  public static getExerciseProgress(exerciseId: string, day: string, week: number): WorkoutProgress | null {
    const allProgress = this.getWorkoutProgress();
    return allProgress.find(
      p => p.exerciseId === exerciseId && p.day === day && p.week === week
    ) || null;
  }

  // Shopping Lists
  public static saveShoppingLists(lists: ShoppingList[]): void {
    this.setItem(STORAGE_KEYS.SHOPPING_LISTS, lists);
  }

  public static getShoppingLists(): ShoppingList[] {
    return this.getItem(STORAGE_KEYS.SHOPPING_LISTS, []);
  }

  public static addShoppingList(list: ShoppingList): void {
    const allLists = this.getShoppingLists();
    allLists.push(list);
    this.saveShoppingLists(allLists);
  }

  public static updateShoppingList(index: number, list: ShoppingList): void {
    const allLists = this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists[index] = list;
      this.saveShoppingLists(allLists);
    }
  }

  public static deleteShoppingList(index: number): void {
    const allLists = this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists.splice(index, 1);
      this.saveShoppingLists(allLists);
    }
  }

  // Theme
  public static saveTheme(theme: ThemeMode): void {
    this.setItem(STORAGE_KEYS.THEME, theme);
    
    // Update both class and data-theme for better compatibility
    console.log('Saving theme:', theme);
    console.log('Before:', document.documentElement.classList.toString());
    
    // Remove existing theme classes and attributes
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    
    // Add new theme class and attribute
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    console.log('After:', document.documentElement.classList.toString());
    console.log('Data-theme:', document.documentElement.getAttribute('data-theme'));
  }

  public static getTheme(): ThemeMode {
    return this.getItem(STORAGE_KEYS.THEME, 'dark');
  }

  public static initializeTheme(): void {
    const savedTheme = this.getTheme();
    
    console.log('Initializing theme with:', savedTheme);
    console.log('Initial classes:', document.documentElement.classList.toString());
    
    // Apply theme immediately to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.add(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    console.log('Final classes:', document.documentElement.classList.toString());
    console.log('Data-theme:', document.documentElement.getAttribute('data-theme'));
  }

  // Table Columns Configuration
  public static saveTableColumns(columns: TableColumn[]): void {
    this.setItem(STORAGE_KEYS.TABLE_COLUMNS, columns);
  }

  public static getTableColumns(): TableColumn[] {
    const defaultColumns: TableColumn[] = [
      { key: 'comida', label: 'Comida', visible: false },
      { key: 'alimento', label: 'Alimento', visible: true },
      { key: 'cantidad', label: 'Cantidad', visible: true },
      { key: 'proteinas', label: 'Proteínas', visible: false },
      { key: 'grasas', label: 'Grasas', visible: false },
      { key: 'carbs', label: 'Carbs', visible: false },
      { key: 'fibra', label: 'Fibra', visible: false },
      { key: 'calorias', label: 'Calorías', visible: false },
    ];
    
    return this.getItem(STORAGE_KEYS.TABLE_COLUMNS, defaultColumns);
  }

  // Current Week and Day
  public static saveCurrentWeek(week: number): void {
    this.setItem(STORAGE_KEYS.CURRENT_WEEK, week);
    // También guardar en backup para mayor persistencia
    localStorage.setItem('gym-app-last-week', week.toString());
  }

  public static getCurrentWeek(): number {
    // Intentar primero con las claves de backup
    const lastWeek = localStorage.getItem('gym-app-last-week');
    if (lastWeek) {
      const week = parseInt(lastWeek, 10);
      if (!isNaN(week)) {
        console.log('📱 Usando semana desde backup:', week);
        return week;
      }
    }
    
    return this.getItem(STORAGE_KEYS.CURRENT_WEEK, 1);
  }

  public static saveCurrentDay(day: string): void {
    this.setItem(STORAGE_KEYS.CURRENT_DAY, day);
    // También guardar en backup para mayor persistencia
    localStorage.setItem('gym-app-last-day', day);
  }

  public static getCurrentDay(): string {
    // Intentar primero con las claves de backup
    const lastDay = localStorage.getItem('gym-app-last-day');
    if (lastDay) {
      console.log('📱 Usando día desde backup:', lastDay);
      return lastDay;
    }
    
    return this.getItem(STORAGE_KEYS.CURRENT_DAY, 'lunes');
  }

  // Clear all data (for reset functionality)
  public static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Export/Import functionality
  public static exportData(): string {
    const data = {
      workoutProgress: this.getWorkoutProgress(),
      shoppingLists: this.getShoppingLists(),
      theme: this.getTheme(),
      tableColumns: this.getTableColumns(),
      currentWeek: this.getCurrentWeek(),
      currentDay: this.getCurrentDay(),
      exportDate: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  public static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.workoutProgress) this.saveWorkoutProgress(data.workoutProgress);
      if (data.shoppingLists) this.saveShoppingLists(data.shoppingLists);
      if (data.theme) this.saveTheme(data.theme);
      if (data.tableColumns) this.saveTableColumns(data.tableColumns);
      if (data.currentWeek) this.saveCurrentWeek(data.currentWeek);
      if (data.currentDay) this.saveCurrentDay(data.currentDay);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}