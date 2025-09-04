import React, { createContext, useContext, useEffect, useState } from 'react';
import type { DayNutrition, WorkoutDay, WorkoutProgress, TableColumn, DayOfWeek } from '../types/maintenance';
import { CSVParser } from '../services/csvParser';
import { ExerciseParser } from '../services/exerciseParser';
import { DatabaseService } from '../../../shared/services/databaseService';

interface DataContextType {
  currentWeek: number;
  currentDay: DayOfWeek;
  setCurrentWeek: (week: number) => Promise<void>;
  setCurrentDay: (day: DayOfWeek) => Promise<void>;
  
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
        console.log('🚀 Inicializando datos de la aplicación...');
        
        const shouldMigrate = typeof window !== 'undefined' && 
                             !localStorage.getItem('gym-app-migrated');
        
        if (shouldMigrate) {
          console.log('🔄 Ejecutando migración desde localStorage...');
          await DatabaseService.migrateFromLocalStorage();
        }

        console.log('📱 Cargando configuraciones desde localStorage...');
        const [savedWeek, savedDay, savedProgress, savedColumns] = await Promise.all([
          DatabaseService.getCurrentWeek(),
          DatabaseService.getCurrentDay(),
          DatabaseService.getWorkoutProgress(),
          DatabaseService.getTableColumns(),
        ]);

        console.log('✅ Configuraciones cargadas:', {
          week: savedWeek,
          day: savedDay,
          progressCount: savedProgress.length,
          columnsCount: savedColumns.length
        });

        setCurrentWeekState(savedWeek);
        setCurrentDayState(savedDay as DayOfWeek);
        setWorkoutProgress(savedProgress);
        setTableColumns(savedColumns);
        
        await DatabaseService.initializeTheme();
        console.log('🎨 Tema inicializado');
      } catch (error) {
        console.error('❌ Error inicializando datos:', error);
      } finally {
        setIsLoading(false);
        console.log('✅ Inicialización completada');
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Página visible de nuevo - recargando configuración...');
        const loadState = async () => {
          try {
            const [savedWeek, savedDay] = await Promise.all([
              DatabaseService.getCurrentWeek(),
              DatabaseService.getCurrentDay(),
            ]);
            
            console.log('🔄 Estado recargado:', { week: savedWeek, day: savedDay });
            setCurrentWeekState(savedWeek);
            setCurrentDayState(savedDay as DayOfWeek);
          } catch (error) {
            console.error('❌ Error recargando estado:', error);
          }
        };
        loadState();
      }
    };

    const handleBeforeUnload = () => {
      console.log('💾 Guardando estado antes de salir...');
      if (typeof window !== 'undefined') {
        localStorage.setItem('gym-app-last-week', currentWeek.toString());
        localStorage.setItem('gym-app-last-day', currentDay);
      }
    };

    initializeData();
    
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentWeek, currentDay]);

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