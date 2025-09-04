import type { NutritionItem, DayNutrition, NutritionTotals } from '../types/maintenance';

// Import CSV files as text
import semana1LunesCSV from '../../../assets/data/mantenimiento/semana1/lunes.csv?raw';
import semana1MartesCSV from '../../../assets/data/mantenimiento/semana1/martes.csv?raw';
import semana1MiercolesCSV from '../../../assets/data/mantenimiento/semana1/miercoles.csv?raw';
import semana1JuevesCSV from '../../../assets/data/mantenimiento/semana1/jueves.csv?raw';
import semana1ViernesCSV from '../../../assets/data/mantenimiento/semana1/viernes.csv?raw';
import semana1SabadoCSV from '../../../assets/data/mantenimiento/semana1/sabado.csv?raw';
import semana1DomingoCSV from '../../../assets/data/mantenimiento/semana1/domingo.csv?raw';

import semana2LunesCSV from '../../../assets/data/mantenimiento/semana2/lunes.csv?raw';
import semana2MartesCSV from '../../../assets/data/mantenimiento/semana2/martes.csv?raw';
import semana2MiercolesCSV from '../../../assets/data/mantenimiento/semana2/miercoles.csv?raw';
import semana2JuevesCSV from '../../../assets/data/mantenimiento/semana2/jueves.csv?raw';
import semana2ViernesCSV from '../../../assets/data/mantenimiento/semana2/viernes.csv?raw';
import semana2SabadoCSV from '../../../assets/data/mantenimiento/semana2/sabado.csv?raw';
import semana2DomingoCSV from '../../../assets/data/mantenimiento/semana2/domingo.csv?raw';

// CSV data mapping
const csvData: { [week: number]: { [day: string]: string } } = {
  1: {
    lunes: semana1LunesCSV,
    martes: semana1MartesCSV,
    miercoles: semana1MiercolesCSV,
    jueves: semana1JuevesCSV,
    viernes: semana1ViernesCSV,
    sabado: semana1SabadoCSV,
    domingo: semana1DomingoCSV,
  },
  2: {
    lunes: semana2LunesCSV,
    martes: semana2MartesCSV,
    miercoles: semana2MiercolesCSV,
    jueves: semana2JuevesCSV,
    viernes: semana2ViernesCSV,
    sabado: semana2SabadoCSV,
    domingo: semana2DomingoCSV,
  },
};

export class CSVParser {
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private static parseNutritionValue(value: string): number {
    // Remove 'g' suffix and convert to number
    const numericValue = value.replace(/[^0-9.]/g, '');
    return parseFloat(numericValue) || 0;
  }

  private static parseCSVContent(csvContent: string): NutritionItem[] {
    const lines = csvContent.trim().split('\n');
    const items: NutritionItem[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length >= 8) {
        items.push({
          comida: values[0],
          alimento: values[1],
          cantidad: values[2],
          proteinas: values[3],
          grasas: values[4],
          carbs: values[5],
          fibra: values[6],
          calorias: values[7],
        });
      }
    }
    
    return items;
  }

  private static calculateTotals(items: NutritionItem[]): NutritionTotals {
    const totals = {
      proteinas: 0,
      grasas: 0,
      carbs: 0,
      fibra: 0,
      calorias: 0,
    };

    items.forEach(item => {
      // Only count items that are not subtotals or totals
      if (!item.comida.includes('SUBTOTAL') && !item.comida.includes('TOTALES')) {
        totals.proteinas += this.parseNutritionValue(item.proteinas);
        totals.grasas += this.parseNutritionValue(item.grasas);
        totals.carbs += this.parseNutritionValue(item.carbs);
        totals.fibra += this.parseNutritionValue(item.fibra);
        totals.calorias += this.parseNutritionValue(item.calorias);
      }
    });

    return totals;
  }

  public static getDayNutrition(week: number, day: string): DayNutrition | null {
    const csvContent = csvData[week]?.[day.toLowerCase()];
    if (!csvContent) {
      console.warn(`No data found for week ${week}, day ${day}`);
      return null;
    }

    const meals = this.parseCSVContent(csvContent);
    const totals = this.calculateTotals(meals);

    return {
      day,
      meals,
      totals,
    };
  }

  public static getWeekNutrition(week: number): { [day: string]: DayNutrition } {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const weekData: { [day: string]: DayNutrition } = {};

    days.forEach(day => {
      const dayData = this.getDayNutrition(week, day);
      if (dayData) {
        weekData[day] = dayData;
      }
    });

    return weekData;
  }

  public static getAllNutritionData(): { [week: number]: { [day: string]: DayNutrition } } {
    return {
      1: this.getWeekNutrition(1),
      2: this.getWeekNutrition(2),
    };
  }
}