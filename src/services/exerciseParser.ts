import type { Exercise, WorkoutDay } from '../models/types';

// Import markdown files as text
import semana1MD from '../assets/data/semana1/Plan Integral Entrenamiento y Nutrición - Semana 1.md?raw';
import semana2MD from '../assets/data/semana2/Plan Integral Entrenamiento y Nutrición - Semana 2.md?raw';

const markdownData: { [week: number]: string } = {
  1: semana1MD,
  2: semana2MD,
};

// Workout types mapping for each day
const workoutTypes: { [day: string]: string } = {
  lunes: 'Empuje (Pecho, Hombros, Tríceps)',
  martes: 'Cardio HIIT + Core',
  miercoles: 'Tirón (Espalda, Bíceps)',
  jueves: 'Cardio Moderado + Movilidad',
  viernes: 'Piernas (Cuádriceps, Glúteos, Isquios)',
  sabado: 'Cardio + Accesorios',
  domingo: 'Descanso activo',
};

export class ExerciseParser {
  private static generateExerciseId(name: string, day: string): string {
    return `${day}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }


  private static extractDayExercises(content: string, day: string): Exercise[] {
    const lines = content.split('\n');
    const exercises: Exercise[] = [];
    
    // Find the section for the specific day
    const dayHeaders = {
      lunes: 'LUNES - EMPUJE',
      martes: 'MARTES - CARDIO HIIT + CORE',
      miercoles: 'MIÉRCOLES - TIRÓN',
      jueves: 'JUEVES - CARDIO MODERADO + MOVILIDAD',
      viernes: 'VIERNES - PIERNAS',
      sabado: 'SÁBADO - CARDIO + ACCESORIOS',
      domingo: 'DOMINGO - DESCANSO',
    };

    const header = dayHeaders[day.toLowerCase() as keyof typeof dayHeaders];
    if (!header) return exercises;

    let inSection = false;
    let inExerciseList = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      // Check if we're starting the day section
      if (trimmedLine.includes(header)) {
        inSection = true;
        continue;
      }
      
      // Check if we're in the exercise subsection
      if (inSection && trimmedLine === '### ENTRENAMIENTO') {
        inExerciseList = true;
        continue;
      }
      
      // If we hit another ### section, we're done with exercises
      if (inSection && inExerciseList && trimmedLine.startsWith('###') && trimmedLine !== '### ENTRENAMIENTO') {
        break;
      }
      
      // If we hit another day section, we're done
      if (inSection && trimmedLine.includes('##') && !trimmedLine.includes(header)) {
        break;
      }
      
      if (inSection && inExerciseList && trimmedLine) {
        // Handle specific exercise patterns by day
        if (day === 'martes') {
          exercises.push(...this.parseMartes(lines, i));
        } else if (day === 'jueves') {
          exercises.push(...this.parseJueves(lines, i));
        } else if (day === 'sabado') {
          exercises.push(...this.parseSabado(lines, i));
        } else {
          // Handle regular numbered exercises (1. **Exercise name** - 3x12)
          const exerciseWithSetsMatch = trimmedLine.match(/^\d+\.\s*\*\*([^*]+)\*\*\s*-\s*(\d+)x(\d+)/);
          if (exerciseWithSetsMatch) {
            const [, name, sets, reps] = exerciseWithSetsMatch;
            exercises.push({
              id: this.generateExerciseId(name.trim(), day),
              name: name.trim(),
              sets: parseInt(sets),
              reps: parseInt(reps),
            });
          }
        }
      }
    }

    // Remove duplicates and return unique exercises
    const uniqueExercises = exercises.filter((exercise, index, self) => 
      index === self.findIndex(e => e.id === exercise.id)
    );
    
    return uniqueExercises;
  }

  private static parseMartes(lines: string[], startIndex: number): Exercise[] {
    const exercises: Exercise[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another section
      if (line.startsWith('###') && line !== '### ENTRENAMIENTO') break;
      if (line.includes('##') && !line.includes('MARTES')) break;
      
      // Calentamiento
      if (line.includes('**Calentamiento:**')) {
        exercises.push({
          id: this.generateExerciseId('Calentamiento', 'martes'),
          name: 'Calentamiento',
          sets: 1,
          reps: 0,
          notes: '5 min caminata',
        });
      }
      
      // HIIT en cinta
      if (line.includes('**HIIT en cinta:**')) {
        exercises.push({
          id: this.generateExerciseId('HIIT en cinta', 'martes'),
          name: 'HIIT en cinta',
          sets: 1,
          reps: 0,
          notes: '10 intervalos de 45seg sprint (85-90% FCmax) + 75seg caminata. Total: 20 minutos',
        });
      }
      
      // Core exercises (no weight tracking, just completion)
      if (line.includes('Rueda abdominal') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Rueda abdominal', 'martes'),
          name: 'Rueda abdominal',
          sets: 1,
          reps: 0,
          notes: '3x12 repeticiones',
        });
      }
      
      if (line.includes('Crunches bicicleta') && line.includes('3x20')) {
        exercises.push({
          id: this.generateExerciseId('Crunches bicicleta', 'martes'),
          name: 'Crunches bicicleta',
          sets: 1,
          reps: 0,
          notes: '3x20 repeticiones',
        });
      }
      
      if (line.includes('Elevaciones piernas') && line.includes('3x15')) {
        exercises.push({
          id: this.generateExerciseId('Elevaciones piernas', 'martes'),
          name: 'Elevaciones piernas',
          sets: 1,
          reps: 0,
          notes: '3x15 repeticiones',
        });
      }
      
      // Enfriamiento
      if (line.includes('**Enfriamiento:**')) {
        exercises.push({
          id: this.generateExerciseId('Enfriamiento', 'martes'),
          name: 'Enfriamiento',
          sets: 1,
          reps: 0,
          notes: '5 min caminata',
        });
      }
    }
    
    return exercises;
  }

  private static parseJueves(lines: string[], startIndex: number): Exercise[] {
    const exercises: Exercise[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another section
      if (line.startsWith('###') && line !== '### ENTRENAMIENTO') break;
      if (line.includes('##') && !line.includes('JUEVES')) break;
      
      // Cardio
      if (line.includes('**Cardio:**')) {
        exercises.push({
          id: this.generateExerciseId('Cardio', 'jueves'),
          name: 'Cardio',
          sets: 1,
          reps: 0,
          notes: '45 min caminata inclinada (8-10% inclinación, 5-6 km/h)',
        });
      }
      
      // Mobility exercises
      if (line.includes('Estiramientos dinámicos') && line.includes('10 min')) {
        exercises.push({
          id: this.generateExerciseId('Estiramientos dinámicos', 'jueves'),
          name: 'Estiramientos dinámicos',
          sets: 1,
          reps: 0,
          notes: '10 min',
        });
      }
      
      if (line.includes('Foam rolling') && line.includes('10 min')) {
        exercises.push({
          id: this.generateExerciseId('Foam rolling', 'jueves'),
          name: 'Foam rolling',
          sets: 1,
          reps: 0,
          notes: '10 min',
        });
      }
      
      if (line.includes('Estiramientos estáticos') && line.includes('10 min')) {
        exercises.push({
          id: this.generateExerciseId('Estiramientos estáticos', 'jueves'),
          name: 'Estiramientos estáticos',
          sets: 1,
          reps: 0,
          notes: '10 min',
        });
      }
    }
    
    return exercises;
  }

  private static parseSabado(lines: string[], startIndex: number): Exercise[] {
    const exercises: Exercise[] = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another section
      if (line.startsWith('###') && line !== '### ENTRENAMIENTO') break;
      if (line.includes('##') && !line.includes('SÁBADO')) break;
      
      // Cardio
      if (line.includes('**Cardio:**')) {
        exercises.push({
          id: this.generateExerciseId('Cardio', 'sabado'),
          name: 'Cardio',
          sets: 1,
          reps: 0,
          notes: '35 min cardio mixto (15 min cinta inclinada + 20 min elíptica o bici)',
        });
      }
      
      // Accessory exercises
      if (line.includes('**Abductor en máquina**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Abductor en máquina', 'sabado'),
          name: 'Abductor en máquina',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Aductor en máquina**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Aductor en máquina', 'sabado'),
          name: 'Aductor en máquina',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Farmer Walk**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Farmer Walk', 'sabado'),
          name: 'Farmer Walk',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Triceps OverHead**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Triceps OverHead', 'sabado'),
          name: 'Triceps OverHead',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Bayesian bíceps**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Bayesian bíceps', 'sabado'),
          name: 'Bayesian bíceps',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Triceps mancuerna o barra Z**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Triceps mancuerna o barra Z', 'sabado'),
          name: 'Triceps mancuerna o barra Z',
          sets: 3,
          reps: 12,
        });
      }
      
      if (line.includes('**Elevación lateral en máquina**') && line.includes('3x12')) {
        exercises.push({
          id: this.generateExerciseId('Elevación lateral en máquina', 'sabado'),
          name: 'Elevación lateral en máquina',
          sets: 3,
          reps: 12,
        });
      }
    }
    
    return exercises;
  }

  public static getDayWorkout(week: number, day: string): WorkoutDay | null {
    const content = markdownData[week];
    if (!content) {
      console.warn(`No workout data found for week ${week}`);
      return null;
    }

    const exercises = this.extractDayExercises(content, day);
    const workoutType = workoutTypes[day.toLowerCase()] || 'Entrenamiento';

    return {
      day,
      exercises,
      type: workoutType,
    };
  }

  public static getWeekWorkouts(week: number): { [day: string]: WorkoutDay } {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const weekWorkouts: { [day: string]: WorkoutDay } = {};

    days.forEach(day => {
      const workout = this.getDayWorkout(week, day);
      if (workout) {
        weekWorkouts[day] = workout;
      }
    });

    return weekWorkouts;
  }

  public static getAllWorkoutData(): { [week: number]: { [day: string]: WorkoutDay } } {
    return {
      1: this.getWeekWorkouts(1),
      2: this.getWeekWorkouts(2),
    };
  }
}