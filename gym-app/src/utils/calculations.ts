import type { NutritionTotals, WeeklySummary, DayNutrition } from '../models/types';

export class NutritionCalculations {
  /**
   * Calculate weekly totals from daily nutrition data
   */
  static calculateWeeklySummary(weekNutrition: { [day: string]: DayNutrition }): WeeklySummary {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const totalsByDay: { [day: string]: NutritionTotals } = {};
    
    const weeklyTotals: NutritionTotals = {
      proteinas: 0,
      grasas: 0,
      carbs: 0,
      fibra: 0,
      calorias: 0,
    };

    // Calculate totals for each day
    days.forEach(day => {
      const dayData = weekNutrition[day];
      if (dayData) {
        totalsByDay[day] = dayData.totals;
        weeklyTotals.proteinas += dayData.totals.proteinas;
        weeklyTotals.grasas += dayData.totals.grasas;
        weeklyTotals.carbs += dayData.totals.carbs;
        weeklyTotals.fibra += dayData.totals.fibra;
        weeklyTotals.calorias += dayData.totals.calorias;
      } else {
        totalsByDay[day] = {
          proteinas: 0,
          grasas: 0,
          carbs: 0,
          fibra: 0,
          calorias: 0,
        };
      }
    });

    // Calculate daily averages
    const daysWithData = days.filter(day => weekNutrition[day]).length;
    const averageDaily: NutritionTotals = {
      proteinas: daysWithData ? weeklyTotals.proteinas / daysWithData : 0,
      grasas: daysWithData ? weeklyTotals.grasas / daysWithData : 0,
      carbs: daysWithData ? weeklyTotals.carbs / daysWithData : 0,
      fibra: daysWithData ? weeklyTotals.fibra / daysWithData : 0,
      calorias: daysWithData ? weeklyTotals.calorias / daysWithData : 0,
    };

    return {
      week: 1, // This will be set by the caller
      totalsByDay,
      weeklyTotals,
      averageDaily,
    };
  }

  /**
   * Calculate combined summary for multiple weeks
   */
  static calculateCombinedSummary(week1: WeeklySummary, week2: WeeklySummary): WeeklySummary {
    const combinedTotals: NutritionTotals = {
      proteinas: week1.weeklyTotals.proteinas + week2.weeklyTotals.proteinas,
      grasas: week1.weeklyTotals.grasas + week2.weeklyTotals.grasas,
      carbs: week1.weeklyTotals.carbs + week2.weeklyTotals.carbs,
      fibra: week1.weeklyTotals.fibra + week2.weeklyTotals.fibra,
      calorias: week1.weeklyTotals.calorias + week2.weeklyTotals.calorias,
    };

    const combinedAverage: NutritionTotals = {
      proteinas: (week1.averageDaily.proteinas + week2.averageDaily.proteinas) / 2,
      grasas: (week1.averageDaily.grasas + week2.averageDaily.grasas) / 2,
      carbs: (week1.averageDaily.carbs + week2.averageDaily.carbs) / 2,
      fibra: (week1.averageDaily.fibra + week2.averageDaily.fibra) / 2,
      calorias: (week1.averageDaily.calorias + week2.averageDaily.calorias) / 2,
    };

    // Combine daily totals
    const combinedDailyTotals: { [day: string]: NutritionTotals } = {};
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    
    days.forEach(day => {
      const week1Day = week1.totalsByDay[day] || { proteinas: 0, grasas: 0, carbs: 0, fibra: 0, calorias: 0 };
      const week2Day = week2.totalsByDay[day] || { proteinas: 0, grasas: 0, carbs: 0, fibra: 0, calorias: 0 };
      
      combinedDailyTotals[day] = {
        proteinas: week1Day.proteinas + week2Day.proteinas,
        grasas: week1Day.grasas + week2Day.grasas,
        carbs: week1Day.carbs + week2Day.carbs,
        fibra: week1Day.fibra + week2Day.fibra,
        calorias: week1Day.calorias + week2Day.calorias,
      };
    });

    return {
      week: 0, // Combined summary
      totalsByDay: combinedDailyTotals,
      weeklyTotals: combinedTotals,
      averageDaily: combinedAverage,
    };
  }

  /**
   * Get nutrition goals and calculate progress
   */
  static calculateGoalProgress(totals: NutritionTotals): {
    protein: { current: number; goal: number; percentage: number };
    calories: { current: number; goal: number; percentage: number };
  } {
    const PROTEIN_GOAL = 195; // 2g/kg for 96kg person
    const CALORIE_GOAL = 1450; // Target calories

    return {
      protein: {
        current: totals.proteinas,
        goal: PROTEIN_GOAL,
        percentage: (totals.proteinas / PROTEIN_GOAL) * 100,
      },
      calories: {
        current: totals.calorias,
        goal: CALORIE_GOAL,
        percentage: (totals.calorias / CALORIE_GOAL) * 100,
      },
    };
  }

  /**
   * Format nutrition value for display
   */
  static formatNutritionValue(value: number, unit: string = 'g'): string {
    if (unit === 'g') {
      return `${value.toFixed(1)}g`;
    } else if (unit === 'cal') {
      return `${Math.round(value)}`;
    }
    return `${value.toFixed(1)}${unit}`;
  }

  /**
   * Get color class based on goal achievement
   */
  static getProgressColor(percentage: number): string {
    if (percentage >= 95 && percentage <= 105) {
      return 'text-green-600 dark:text-green-400';
    } else if (percentage >= 85 && percentage <= 115) {
      return 'text-yellow-600 dark:text-yellow-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  }
}