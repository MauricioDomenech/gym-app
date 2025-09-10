import type { VolumeExercise, VolumeWorkoutDay, VolumePlan } from '../types/volume';

// Import JSON file as text and parse it
import planVolumenJSON from '../../../assets/data/volumen/plan_volumen.json';

export class VolumeExerciseParser {
  private static generateExerciseId(name: string, day: string, isAlternative: boolean = false, alternativeIndex?: number): string {
    const baseId = `${day}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    return isAlternative ? `${baseId}-alt-${alternativeIndex}` : baseId;
  }

  private static parsePlanData(): VolumePlan {
    try {
      // If imported as JSON, use directly; otherwise parse as string
      const planData = typeof planVolumenJSON === 'string' ? JSON.parse(planVolumenJSON) : planVolumenJSON;
      return planData as VolumePlan;
    } catch (error) {
      console.error('Error parsing volume plan JSON:', error);
      return { plan: [] };
    }
  }

  private static mapRawExerciseToVolumeExercise(rawExercise: any, day: string): VolumeExercise {
    // Generate main exercise ID
    const mainId = this.generateExerciseId(rawExercise.nombre, day);

    // Process alternatives if they exist
    const alternativas = rawExercise.alternativas?.map((alt: any) => ({
      nombre: alt.nombre,
      imagen: alt.imagen,
    })) || [];

    return {
      id: mainId,
      name: rawExercise.nombre,
      series: rawExercise.series,
      repeticiones: rawExercise.repeticiones,
      imagen: rawExercise.imagen,
      alternativas,
    };
  }

  public static getDayWorkout(day: string): VolumeWorkoutDay | null {
    try {
      const planData = this.parsePlanData();
      
      // Find the day in the plan
      const dayData = planData.plan.find((d: any) => 
        d.dia.toLowerCase() === day.toLowerCase()
      );

      if (!dayData) {
        console.warn(`No volume workout data found for day ${day}`);
        return null;
      }

      // Map exercises
      const exercises = (dayData as any).ejercicios.map((exercise: any) => 
        this.mapRawExerciseToVolumeExercise(exercise, day)
      );

      return {
        day: dayData.dia,
        orden: dayData.orden,
        dia: dayData.dia,
        musculos: dayData.musculos,
        exercises,
        type: dayData.musculos, // Use muscle groups as type
      };
    } catch (error) {
      console.error(`Error parsing workout data for day ${day}:`, error);
      return null;
    }
  }

  public static getWeekWorkouts(): { [day: string]: VolumeWorkoutDay } {
    const weekWorkouts: { [day: string]: VolumeWorkoutDay } = {};
    
    try {
      const planData = this.parsePlanData();
      
      // Process each day in the plan
      planData.plan.forEach((dayData: any) => {
        const dayKey = dayData.dia.toLowerCase();
        const exercises = dayData.ejercicios.map((exercise: any) => 
          this.mapRawExerciseToVolumeExercise(exercise, dayKey)
        );

        weekWorkouts[dayKey] = {
          day: dayData.dia,
          orden: dayData.orden,
          dia: dayData.dia,
          musculos: dayData.musculos,
          exercises,
          type: dayData.musculos,
        };
      });
    } catch (error) {
      console.error('Error parsing week workouts:', error);
    }

    return weekWorkouts;
  }

  public static getAllWorkoutData(): { [week: number]: { [day: string]: VolumeWorkoutDay } } {
    // Volume plan appears to be the same for both weeks based on the JSON structure
    // If you need different plans per week, you'd need separate JSON files
    const weekWorkouts = this.getWeekWorkouts();
    
    return {
      1: weekWorkouts,
      2: weekWorkouts, // Same plan for both weeks - modify if you have separate data
    };
  }

  public static getAvailableDays(): string[] {
    try {
      const planData = this.parsePlanData();
      return planData.plan.map(day => day.dia.toLowerCase()).sort((a, b) => {
        const order = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        return order.indexOf(a) - order.indexOf(b);
      });
    } catch (error) {
      console.error('Error getting available days:', error);
      return [];
    }
  }

  public static getExerciseById(exerciseId: string, day: string): VolumeExercise | null {
    try {
      const dayWorkout = this.getDayWorkout(day);
      if (!dayWorkout) return null;

      return dayWorkout.exercises.find(exercise => exercise.id === exerciseId) || null;
    } catch (error) {
      console.error(`Error getting exercise ${exerciseId} for day ${day}:`, error);
      return null;
    }
  }

  public static getAlternativeById(exerciseId: string, day: string, alternativeIndex: number): VolumeExercise | null {
    try {
      const exercise = this.getExerciseById(exerciseId, day);
      if (!exercise || !exercise.alternativas[alternativeIndex]) return null;

      const alternative = exercise.alternativas[alternativeIndex];
      
      // Create a VolumeExercise object for the alternative
      return {
        id: this.generateExerciseId(alternative.nombre, day, true, alternativeIndex),
        name: alternative.nombre,
        series: exercise.series, // Inherit series from main exercise
        repeticiones: exercise.repeticiones, // Inherit reps from main exercise
        imagen: alternative.imagen,
        alternativas: [], // Alternatives don't have their own alternatives
      };
    } catch (error) {
      console.error(`Error getting alternative ${alternativeIndex} for exercise ${exerciseId} on day ${day}:`, error);
      return null;
    }
  }

  public static searchExercises(query: string): VolumeExercise[] {
    try {
      const weekWorkouts = this.getWeekWorkouts();
      const allExercises: VolumeExercise[] = [];

      // Collect all exercises from all days
      Object.values(weekWorkouts).forEach(dayWorkout => {
        allExercises.push(...dayWorkout.exercises);
      });

      // Filter by query
      const lowerQuery = query.toLowerCase();
      return allExercises.filter(exercise => 
        exercise.name.toLowerCase().includes(lowerQuery) ||
        exercise.alternativas.some(alt => alt.nombre.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      console.error(`Error searching exercises with query "${query}":`, error);
      return [];
    }
  }
}