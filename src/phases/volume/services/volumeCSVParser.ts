import type { VolumeNutritionItem, VolumeDayNutrition, VolumeNutritionTotals } from '../types/volume';

// Import CSV files as text
import semana1LunesCSV from '../../../assets/data/volumen/semana1/semana1_lunes.csv?raw';
import semana1MartesCSV from '../../../assets/data/volumen/semana1/semana1_martes.csv?raw';
import semana1MiercolesCSV from '../../../assets/data/volumen/semana1/semana1_miercoles.csv?raw';
import semana1JuevesCSV from '../../../assets/data/volumen/semana1/semana1_jueves.csv?raw';
import semana1ViernesCSV from '../../../assets/data/volumen/semana1/semana1_viernes.csv?raw';
import semana1SabadoCSV from '../../../assets/data/volumen/semana1/semana1_sabado.csv?raw';
import semana1DomingoCSV from '../../../assets/data/volumen/semana1/semana1_domingo.csv?raw';

import semana2LunesCSV from '../../../assets/data/volumen/semana2/semana2_lunes.csv?raw';
import semana2MartesCSV from '../../../assets/data/volumen/semana2/semana2_martes.csv?raw';
import semana2MiercolesCSV from '../../../assets/data/volumen/semana2/semana2_miercoles.csv?raw';
import semana2JuevesCSV from '../../../assets/data/volumen/semana2/semana2_jueves.csv?raw';
import semana2ViernesCSV from '../../../assets/data/volumen/semana2/semana2_viernes.csv?raw';
import semana2SabadoCSV from '../../../assets/data/volumen/semana2/semana2_sabado.csv?raw';
import semana2DomingoCSV from '../../../assets/data/volumen/semana2/semana2_domingo.csv?raw';

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

export class VolumeCSVParser {
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
    // Remove any unit suffixes and convert to number
    const numericValue = value.replace(/[^0-9.]/g, '');
    return parseFloat(numericValue) || 0;
  }

  private static parseCSVContent(csvContent: string): VolumeNutritionItem[] {
    const lines = csvContent.trim().split('\n');
    const items: VolumeNutritionItem[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Volume CSV has 11 columns: comida,hora,alimento,cantidad,unidad,kcal,proteinas_g,carbohidratos_g,grasas_g,fibra_g,notas
      if (values.length >= 11) {
        items.push({
          comida: values[0],
          hora: values[1],
          alimento: values[2],
          cantidad: values[3],
          unidad: values[4],
          kcal: values[5],
          proteinas_g: values[6],
          carbohidratos_g: values[7],
          grasas_g: values[8],
          fibra_g: values[9],
          notas: values[10],
        });
      }
    }
    
    return items;
  }

  private static calculateTotals(items: VolumeNutritionItem[]): VolumeNutritionTotals {
    const totals = {
      proteinas_g: 0,
      carbohidratos_g: 0,
      grasas_g: 0,
      fibra_g: 0,
      kcal: 0,
      calorias: 0, // For base compatibility
    };

    items.forEach(item => {
      // Skip total rows (usually marked with TOTAL in comida field)
      if (!item.comida.toUpperCase().includes('TOTAL')) {
        totals.proteinas_g += this.parseNutritionValue(item.proteinas_g);
        totals.carbohidratos_g += this.parseNutritionValue(item.carbohidratos_g);
        totals.grasas_g += this.parseNutritionValue(item.grasas_g);
        totals.fibra_g += this.parseNutritionValue(item.fibra_g);
        totals.kcal += this.parseNutritionValue(item.kcal);
      }
    });

    // Set calorias equal to kcal for base compatibility
    totals.calorias = totals.kcal;

    return totals;
  }

  public static getDayNutrition(week: number, day: string): VolumeDayNutrition | null {
    const csvContent = csvData[week]?.[day.toLowerCase()];
    if (!csvContent) {
      console.warn(`No volume data found for week ${week}, day ${day}`);
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

  public static getWeekNutrition(week: number): { [day: string]: VolumeDayNutrition } {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const weekData: { [day: string]: VolumeDayNutrition } = {};

    days.forEach(day => {
      const dayData = this.getDayNutrition(week, day);
      if (dayData) {
        weekData[day] = dayData;
      }
    });

    return weekData;
  }

  public static getAllNutritionData(): { [week: number]: { [day: string]: VolumeDayNutrition } } {
    return {
      1: this.getWeekNutrition(1),
      2: this.getWeekNutrition(2),
    };
  }

  public static getAvailableWeeks(): number[] {
    return Object.keys(csvData).map(Number);
  }

  public static getAvailableDays(week: number): string[] {
    return Object.keys(csvData[week] || {});
  }
}