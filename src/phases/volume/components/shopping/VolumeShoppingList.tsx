import React, { useState } from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';
import type { VolumeShoppingItem } from '../../types/volume';

export const VolumeShoppingList: React.FC = () => {
  const { nutritionData, addShoppingList, shoppingLists } = useVolumeData();
  
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([1]);
  const [selectedDays, setSelectedDays] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']);
  const [generatedItems, setGeneratedItems] = useState<VolumeShoppingItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableWeeks = [1, 2];
  const availableDays = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
  ];

  const handleWeekToggle = (week: number) => {
    setSelectedWeeks(prev => 
      prev.includes(week) 
        ? prev.filter(w => w !== week)
        : [...prev, week]
    );
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const generateShoppingList = () => {
    if (selectedWeeks.length === 0 || selectedDays.length === 0) {
      alert('Por favor, selecciona al menos una semana y un día.');
      return;
    }

    setIsGenerating(true);

    try {
      const itemsMap = new Map<string, VolumeShoppingItem>();

      selectedWeeks.forEach(week => {
        selectedDays.forEach(day => {
          const dayNutrition = nutritionData[week]?.[day];
          if (dayNutrition) {
            dayNutrition.meals.forEach(meal => {
              // Skip total rows
              if (meal.comida.toUpperCase().includes('TOTAL')) {
                return;
              }

              const key = `${meal.alimento}-${meal.unidad}`;
              const cantidad = parseFloat(meal.cantidad) || 0;

              if (cantidad > 0) {
                if (itemsMap.has(key)) {
                  const existing = itemsMap.get(key)!;
                  existing.cantidad += cantidad;
                } else {
                  itemsMap.set(key, {
                    alimento: meal.alimento,
                    cantidad: cantidad,
                    unidad: meal.unidad,
                    purchased: false,
                  });
                }
              }
            });
          }
        });
      });

      const items = Array.from(itemsMap.values()).sort((a, b) => 
        a.alimento.localeCompare(b.alimento)
      );

      setGeneratedItems(items);
    } catch (error) {
      console.error('Error generating volume shopping list:', error);
      alert('Error al generar la lista de compras.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveShoppingList = async () => {
    if (generatedItems.length === 0) {
      alert('No hay elementos en la lista para guardar.');
      return;
    }

    try {
      await addShoppingList({
        selectedWeeks,
        selectedDays,
        items: generatedItems,
        generatedDate: new Date().toISOString(),
      });

      alert('Lista de compras guardada exitosamente.');
      setGeneratedItems([]);
    } catch (error) {
      console.error('Error saving volume shopping list:', error);
      alert('Error al guardar la lista de compras.');
    }
  };

  const toggleItemPurchased = (index: number) => {
    setGeneratedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, purchased: !item.purchased } : item
      )
    );
  };

  const getTotalItems = () => generatedItems.length;
  const getPurchasedItems = () => generatedItems.filter(item => item.purchased).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="text-red-600 dark:text-red-400">🛒</span>
          Lista de Compras - Volumen
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Genera listas de compras basadas en tu plan nutricional de volumen
        </p>
      </div>

      {/* Generator */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generar Nueva Lista
        </h3>

        {/* Week Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar Semanas:
          </label>
          <div className="flex gap-2">
            {availableWeeks.map(week => (
              <label key={week} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedWeeks.includes(week)}
                  onChange={() => handleWeekToggle(week)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-slate-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Semana {week}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Day Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar Días:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {availableDays.map(day => (
              <label key={day.key} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day.key)}
                  onChange={() => handleDayToggle(day.key)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-slate-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {day.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateShoppingList}
          disabled={isGenerating || selectedWeeks.length === 0 || selectedDays.length === 0}
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generando...' : 'Generar Lista de Compras'}
        </button>
      </div>

      {/* Generated List */}
      {generatedItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-red-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lista Generada
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getPurchasedItems()}/{getTotalItems()} elementos comprados
              </p>
            </div>
            <button
              onClick={saveShoppingList}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Guardar Lista
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {generatedItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors duration-200 ${
                    item.purchased
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={() => toggleItemPurchased(index)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-slate-600 rounded"
                    />
                    <span className={`font-medium ${
                      item.purchased 
                        ? 'line-through text-green-700 dark:text-green-300' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.alimento}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    item.purchased 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {item.cantidad.toFixed(1)} {item.unidad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Lists */}
      {shoppingLists.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Listas Guardadas ({shoppingLists.length})
          </h3>
          <div className="space-y-3">
            {shoppingLists.slice(-5).reverse().map((list, index) => (
              <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {list.items.length} productos
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Semanas: {list.selectedWeeks.join(', ')} • 
                      Días: {list.selectedDays.length} seleccionados • 
                      {new Date(list.generatedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                    Guardada
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};