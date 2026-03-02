import type { DefinicionNutritionItem, DefinicionDayNutrition, DefinicionNutritionTotals } from '../types/definicion';
import { getCSVFolderForWeek, TOTAL_WEEKS } from '../types/definicion';

// Import CSV files — deficit_fase1
import fase1LunesCSV from '../../../assets/data/definicion/deficit_fase1/fase1_lunes.csv?raw';
import fase1MartesCSV from '../../../assets/data/definicion/deficit_fase1/fase1_martes.csv?raw';
import fase1MiercolesCSV from '../../../assets/data/definicion/deficit_fase1/fase1_miercoles.csv?raw';
import fase1JuevesCSV from '../../../assets/data/definicion/deficit_fase1/fase1_jueves.csv?raw';
import fase1ViernesCSV from '../../../assets/data/definicion/deficit_fase1/fase1_viernes.csv?raw';
import fase1SabadoCSV from '../../../assets/data/definicion/deficit_fase1/fase1_sabado.csv?raw';
import fase1DomingoCSV from '../../../assets/data/definicion/deficit_fase1/fase1_domingo.csv?raw';

// Import CSV files — deficit_fase2
import fase2LunesCSV from '../../../assets/data/definicion/deficit_fase2/fase2_lunes.csv?raw';
import fase2MartesCSV from '../../../assets/data/definicion/deficit_fase2/fase2_martes.csv?raw';
import fase2MiercolesCSV from '../../../assets/data/definicion/deficit_fase2/fase2_miercoles.csv?raw';
import fase2JuevesCSV from '../../../assets/data/definicion/deficit_fase2/fase2_jueves.csv?raw';
import fase2ViernesCSV from '../../../assets/data/definicion/deficit_fase2/fase2_viernes.csv?raw';
import fase2SabadoCSV from '../../../assets/data/definicion/deficit_fase2/fase2_sabado.csv?raw';
import fase2DomingoCSV from '../../../assets/data/definicion/deficit_fase2/fase2_domingo.csv?raw';

// Import CSV files — deficit_fase3
import fase3LunesCSV from '../../../assets/data/definicion/deficit_fase3/fase3_lunes.csv?raw';
import fase3MartesCSV from '../../../assets/data/definicion/deficit_fase3/fase3_martes.csv?raw';
import fase3MiercolesCSV from '../../../assets/data/definicion/deficit_fase3/fase3_miercoles.csv?raw';
import fase3JuevesCSV from '../../../assets/data/definicion/deficit_fase3/fase3_jueves.csv?raw';
import fase3ViernesCSV from '../../../assets/data/definicion/deficit_fase3/fase3_viernes.csv?raw';
import fase3SabadoCSV from '../../../assets/data/definicion/deficit_fase3/fase3_sabado.csv?raw';
import fase3DomingoCSV from '../../../assets/data/definicion/deficit_fase3/fase3_domingo.csv?raw';

// Import CSV files — diet_break
import breakLunesCSV from '../../../assets/data/definicion/diet_break/break_lunes.csv?raw';
import breakMartesCSV from '../../../assets/data/definicion/diet_break/break_martes.csv?raw';
import breakMiercolesCSV from '../../../assets/data/definicion/diet_break/break_miercoles.csv?raw';
import breakJuevesCSV from '../../../assets/data/definicion/diet_break/break_jueves.csv?raw';
import breakViernesCSV from '../../../assets/data/definicion/diet_break/break_viernes.csv?raw';
import breakSabadoCSV from '../../../assets/data/definicion/diet_break/break_sabado.csv?raw';
import breakDomingoCSV from '../../../assets/data/definicion/diet_break/break_domingo.csv?raw';

// Map CSV folder → day → raw CSV content
const csvByFolder: { [folder: string]: { [day: string]: string } } = {
  deficit_fase1: {
    lunes: fase1LunesCSV, martes: fase1MartesCSV, miercoles: fase1MiercolesCSV,
    jueves: fase1JuevesCSV, viernes: fase1ViernesCSV, sabado: fase1SabadoCSV, domingo: fase1DomingoCSV,
  },
  deficit_fase2: {
    lunes: fase2LunesCSV, martes: fase2MartesCSV, miercoles: fase2MiercolesCSV,
    jueves: fase2JuevesCSV, viernes: fase2ViernesCSV, sabado: fase2SabadoCSV, domingo: fase2DomingoCSV,
  },
  deficit_fase3: {
    lunes: fase3LunesCSV, martes: fase3MartesCSV, miercoles: fase3MiercolesCSV,
    jueves: fase3JuevesCSV, viernes: fase3ViernesCSV, sabado: fase3SabadoCSV, domingo: fase3DomingoCSV,
  },
  diet_break: {
    lunes: breakLunesCSV, martes: breakMartesCSV, miercoles: breakMiercolesCSV,
    jueves: breakJuevesCSV, viernes: breakViernesCSV, sabado: breakSabadoCSV, domingo: breakDomingoCSV,
  },
};

export class DefinicionCSVParser {
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
    const numericValue = value.replace(/[^0-9.]/g, '');
    return parseFloat(numericValue) || 0;
  }

  private static parseCSVContent(csvContent: string): DefinicionNutritionItem[] {
    const lines = csvContent.trim().split('\n');
    const items: DefinicionNutritionItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
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

  private static calculateTotals(items: DefinicionNutritionItem[]): DefinicionNutritionTotals {
    const totals = {
      proteinas_g: 0,
      carbohidratos_g: 0,
      grasas_g: 0,
      fibra_g: 0,
      kcal: 0,
      calorias: 0,
    };

    items.forEach(item => {
      if (!item.comida.toUpperCase().includes('TOTAL')) {
        totals.proteinas_g += this.parseNutritionValue(item.proteinas_g);
        totals.carbohidratos_g += this.parseNutritionValue(item.carbohidratos_g);
        totals.grasas_g += this.parseNutritionValue(item.grasas_g);
        totals.fibra_g += this.parseNutritionValue(item.fibra_g);
        totals.kcal += this.parseNutritionValue(item.kcal);
      }
    });

    totals.calorias = totals.kcal;
    return totals;
  }

  public static getDayNutrition(week: number, day: string): DefinicionDayNutrition | null {
    const folder = getCSVFolderForWeek(week);
    const csvContent = csvByFolder[folder]?.[day.toLowerCase()];
    if (!csvContent) {
      console.warn(`No definicion data found for week ${week} (folder: ${folder}), day ${day}`);
      return null;
    }

    const meals = this.parseCSVContent(csvContent);
    const totals = this.calculateTotals(meals);
    return { day, meals, totals };
  }

  public static getWeekNutrition(week: number): { [day: string]: DefinicionDayNutrition } {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const weekData: { [day: string]: DefinicionDayNutrition } = {};

    days.forEach(day => {
      const dayData = this.getDayNutrition(week, day);
      if (dayData) weekData[day] = dayData;
    });

    return weekData;
  }

  public static getAllNutritionData(): { [week: number]: { [day: string]: DefinicionDayNutrition } } {
    const allData: { [week: number]: { [day: string]: DefinicionDayNutrition } } = {};
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      allData[w] = this.getWeekNutrition(w);
    }
    return allData;
  }

  public static getAvailableWeeks(): number[] {
    const weeks: number[] = [];
    for (let w = 1; w <= TOTAL_WEEKS; w++) weeks.push(w);
    return weeks;
  }

  public static getAvailableDays(): string[] {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  }
}
