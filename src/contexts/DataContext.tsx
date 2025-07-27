import React, { createContext, useContext, useEffect, useState } from 'react';
import type { DayNutrition, WorkoutDay, WorkoutProgress, TableColumn, DayOfWeek } from '../models/types';
import { CSVParser } from '../services/csvParser';
import { ExerciseParser } from '../services/exerciseParser';
import { DatabaseService } from '../services/databaseService';

interface DataContextType {
  currentWeek: number;
  currentDay: DayOfWeek;
  setCurrentWeek: (week: number) => void;
  setCurrentDay: (day: DayOfWeek) => void;
  
  getNutritionData: (week: number, day: string) => DayNutrition | null;
  getWeekNutrition: (week: number) => { [day: string]: DayNutrition };
  
  getWorkoutData: (week: number, day: string) => WorkoutDay | null;
  getWeekWorkouts: (week: number) => { [day: string]: WorkoutDay };
  
  workoutProgress: WorkoutProgress[];
  addWorkoutProgress: (progress: WorkoutProgress) => Promise<void>;
  getExerciseProgress: (exerciseId: string, day: string, week: number) => WorkoutProgress | null;
  
  tableColumns: TableColumn[];
  updateTableColumns: (columns: TableColumn[]) => Promise<void>;
  
  getDaysOfWeek: () => DayOfWeek[];
  getWeeks: () => number[];
  
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [currentWeek, setCurrentWeekState] = useState<number>(1);
  const [currentDay, setCurrentDayState] = useState<DayOfWeek>('lunes');
  const [workoutProgress, setWorkoutProgress] = useState<WorkoutProgress[]>([]);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        const shouldMigrate = typeof window !== 'undefined' && 
                             !localStorage.getItem('gym-app-migrated');
        
        if (shouldMigrate) {
          await DatabaseService.migrateFromLocalStorage();
        }

        const [savedWeek, savedDay, savedProgress, savedColumns] = await Promise.all([
          DatabaseService.getCurrentWeek(),
          DatabaseService.getCurrentDay(),
          DatabaseService.getWorkoutProgress(),
          DatabaseService.getTableColumns(),
        ]);

        setCurrentWeekState(savedWeek);
        setCurrentDayState(savedDay as DayOfWeek);
        setWorkoutProgress(savedProgress);
        setTableColumns(savedColumns);
        
        await DatabaseService.initializeTheme();
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const setCurrentWeek = async (week: number) => {
    setCurrentWeekState(week);
    try {
      await DatabaseService.saveCurrentWeek(week);
    } catch (error) {
      console.error('Error saving current week:', error);
    }
  };

  const setCurrentDay = async (day: DayOfWeek) => {
    setCurrentDayState(day);
    try {
      await DatabaseService.saveCurrentDay(day);
    } catch (error) {
      console.error('Error saving current day:', error);
    }
  };

  const getNutritionData = (week: number, day: string): DayNutrition | null => {
    return CSVParser.getDayNutrition(week, day);
  };

  const getWeekNutrition = (week: number): { [day: string]: DayNutrition } => {
    return CSVParser.getWeekNutrition(week);
  };

  const getWorkoutData = (week: number, day: string): WorkoutDay | null => {
    return ExerciseParser.getDayWorkout(week, day);
  };

  const getWeekWorkouts = (week: number): { [day: string]: WorkoutDay } => {
    return ExerciseParser.getWeekWorkouts(week);
  };

  const addWorkoutProgress = async (progress: WorkoutProgress): Promise<void> => {
    try {
      await DatabaseService.addWorkoutProgress(progress);
      const updatedProgress = await DatabaseService.getWorkoutProgress();
      setWorkoutProgress(updatedProgress);
    } catch (error) {
      console.error('Error adding workout progress:', error);
      throw error;
    }
  };

  const getExerciseProgress = (exerciseId: string, day: string, week: number): WorkoutProgress | null => {
    return workoutProgress.find(
      p => p.exerciseId === exerciseId && p.day === day && p.week === week
    ) || null;
  };

  const updateTableColumns = async (columns: TableColumn[]): Promise<void> => {
    try {
      setTableColumns(columns);
      await DatabaseService.saveTableColumns(columns);
    } catch (error) {
      console.error('Error updating table columns:', error);
      throw error;
    }
  };

  const getDaysOfWeek = (): DayOfWeek[] => {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  };

  const getWeeks = (): number[] => {
    return [1, 2];
  };

  const value: DataContextType = {
    currentWeek,
    currentDay,
    setCurrentWeek,
    setCurrentDay,
    getNutritionData,
    getWeekNutrition,
    getWorkoutData,
    getWeekWorkouts,
    workoutProgress,
    addWorkoutProgress,
    getExerciseProgress,
    tableColumns,
    updateTableColumns,
    getDaysOfWeek,
    getWeeks,
    isLoading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};