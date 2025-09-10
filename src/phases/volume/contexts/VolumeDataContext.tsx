import React, { createContext, useContext, useState, useEffect } from 'react';
import { VolumeCSVParser } from '../services/volumeCSVParser';
import { VolumeExerciseParser } from '../services/volumeExerciseParser';
import { VolumeSupabaseService } from '../services/volumeSupabaseService';
import type { 
  VolumeDayNutrition, 
  VolumeWorkoutDay, 
  VolumeWorkoutProgress, 
  VolumeShoppingList,
  VolumeTableColumn 
} from '../types/volume';
import type { DayOfWeek } from '../../../shared/types/base';

interface VolumeDataContextType {
  // Current state
  currentWeek: number;
  currentDay: string;
  isLoading: boolean;
  
  // Data
  nutritionData: { [week: number]: { [day: string]: VolumeDayNutrition } };
  workoutData: { [week: number]: { [day: string]: VolumeWorkoutDay } };
  workoutProgress: VolumeWorkoutProgress[];
  shoppingLists: VolumeShoppingList[];
  tableColumns: VolumeTableColumn[];
  
  // Actions
  setCurrentWeek: (week: number) => void;
  setCurrentDay: (day: string) => Promise<void>;
  
  // Data getters
  getCurrentNutrition: () => VolumeDayNutrition | null;
  getCurrentWorkout: () => VolumeWorkoutDay | null;
  getDaysOfWeek: () => DayOfWeek[];
  
  // Progress management
  saveWorkoutProgress: (progress: VolumeWorkoutProgress) => Promise<void>;
  getExerciseProgress: (exerciseId: string, day: string, week: number, isAlternative?: boolean, alternativeIndex?: number) => VolumeWorkoutProgress | null;
  
  // Shopping list management
  addShoppingList: (list: VolumeShoppingList) => Promise<void>;
  
