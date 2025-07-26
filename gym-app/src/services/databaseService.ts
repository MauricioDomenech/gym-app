import type { WorkoutProgress, ShoppingList, ThemeMode, TableColumn } from '../models/types';

const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'gym-app-workout-progress',
  SHOPPING_LISTS: 'gym-app-shopping-lists',
  THEME: 'gym-app-theme',
  TABLE_COLUMNS: 'gym-app-table-columns',
  CURRENT_WEEK: 'gym-app-current-week',
  CURRENT_DAY: 'gym-app-current-day',
} as const;

class RedisClient {
  private static instance: any = null;
  private static isConnecting = false;

  public static async getClient() {
    if (typeof window !== 'undefined') {
      throw new Error('Redis client cannot be used in browser');
    }

    if (this.instance && this.instance.isOpen) {
      return this.instance;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.instance;
    }

    this.isConnecting = true;

    try {
      const { createClient } = await import('redis');
      const redisUrl = process.env.REDIS_URL || process.env.VITE_REDIS_URL;
      if (!redisUrl) {
        throw new Error('REDIS_URL not configured');
      }

      this.instance = createClient({ 
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
        }
      });

      this.instance.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
      });

      await this.instance.connect();
      this.isConnecting = false;
      return this.instance;
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public static async disconnect() {
    if (this.instance && this.instance.isOpen) {
      await this.instance.disconnect();
      this.instance = null;
    }
  }
}

export class DatabaseService {
  private static getUserKey(baseKey: string, userId?: string): string {
    const userIdentifier = userId || this.getUserId();
    return `${userIdentifier}:${baseKey}`;
  }

  private static getUserId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let userId = localStorage.getItem('gym-app-user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('gym-app-user-id', userId);
    }
    return userId;
  }

  private static async setItem<T>(key: string, value: T, userId?: string): Promise<void> {
    const userKey = this.getUserKey(key, userId);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(userKey, JSON.stringify(value));
    } else {
      try {
        const client = await RedisClient.getClient();
        await client.set(userKey, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to save to Redis:`, error);
        throw new Error(`Failed to save ${key} to database`);
      }
    }
  }

  private static async getItem<T>(key: string, defaultValue: T, userId?: string): Promise<T> {
    const userKey = this.getUserKey(key, userId);
    
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(userKey);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error(`Failed to parse localStorage item:`, error);
        return defaultValue;
      }
    } else {
      try {
        const client = await RedisClient.getClient();
        const item = await client.get(userKey);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error(`Failed to read from Redis:`, error);
        return defaultValue;
      }
    }
  }

  public static async saveWorkoutProgress(progress: WorkoutProgress[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.WORKOUT_PROGRESS, progress);
  }

  public static async getWorkoutProgress(): Promise<WorkoutProgress[]> {
    return await this.getItem(STORAGE_KEYS.WORKOUT_PROGRESS, []);
  }

  public static async addWorkoutProgress(progress: WorkoutProgress): Promise<void> {
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

  public static async getExerciseProgress(
    exerciseId: string, 
    day: string, 
    week: number
  ): Promise<WorkoutProgress | null> {
    const allProgress = await this.getWorkoutProgress();
    return allProgress.find(
      p => p.exerciseId === exerciseId && p.day === day && p.week === week
    ) || null;
  }

  public static async saveShoppingLists(lists: ShoppingList[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.SHOPPING_LISTS, lists);
  }

  public static async getShoppingLists(): Promise<ShoppingList[]> {
    return await this.getItem(STORAGE_KEYS.SHOPPING_LISTS, []);
  }

  public static async addShoppingList(list: ShoppingList): Promise<void> {
    const allLists = await this.getShoppingLists();
    allLists.push(list);
    await this.saveShoppingLists(allLists);
  }

  public static async updateShoppingList(index: number, list: ShoppingList): Promise<void> {
    const allLists = await this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists[index] = list;
      await this.saveShoppingLists(allLists);
    }
  }

  public static async deleteShoppingList(index: number): Promise<void> {
    const allLists = await this.getShoppingLists();
    if (index >= 0 && index < allLists.length) {
      allLists.splice(index, 1);
      await this.saveShoppingLists(allLists);
    }
  }

  public static async saveTheme(theme: ThemeMode): Promise<void> {
    await this.setItem(STORAGE_KEYS.THEME, theme);
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  public static async getTheme(): Promise<ThemeMode> {
    return await this.getItem(STORAGE_KEYS.THEME, 'dark');
  }

  public static async initializeTheme(): Promise<void> {
    const savedTheme = await this.getTheme();
    
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  public static async saveTableColumns(columns: TableColumn[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.TABLE_COLUMNS, columns);
  }

  public static async getTableColumns(): Promise<TableColumn[]> {
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
    
    return await this.getItem(STORAGE_KEYS.TABLE_COLUMNS, defaultColumns);
  }

  public static async saveCurrentWeek(week: number): Promise<void> {
    await this.setItem(STORAGE_KEYS.CURRENT_WEEK, week);
  }

  public static async getCurrentWeek(): Promise<number> {
    return await this.getItem(STORAGE_KEYS.CURRENT_WEEK, 1);
  }

  public static async saveCurrentDay(day: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.CURRENT_DAY, day);
  }

  public static async getCurrentDay(): Promise<string> {
    return await this.getItem(STORAGE_KEYS.CURRENT_DAY, 'lunes');
  }

  public static async clearAllData(): Promise<void> {
    const userId = this.getUserId();
    
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        const userKey = this.getUserKey(key, userId);
        localStorage.removeItem(userKey);
      });
    } else {
      try {
        const client = await RedisClient.getClient();
        const promises = Object.values(STORAGE_KEYS).map(key => {
          const userKey = this.getUserKey(key, userId);
          return client.del(userKey);
        });
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Failed to clear data from Redis:', error);
        throw error;
      }
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
    
    try {
      const localStorageData = {
        workoutProgress: JSON.parse(localStorage.getItem('gym-app-workout-progress') || '[]'),
        shoppingLists: JSON.parse(localStorage.getItem('gym-app-shopping-lists') || '[]'),
        theme: JSON.parse(localStorage.getItem('gym-app-theme') || '"dark"'),
        tableColumns: JSON.parse(localStorage.getItem('gym-app-table-columns') || '[]'),
        currentWeek: JSON.parse(localStorage.getItem('gym-app-current-week') || '1'),
        currentDay: JSON.parse(localStorage.getItem('gym-app-current-day') || '"lunes"'),
      };

      const promises: Promise<void>[] = [];
      
      if (localStorageData.workoutProgress.length > 0) {
        promises.push(this.saveWorkoutProgress(localStorageData.workoutProgress));
      }
      if (localStorageData.shoppingLists.length > 0) {
        promises.push(this.saveShoppingLists(localStorageData.shoppingLists));
      }
      if (localStorageData.theme) {
        promises.push(this.saveTheme(localStorageData.theme));
      }
      if (localStorageData.tableColumns.length > 0) {
        promises.push(this.saveTableColumns(localStorageData.tableColumns));
      }
      if (localStorageData.currentWeek) {
        promises.push(this.saveCurrentWeek(localStorageData.currentWeek));
      }
      if (localStorageData.currentDay) {
        promises.push(this.saveCurrentDay(localStorageData.currentDay));
      }

      await Promise.all(promises);
      
      localStorage.setItem('gym-app-migrated', 'true');
      console.log('Migración completada exitosamente');
    } catch (error) {
      console.error('Error durante la migración:', error);
    }
  }

  public static async disconnect(): Promise<void> {
    if (typeof window === 'undefined') {
      await RedisClient.disconnect();
    }
  }
} 