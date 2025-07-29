import type { WorkoutProgress, ShoppingList, ThemeMode, TableColumn } from '../models/types';
import { SupabaseService } from './supabaseService';
import { LocalStorageService } from './localStorage';

const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'gym-app-workout-progress',
  SHOPPING_LISTS: 'gym-app-shopping-lists',
  THEME: 'gym-app-theme',
  TABLE_COLUMNS: 'gym-app-table-columns',
  CURRENT_WEEK: 'gym-app-current-week',
  CURRENT_DAY: 'gym-app-current-day',
} as const;

class ApiClient {
  private static baseUrl = '/api/database';

  private static async call(action: string, key: string, value?: any): Promise<any> {
    const userId = this.getUserId();
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          key,
          value,
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Network error calling ${this.baseUrl}:`, error);
      throw error;
    }
  }

  private static getUserId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let userId = sessionStorage.getItem('gym-app-user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('gym-app-user-id', userId);
    }
    return userId;
  }

  public static async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const result = await this.call('get', key);
      return result.data !== null ? result.data : defaultValue;
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return defaultValue;
    }
  }

  public static async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.call('set', key, value);
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
      throw new Error(`Failed to save ${key} to database`);
    }
  }

  public static async delete(key: string): Promise<void> {
    try {
      await this.call('delete', key);
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error);
      throw error;
    }
  }

  public static async clear(): Promise<void> {
    try {
      await this.call('clear', '');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
}

export class DatabaseService {
  public static async saveWorkoutProgress(progress: WorkoutProgress[]): Promise<void> {
    try {
      await SupabaseService.saveWorkoutProgress(progress);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      await ApiClient.set(STORAGE_KEYS.WORKOUT_PROGRESS, progress);
    }
  }

  public static async getWorkoutProgress(): Promise<WorkoutProgress[]> {
    try {
      return await SupabaseService.getWorkoutProgress();
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      return await ApiClient.get(STORAGE_KEYS.WORKOUT_PROGRESS, []);
    }
  }

  public static async addWorkoutProgress(progress: WorkoutProgress): Promise<void> {
    try {
      await SupabaseService.addWorkoutProgress(progress);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      const allProgress = await this.getWorkoutProgress();
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

      await this.saveWorkoutProgress(allProgress);
    }
  }

  public static async getExerciseProgress(
    exerciseId: string, 
    day: string, 
    week: number
  ): Promise<WorkoutProgress | null> {
    try {
      return await SupabaseService.getExerciseProgress(exerciseId, day, week);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      const allProgress = await this.getWorkoutProgress();
      return allProgress.find(
        p => p.exerciseId === exerciseId && p.day === day && p.week === week
      ) || null;
    }
  }

  public static async saveShoppingLists(lists: ShoppingList[]): Promise<void> {
    try {
      await SupabaseService.saveShoppingLists(lists);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      await ApiClient.set(STORAGE_KEYS.SHOPPING_LISTS, lists);
    }
  }

  public static async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      return await SupabaseService.getShoppingLists();
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      return await ApiClient.get(STORAGE_KEYS.SHOPPING_LISTS, []);
    }
  }

  public static async addShoppingList(list: ShoppingList): Promise<void> {
    try {
      await SupabaseService.addShoppingList(list);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      const allLists = await this.getShoppingLists();
      allLists.push(list);
      await this.saveShoppingLists(allLists);
    }
  }

  public static async updateShoppingList(index: number, list: ShoppingList): Promise<void> {
    try {
      await SupabaseService.updateShoppingList(index, list);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      const allLists = await this.getShoppingLists();
      if (index >= 0 && index < allLists.length) {
        allLists[index] = list;
        await this.saveShoppingLists(allLists);
      }
    }
  }

  public static async deleteShoppingList(index: number): Promise<void> {
    try {
      await SupabaseService.deleteShoppingList(index);
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      const allLists = await this.getShoppingLists();
      if (index >= 0 && index < allLists.length) {
        allLists.splice(index, 1);
        await this.saveShoppingLists(allLists);
      }
    }
  }

  public static async saveTheme(theme: ThemeMode): Promise<void> {
    await ApiClient.set(STORAGE_KEYS.THEME, theme);
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  public static async getTheme(): Promise<ThemeMode> {
    return await ApiClient.get(STORAGE_KEYS.THEME, 'dark');
  }

  public static async initializeTheme(): Promise<void> {
    try {
      const savedTheme = await this.getTheme();
      
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.add(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      if (typeof window !== 'undefined') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }

  public static async saveTableColumns(columns: TableColumn[]): Promise<void> {
    // Guardar en localStorage como prioridad para configuraciones de UI
    if (typeof window !== 'undefined') {
      LocalStorageService.saveTableColumns(columns);
    }
    
    // También guardar en base de datos como backup
    try {
      await ApiClient.set(STORAGE_KEYS.TABLE_COLUMNS, columns);
    } catch (error) {
      console.warn('Failed to save table columns to database:', error);
    }
  }

  public static async getTableColumns(): Promise<TableColumn[]> {
    // Priorizar localStorage para configuraciones de UI
    if (typeof window !== 'undefined') {
      return LocalStorageService.getTableColumns();
    }
    
    // Fallback a base de datos para server-side
    const defaultColumns: TableColumn[] = [
      { key: 'comida', label: 'Comida', visible: true },
      { key: 'alimento', label: 'Alimento', visible: true },
      { key: 'cantidad', label: 'Cantidad', visible: true },
      { key: 'proteinas', label: 'Proteínas', visible: true },
      { key: 'grasas', label: 'Grasas', visible: true },
      { key: 'carbs', label: 'Carbs', visible: true },
      { key: 'fibra', label: 'Fibra', visible: false },
      { key: 'calorias', label: 'Calorías', visible: true },
    ];
    
    return await ApiClient.get(STORAGE_KEYS.TABLE_COLUMNS, defaultColumns);
  }

  public static async saveCurrentWeek(week: number): Promise<void> {
    // Guardar en localStorage como prioridad para estado de navegación
    if (typeof window !== 'undefined') {
      LocalStorageService.saveCurrentWeek(week);
    }
    
    // También guardar en base de datos como backup
    try {
      await ApiClient.set(STORAGE_KEYS.CURRENT_WEEK, week);
    } catch (error) {
      console.warn('Failed to save current week to database:', error);
    }
  }

  public static async getCurrentWeek(): Promise<number> {
    // Priorizar localStorage para estado de navegación
    if (typeof window !== 'undefined') {
      return LocalStorageService.getCurrentWeek();
    }
    
    // Fallback a base de datos para server-side
    return await ApiClient.get(STORAGE_KEYS.CURRENT_WEEK, 1);
  }

  public static async saveCurrentDay(day: string): Promise<void> {
    // Guardar en localStorage como prioridad para estado de navegación
    if (typeof window !== 'undefined') {
      LocalStorageService.saveCurrentDay(day);
    }
    
    // También guardar en base de datos como backup
    try {
      await ApiClient.set(STORAGE_KEYS.CURRENT_DAY, day);
    } catch (error) {
      console.warn('Failed to save current day to database:', error);
    }
  }

  public static async getCurrentDay(): Promise<string> {
    // Priorizar localStorage para estado de navegación
    if (typeof window !== 'undefined') {
      return LocalStorageService.getCurrentDay();
    }
    
    // Fallback a base de datos para server-side
    return await ApiClient.get(STORAGE_KEYS.CURRENT_DAY, 'lunes');
  }

  public static async clearAllData(): Promise<void> {
    try {
      await SupabaseService.clearAllData();
    } catch (error) {
      console.warn('Supabase failed, falling back to API:', error);
      await ApiClient.clear();
    }
  }

  public static async exportData(): Promise<string> {
    const data = {
      workoutProgress: await this.getWorkoutProgress(),
      shoppingLists: await this.getShoppingLists(),
      theme: await this.getTheme(),
      tableColumns: await this.getTableColumns(),
      currentWeek: await this.getCurrentWeek(),
      currentDay: await this.getCurrentDay(),
      exportDate: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  public static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      const promises: Promise<void>[] = [];
      
      if (data.workoutProgress) promises.push(this.saveWorkoutProgress(data.workoutProgress));
      if (data.shoppingLists) promises.push(this.saveShoppingLists(data.shoppingLists));
      if (data.theme) promises.push(this.saveTheme(data.theme));
      if (data.tableColumns) promises.push(this.saveTableColumns(data.tableColumns));
      if (data.currentWeek) promises.push(this.saveCurrentWeek(data.currentWeek));
      if (data.currentDay) promises.push(this.saveCurrentDay(data.currentDay));
      
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  public static async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const migrationKey = 'gym-app-migrated-to-supabase';
    if (sessionStorage.getItem(migrationKey)) {
      console.log('✅ Migración ya completada anteriormente');
      return;
    }

    try {
      const localStorageData = {
        workoutProgress: this.parseLocalStorageItem('gym-app-workout-progress', []),
        shoppingLists: this.parseLocalStorageItem('gym-app-shopping-lists', []),
        theme: this.parseLocalStorageItem('gym-app-theme', 'dark'),
        tableColumns: this.parseLocalStorageItem('gym-app-table-columns', []),
        currentWeek: this.parseLocalStorageItem('gym-app-current-week', 1),
        currentDay: this.parseLocalStorageItem('gym-app-current-day', 'lunes'),
      };

      const promises: Promise<void>[] = [];
      
      if (localStorageData.workoutProgress.length > 0) {
        promises.push(this.saveWorkoutProgress(localStorageData.workoutProgress));
        localStorage.removeItem('gym-app-workout-progress');
      }
      if (localStorageData.shoppingLists.length > 0) {
        promises.push(this.saveShoppingLists(localStorageData.shoppingLists));
        localStorage.removeItem('gym-app-shopping-lists');
      }
      if (localStorageData.theme !== 'dark') {
        promises.push(this.saveTheme(localStorageData.theme as ThemeMode));
        localStorage.removeItem('gym-app-theme');
      }
      if (localStorageData.tableColumns.length > 0) {
        promises.push(this.saveTableColumns(localStorageData.tableColumns));
        localStorage.removeItem('gym-app-table-columns');
      }
      if (localStorageData.currentWeek !== 1) {
        promises.push(this.saveCurrentWeek(localStorageData.currentWeek));
        localStorage.removeItem('gym-app-current-week');
      }
      if (localStorageData.currentDay !== 'lunes') {
        promises.push(this.saveCurrentDay(localStorageData.currentDay));
        localStorage.removeItem('gym-app-current-day');
      }

      await Promise.all(promises);
      
      sessionStorage.setItem(migrationKey, 'true');
      console.log('✅ Migración a Supabase completada exitosamente');
    } catch (error) {
      console.error('❌ Error durante la migración a Supabase:', error);
    }
  }

  private static parseLocalStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to parse localStorage item ${key}:`, error);
      return defaultValue;
    }
  }

  public static async disconnect(): Promise<void> {
  }
} 