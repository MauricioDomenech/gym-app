import React, { createContext, useContext, useState, useEffect } from 'react';
import { DefinicionCSVParser } from '../services/definicionCSVParser';
import { DefinicionExerciseParser } from '../services/definicionExerciseParser';
import { DefinicionSupabaseService } from '../services/definicionSupabaseService';
import type {
  DefinicionDayNutrition,
  DefinicionWorkoutDay,
  DefinicionWorkoutProgress,
  DefinicionShoppingList,
  DefinicionTableColumn,
  DefinicionBodyComposition,
  DefinicionCardioLog,
  DefinicionCardioConfig,
} from '../types/definicion';
import { DEFAULT_TABLE_COLUMNS } from '../types/definicion';
import type { DayOfWeek } from '../../../shared/types/base';

interface DefinicionDataContextType {
  currentWeek: number;
  currentDay: string;
  isLoading: boolean;

  nutritionData: { [week: number]: { [day: string]: DefinicionDayNutrition } };
  workoutData: { [week: number]: { [day: string]: DefinicionWorkoutDay } };
  workoutProgress: DefinicionWorkoutProgress[];
  shoppingLists: DefinicionShoppingList[];
  tableColumns: DefinicionTableColumn[];
  bodyComposition: DefinicionBodyComposition[];
  cardioLogs: DefinicionCardioLog[];

  setCurrentWeek: (week: number) => void;
  setCurrentDay: (day: string) => Promise<void>;

  getCurrentNutrition: () => DefinicionDayNutrition | null;
  getCurrentWorkout: () => DefinicionWorkoutDay | null;
  getCardioConfig: (day: string) => DefinicionCardioConfig | null;
  getDaysOfWeek: () => DayOfWeek[];

  saveWorkoutProgress: (progress: DefinicionWorkoutProgress) => Promise<void>;
  getExerciseProgress: (exerciseId: string, day: string, week: number, isAlternative?: boolean, alternativeIndex?: number | null) => DefinicionWorkoutProgress | null;

  addShoppingList: (list: DefinicionShoppingList) => Promise<void>;
  updateTableColumns: (columns: DefinicionTableColumn[]) => Promise<void>;

  addBodyComposition: (entry: DefinicionBodyComposition) => Promise<void>;
  addCardioLog: (log: DefinicionCardioLog) => Promise<void>;

  refreshData: () => Promise<void>;
}

const DefinicionDataContext = createContext<DefinicionDataContextType | undefined>(undefined);

interface DefinicionDataProviderProps {
  children: React.ReactNode;
}

