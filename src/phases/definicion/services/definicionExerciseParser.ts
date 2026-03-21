import type { DefinicionExercise, DefinicionWorkoutDay, DefinicionPlan, DefinicionCardioConfig } from '../types/definicion';

import planDefinicionJSON from '../../../assets/data/definicion/plan_definicion.json';

export class DefinicionExerciseParser {
  private static normalizeString(str: string): string {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private static generateExerciseId(name: string, day: string, isAlternative: boolean = false, alternativeIndex?: number): string {
    const baseId = `${day}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    return isAlternative ? `${baseId}-alt-${alternativeIndex}` : baseId;
  }

  private static parsePlanData(): DefinicionPlan {
    try {
      const planData = typeof planDefinicionJSON === 'string' ? JSON.parse(planDefinicionJSON) : planDefinicionJSON;
      return planData as DefinicionPlan;
    } catch (error) {
      console.error('Error parsing definicion plan JSON:', error);
      return { plan: [], cardio: {} };
    }
  }

  private static mapRawExercise(rawExercise: any, day: string): DefinicionExercise {
    const mainId = this.generateExerciseId(rawExercise.nombre, day);
    const alternativas = rawExercise.alternativas?.map((alt: any) => ({
      nombre: alt.nombre,
      imagen: alt.imagen,
    })) || [];

    return {
      id: mainId,
      name: rawExercise.nombre,
      series: rawExercise.series,
      repeticiones: rawExercise.repeticiones,
      descanso: rawExercise.descanso || '60 seg',
      imagen: rawExercise.imagen,
      alternativas,
    };
  }

  public static getDayWorkout(day: string): DefinicionWorkoutDay | null {
    try {
      const planData = this.parsePlanData();
      const dayData = planData.plan.find((d: any) =>
        this.normalizeString(d.dia) === this.normalizeString(day)
      );

      if (!dayData) return null;

      const exercises = dayData.ejercicios.map((exercise: any) =>
        this.mapRawExercise(exercise, this.normalizeString(day))
      );

      return {
        day: dayData.dia,
        orden: dayData.orden,
        dia: dayData.dia,
        tipo: dayData.tipo,
        musculos: dayData.musculos,
        exercises,
        type: dayData.tipo,
      };
    } catch (error) {
      console.error(`Error parsing definicion workout data for day ${day}:`, error);
      return null;
    }
  }

  public static getWeekWorkouts(): { [day: string]: DefinicionWorkoutDay } {
    const weekWorkouts: { [day: string]: DefinicionWorkoutDay } = {};

    try {
      const planData = this.parsePlanData();

      planData.plan.forEach((dayData: any) => {
        const dayKey = this.normalizeString(dayData.dia);
        const exercises = dayData.ejercicios.map((exercise: any) =>
          this.mapRawExercise(exercise, dayKey)
        );

        weekWorkouts[dayKey] = {
          day: dayData.dia,
          orden: dayData.orden,
          dia: dayData.dia,
          tipo: dayData.tipo,
          musculos: dayData.musculos,
          exercises,
          type: dayData.tipo,
        };
      });
    } catch (error) {
      console.error('Error parsing definicion week workouts:', error);
    }

    return weekWorkouts;
  }

  public static getAllWorkoutData(): { [week: number]: { [day: string]: DefinicionWorkoutDay } } {
    // Same exercises for all 22 weeks
    const weekWorkouts = this.getWeekWorkouts();
    const allData: { [week: number]: { [day: string]: DefinicionWorkoutDay } } = {};
    for (let w = 1; w <= 22; w++) {
      allData[w] = weekWorkouts;
    }
    return allData;
  }

  public static getAvailableDays(): string[] {
    try {
      const planData = this.parsePlanData();
      return planData.plan.map(day => this.normalizeString(day.dia)).sort((a, b) => {
        const order = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        return order.indexOf(a) - order.indexOf(b);
      });
    } catch (error) {
      console.error('Error getting definicion available days:', error);
      return [];
    }
  }

  public static getCardioConfig(day: string): DefinicionCardioConfig | null {
    try {
      const planData = this.parsePlanData();
      const config = planData.cardio[day.toLowerCase()];
      if (!config) return null;
      return config as DefinicionCardioConfig;
    } catch (error) {
      console.error(`Error getting cardio config for ${day}:`, error);
      return null;
    }
  }

  public static getAllCardioConfig(): { [day: string]: DefinicionCardioConfig | null } {
    try {
      const planData = this.parsePlanData();
      return planData.cardio as { [day: string]: DefinicionCardioConfig | null };
    } catch (error) {
      console.error('Error getting all cardio config:', error);
      return {};
    }
  }

  public static getExerciseById(exerciseId: string, day: string): DefinicionExercise | null {
    try {
      const dayWorkout = this.getDayWorkout(day);
      if (!dayWorkout) return null;
      return dayWorkout.exercises.find(e => e.id === exerciseId) || null;
    } catch (error) {
      console.error(`Error getting exercise ${exerciseId} for day ${day}:`, error);
      return null;
    }
  }

  public static getAlternativeById(exerciseId: string, day: string, alternativeIndex: number): DefinicionExercise | null {
    try {
      const exercise = this.getExerciseById(exerciseId, day);
      if (!exercise || !exercise.alternativas[alternativeIndex]) return null;

      const alt = exercise.alternativas[alternativeIndex];
      return {
        id: this.generateExerciseId(alt.nombre, day, true, alternativeIndex),
        name: alt.nombre,
        series: exercise.series,
        repeticiones: exercise.repeticiones,
        descanso: exercise.descanso,
        imagen: alt.imagen,
        alternativas: [],
      };
    } catch (error) {
      console.error(`Error getting alternative ${alternativeIndex} for exercise ${exerciseId}:`, error);
      return null;
    }
  }
}
