import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import type { DayOfWeek } from '../../models/types';

interface ShoppingListProps {
  className?: string;
}

type WeekDay = `${number}-${DayOfWeek}`;

export const ShoppingList: React.FC<ShoppingListProps> = ({ className = '' }) => {
  const { getWeekNutrition, getDaysOfWeek, getWeeks } = useData();
  
  const [selectedWeekDays, setSelectedWeekDays] = useState<Set<WeekDay>>(new Set());
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  const weeks = getWeeks();
  const days = getDaysOfWeek();

  const shoppingItems = useMemo(() => {
    const itemMap = new Map<string, { alimento: string; cantidad: number; unidad: string }>();

    selectedWeekDays.forEach(weekDay => {
      const [weekStr, day] = weekDay.split('-') as [string, DayOfWeek];
      const week = parseInt(weekStr);
      
      const weekData = getWeekNutrition(week);
      const dayData = weekData[day];
      if (!dayData) return;

      dayData.meals.forEach(meal => {
        // Skip subtotal and total rows
        if (meal.comida.includes('SUBTOTAL') || meal.comida.includes('TOTALES')) {
          return;
        }

        const alimento = meal.alimento.trim();
        if (!alimento) return;

        // Extract quantity and unit from cantidad field
        const cantidadText = meal.cantidad;
        let cantidad = 1;
        let unidad = 'unidad';

        // Parse cantidad text to extract numeric value and unit
        const cantidadMatch = cantidadText.match(/(\d+(?:\.\d+)?)\s*(.+)/);
        if (cantidadMatch) {
          cantidad = parseFloat(cantidadMatch[1]);
          unidad = cantidadMatch[2].trim();
        } else {
          // Try to extract just the number
          const numberMatch = cantidadText.match(/(\d+(?:\.\d+)?)/);
          if (numberMatch) {
            cantidad = parseFloat(numberMatch[1]);
            unidad = cantidadText.replace(numberMatch[1], '').trim() || 'g';
          }
        }

        // Accumulate quantities for the same item
        if (itemMap.has(alimento)) {
          const existing = itemMap.get(alimento)!;
          // Only add if same unit, otherwise create separate entries
          if (existing.unidad === unidad) {
            existing.cantidad += cantidad;
          } else {
            // Create a unique key for different units
            const uniqueKey = `${alimento} (${unidad})`;
            itemMap.set(uniqueKey, { alimento: uniqueKey, cantidad, unidad });
          }
        } else {
          itemMap.set(alimento, { alimento, cantidad, unidad });
        }
      });
    });

    // Convert map to array and sort
    return Array.from(itemMap.values())
      .sort((a, b) => a.alimento.localeCompare(b.alimento))
      .map(item => ({
        ...item,
        purchased: purchasedItems.has(item.alimento),
      }));
  }, [selectedWeekDays, getWeekNutrition, purchasedItems]);

  const toggleWeekDay = (week: number, day: DayOfWeek) => {
    const weekDay: WeekDay = `${week}-${day}`;
    setSelectedWeekDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekDay)) {
        newSet.delete(weekDay);
      } else {
        newSet.add(weekDay);
      }
      return newSet;
    });
  };

  const isWeekDaySelected = (week: number, day: DayOfWeek): boolean => {
    return selectedWeekDays.has(`${week}-${day}` as WeekDay);
  };

  const toggleItemPurchased = (alimento: string) => {
    setPurchasedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alimento)) {
        newSet.delete(alimento);
      } else {
        newSet.add(alimento);
      }
      return newSet;
    });
  };

  const selectAllWeekDays = () => {
    const allWeekDays = new Set<WeekDay>();
    weeks.forEach(week => {
      days.forEach(day => {
        allWeekDays.add(`${week}-${day}` as WeekDay);
      });
    });
    setSelectedWeekDays(allWeekDays);
  };

  const clearAllWeekDays = () => {
    setSelectedWeekDays(new Set());
  };

  const selectWeek = (week: number) => {
    const weekDays = new Set(selectedWeekDays);
    days.forEach(day => {
      weekDays.add(`${week}-${day}` as WeekDay);
    });
    setSelectedWeekDays(weekDays);
  };

  const clearWeek = (week: number) => {
    const weekDays = new Set(selectedWeekDays);
    days.forEach(day => {
      weekDays.delete(`${week}-${day}` as WeekDay);
    });
    setSelectedWeekDays(weekDays);
  };

  const clearPurchased = () => {
    setPurchasedItems(new Set());
  };

  const dayLabels = {
    lunes: 'Lun',
    martes: 'Mar',
    miercoles: 'Mié',
    jueves: 'Jue',
    viernes: 'Vie',
    sabado: 'Sáb',
    domingo: 'Dom',
  };

  const totalItems = shoppingItems.length;
  const purchasedCount = shoppingItems.filter(item => item.purchased).length;

  return (
    <div className={`${className} bg-white dark:bg-slate-800 rounded-lg shadow`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lista de Compras
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Selecciona los días específicos por semana para generar tu lista de compras
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={selectAllWeekDays}
              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Seleccionar todo
            </button>
            <button
              onClick={clearAllWeekDays}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Limpiar todo
            </button>
          </div>
        </div>

        {/* Week-Day Selection */}
        {weeks.map(week => (
          <div key={week} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Semana {week}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => selectWeek(week)}
                  className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                >
                  Todos
                </button>
                <button
                  onClick={() => clearWeek(week)}
                  className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                >
                  Ninguno
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => (
                <button
                  key={`${week}-${day}`}
                  onClick={() => toggleWeekDay(week, day)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isWeekDaySelected(week, day)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
            
            {/* Selected days indicator */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {days.filter(day => isWeekDaySelected(week, day)).length} días seleccionados
            </div>
          </div>
        ))}

        {/* Shopping List Progress */}
        {totalItems > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progreso de Compras
              </h4>
              <button
                onClick={clearPurchased}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Limpiar
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalItems > 0 ? (purchasedCount / totalItems) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {purchasedCount}/{totalItems}
              </span>
            </div>
          </div>
        )}

        {/* Shopping Items */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Lista de Ingredientes ({totalItems} elementos)
          </h4>
          
          {totalItems === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Selecciona días específicos para generar la lista
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {shoppingItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center p-3 rounded-lg border transition-colors ${
                    item.purchased
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <button
                    onClick={() => toggleItemPurchased(item.alimento)}
                    className="mr-3 focus:outline-none"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      item.purchased
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                    }`}>
                      {item.purchased && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      item.purchased 
                        ? 'text-green-800 dark:text-green-200 line-through' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.alimento}
                    </div>
                    <div className={`text-xs ${
                      item.purchased 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.cantidad} {item.unidad}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};