export const DefinicionDataProvider: React.FC<DefinicionDataProviderProps> = ({ children }) => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState('lunes');
  const [isLoading, setIsLoading] = useState(true);
  const [nutritionData, setNutritionData] = useState<{ [week: number]: { [day: string]: DefinicionDayNutrition } }>({});
  const [workoutData, setWorkoutData] = useState<{ [week: number]: { [day: string]: DefinicionWorkoutDay } }>({});
  const [workoutProgress, setWorkoutProgress] = useState<DefinicionWorkoutProgress[]>([]);
  const [shoppingLists, setShoppingLists] = useState<DefinicionShoppingList[]>([]);
  const [tableColumns, setTableColumns] = useState<DefinicionTableColumn[]>(DEFAULT_TABLE_COLUMNS);
  const [bodyComposition, setBodyComposition] = useState<DefinicionBodyComposition[]>([]);
  const [cardioLogs, setCardioLogs] = useState<DefinicionCardioLog[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const nutritionDataFromParser = DefinicionCSVParser.getAllNutritionData();
      const workoutDataFromParser = DefinicionExerciseParser.getAllWorkoutData();

      setNutritionData(nutritionDataFromParser);
      setWorkoutData(workoutDataFromParser);

      const [
        progressFromDB,
        shoppingListsFromDB,
        columnsFromDB,
        currentWeekFromDB,
        currentDayFromDB,
        bodyFromDB,
        cardioFromDB,
      ] = await Promise.all([
        DefinicionSupabaseService.getDefinicionWorkoutProgress(),
        DefinicionSupabaseService.getDefinicionShoppingLists(),
        DefinicionSupabaseService.getDefinicionTableColumns(),
        DefinicionSupabaseService.getCurrentDefinicionWeek(),
        DefinicionSupabaseService.getCurrentDefinicionDay(),
        DefinicionSupabaseService.getDefinicionBodyComposition(),
        DefinicionSupabaseService.getDefinicionCardioLogs(),
      ]);

      setWorkoutProgress(progressFromDB);
      setShoppingLists(shoppingListsFromDB);
      setTableColumns(columnsFromDB);
      setCurrentWeek(currentWeekFromDB);
      setCurrentDay(currentDayFromDB);
      setBodyComposition(bodyFromDB);
      setCardioLogs(cardioFromDB);

    } catch (error) {
      console.error('Error loading definicion data:', error);
      setTableColumns(DEFAULT_TABLE_COLUMNS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentWeek = async (week: number) => {
    setCurrentWeek(week);
    try {
      await DefinicionSupabaseService.saveCurrentDefinicionWeek(week);
    } catch (error) {
      console.error('Error saving current definicion week:', error);
    }
  };

  const handleSetCurrentDay = async (day: string) => {
    setCurrentDay(day);
    try {
      await DefinicionSupabaseService.saveCurrentDefinicionDay(day);
    } catch (error) {
      console.error('Error saving current definicion day:', error);
    }
  };

  const getCurrentNutrition = (): DefinicionDayNutrition | null => {
    return nutritionData[currentWeek]?.[currentDay] || null;
  };

  const getCurrentWorkout = (): DefinicionWorkoutDay | null => {
    return workoutData[currentWeek]?.[currentDay] || null;
  };

  const getCardioConfig = (day: string): DefinicionCardioConfig | null => {
    return DefinicionExerciseParser.getCardioConfig(day);
  };

  const getDaysOfWeek = (): DayOfWeek[] => {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  };

  const saveWorkoutProgress = async (progress: DefinicionWorkoutProgress): Promise<void> => {
    try {
      await DefinicionSupabaseService.addDefinicionWorkoutProgress(progress);
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
      console.error('Error saving definicion workout progress:', error);
      throw error;
    }
  };

  const getExerciseProgress = (
    exerciseId: string,
    day: string,
    week: number,
    isAlternative: boolean = false,
    alternativeIndex?: number | null
  ): DefinicionWorkoutProgress | null => {
    return workoutProgress.find(p =>
      p.exerciseId === exerciseId &&
      p.day === day &&
      p.week === week &&
      p.isAlternative === isAlternative &&
      p.alternativeIndex === alternativeIndex
    ) || null;
  };

  const addShoppingList = async (list: DefinicionShoppingList): Promise<void> => {
    try {
      await DefinicionSupabaseService.addDefinicionShoppingList(list);
      setShoppingLists(prev => [...prev, list]);
    } catch (error) {
      console.error('Error adding definicion shopping list:', error);
      throw error;
    }
  };

  const updateTableColumns = async (columns: DefinicionTableColumn[]): Promise<void> => {
    try {
      await DefinicionSupabaseService.saveDefinicionTableColumns(columns);
      setTableColumns(columns);
    } catch (error) {
      console.error('Error updating definicion table columns:', error);
      throw error;
    }
  };

  const addBodyComposition = async (entry: DefinicionBodyComposition): Promise<void> => {
    try {
      await DefinicionSupabaseService.addDefinicionBodyComposition(entry);
      setBodyComposition(prev => {
        const filtered = prev.filter(b => b.week !== entry.week);
        return [...filtered, entry].sort((a, b) => a.week - b.week);
      });
    } catch (error) {
      console.error('Error adding body composition:', error);
      throw error;
    }
  };

  const addCardioLog = async (log: DefinicionCardioLog): Promise<void> => {
    try {
      await DefinicionSupabaseService.addDefinicionCardioLog(log);
      setCardioLogs(prev => {
        const filtered = prev.filter(c => !(c.day === log.day && c.week === log.week));
        return [...filtered, log];
      });
    } catch (error) {
      console.error('Error adding cardio log:', error);
      throw error;
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadInitialData();
  };

  const value: DefinicionDataContextType = {
    currentWeek, currentDay, isLoading,
    nutritionData, workoutData, workoutProgress, shoppingLists, tableColumns, bodyComposition, cardioLogs,
    setCurrentWeek: handleSetCurrentWeek, setCurrentDay: handleSetCurrentDay,
    getCurrentNutrition, getCurrentWorkout, getCardioConfig, getDaysOfWeek,
    saveWorkoutProgress, getExerciseProgress,
    addShoppingList, updateTableColumns,
    addBodyComposition, addCardioLog,
    refreshData,
  };

  return (
    <DefinicionDataContext.Provider value={value}>
      {children}
    </DefinicionDataContext.Provider>
  );
};

export const useDefinicionData = (): DefinicionDataContextType => {
  const context = useContext(DefinicionDataContext);
  if (context === undefined) {
    throw new Error('useDefinicionData must be used within a DefinicionDataProvider');
  }
  return context;
};