  // Table columns management
  updateTableColumns: (columns: VolumeTableColumn[]) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

const VolumeDataContext = createContext<VolumeDataContextType | undefined>(undefined);

interface VolumeDataProviderProps {
  children: React.ReactNode;
}

export const VolumeDataProvider: React.FC<VolumeDataProviderProps> = ({ children }) => {
  // State
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState('lunes');
  const [isLoading, setIsLoading] = useState(true);
  const [nutritionData, setNutritionData] = useState<{ [week: number]: { [day: string]: VolumeDayNutrition } }>({});
  const [workoutData, setWorkoutData] = useState<{ [week: number]: { [day: string]: VolumeWorkoutDay } }>({});
  const [workoutProgress, setWorkoutProgress] = useState<VolumeWorkoutProgress[]>([]);
  const [shoppingLists, setShoppingLists] = useState<VolumeShoppingList[]>([]);
  const [tableColumns, setTableColumns] = useState<VolumeTableColumn[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load static data from parsers
      const nutritionDataFromParser = VolumeCSVParser.getAllNutritionData();
      const workoutDataFromParser = VolumeExerciseParser.getAllWorkoutData();

      setNutritionData(nutritionDataFromParser);
      setWorkoutData(workoutDataFromParser);

      // Load dynamic data from Supabase
      const [
        progressFromDB,
        shoppingListsFromDB,
        columnsFromDB,
        currentWeekFromDB,
        currentDayFromDB,
      ] = await Promise.all([
        VolumeSupabaseService.getVolumeWorkoutProgress(),
        VolumeSupabaseService.getVolumeShoppingLists(),
        VolumeSupabaseService.getVolumeTableColumns(),
        VolumeSupabaseService.getCurrentVolumeWeek(),
        VolumeSupabaseService.getCurrentVolumeDay(),
      ]);

      setWorkoutProgress(progressFromDB);
      setShoppingLists(shoppingListsFromDB);
      setTableColumns(columnsFromDB);
      setCurrentWeek(currentWeekFromDB);
      setCurrentDay(currentDayFromDB);

    } catch (error) {
      console.error('Error loading volume data:', error);
      // Set default values on error
      setTableColumns([
        { key: 'comida', label: 'Comida', visible: true },
        { key: 'hora', label: 'Hora', visible: true },
        { key: 'alimento', label: 'Alimento', visible: true },
        { key: 'cantidad', label: 'Cantidad', visible: true },
        { key: 'unidad', label: 'Unidad', visible: true },
        { key: 'kcal', label: 'Kcal', visible: true },
        { key: 'proteinas_g', label: 'Proteínas', visible: true },
        { key: 'carbohidratos_g', label: 'Carbs', visible: true },
        { key: 'grasas_g', label: 'Grasas', visible: true },
        { key: 'fibra_g', label: 'Fibra', visible: false },
        { key: 'notas', label: 'Notas', visible: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Action handlers
  const handleSetCurrentWeek = async (week: number) => {
    setCurrentWeek(week);
    try {
      await VolumeSupabaseService.saveCurrentVolumeWeek(week);
    } catch (error) {
      console.error('Error saving current volume week:', error);
    }
  };

  const handleSetCurrentDay = async (day: string) => {
    setCurrentDay(day);
    try {
      await VolumeSupabaseService.saveCurrentVolumeDay(day);
    } catch (error) {
      console.error('Error saving current volume day:', error);
    }
  };

  // Data getters
  const getCurrentNutrition = (): VolumeDayNutrition | null => {
    return nutritionData[currentWeek]?.[currentDay] || null;
  };

  const getCurrentWorkout = (): VolumeWorkoutDay | null => {
    return workoutData[currentWeek]?.[currentDay] || null;
  };

  const getDaysOfWeek = (): DayOfWeek[] => {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  };

  // Progress management
  const saveWorkoutProgress = async (progress: VolumeWorkoutProgress): Promise<void> => {
    try {
      await VolumeSupabaseService.addVolumeWorkoutProgress(progress);
      
      // Update local state
      setWorkoutProgress(prev => {
        const filtered = prev.filter(p => 
          !(p.exerciseId === progress.exerciseId && 
            p.day === progress.day && 
            p.week === progress.week &&
            p.isAlternative === progress.isAlternative &&
            p.alternativeIndex === progress.alternativeIndex)
        );
        return [...filtered, progress];
      });
    } catch (error) {
      console.error('Error saving volume workout progress:', error);
      throw error;
    }
  };

  const getExerciseProgress = (
    exerciseId: string, 
    day: string, 
    week: number,
    isAlternative: boolean = false,
    alternativeIndex?: number
  ): VolumeWorkoutProgress | null => {
    return workoutProgress.find(p => 
      p.exerciseId === exerciseId && 
      p.day === day && 
      p.week === week &&
      p.isAlternative === isAlternative &&
      p.alternativeIndex === alternativeIndex
    ) || null;
  };

  // Shopping list management
  const addShoppingList = async (list: VolumeShoppingList): Promise<void> => {
    try {
      await VolumeSupabaseService.addVolumeShoppingList(list);
      setShoppingLists(prev => [...prev, list]);
    } catch (error) {
      console.error('Error adding volume shopping list:', error);
      throw error;
    }
  };

  // Table columns management
  const updateTableColumns = async (columns: VolumeTableColumn[]): Promise<void> => {
    try {
      await VolumeSupabaseService.saveVolumeTableColumns(columns);
      setTableColumns(columns);
    } catch (error) {
      console.error('Error updating volume table columns:', error);
      throw error;
    }
  };

  // Refresh data
  const refreshData = async (): Promise<void> => {
    await loadInitialData();
  };

  const value: VolumeDataContextType = {
    // Current state
    currentWeek,
    currentDay,
    isLoading,
    
    // Data
    nutritionData,
    workoutData,
    workoutProgress,
    shoppingLists,
    tableColumns,
    
    // Actions
    setCurrentWeek: handleSetCurrentWeek,
    setCurrentDay: handleSetCurrentDay,
    
    // Data getters
    getCurrentNutrition,
    getCurrentWorkout,
    getDaysOfWeek,
    
    // Progress management
    saveWorkoutProgress,
    getExerciseProgress,
    
    // Shopping list management
    addShoppingList,
    
    // Table columns management
    updateTableColumns,
    
    // Refresh data
    refreshData,
  };

  return (
    <VolumeDataContext.Provider value={value}>
      {children}
    </VolumeDataContext.Provider>
  );
};

export const useVolumeData = (): VolumeDataContextType => {
  const context = useContext(VolumeDataContext);
  if (context === undefined) {
    throw new Error('useVolumeData must be used within a VolumeDataProvider');
  }
  return context;
};