import React from 'react';
import type { DayOfWeek } from '../../../models/types';

const dayLabels: { [key in DayOfWeek]: string } = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

const dayLabelsLong: { [key in DayOfWeek]: string } = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

interface DaySelectorProps {
  currentDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => Promise<void>;
  days: DayOfWeek[];
  showSelector: boolean;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ 
  currentDay, 
  onDayChange, 
  days, 
  showSelector 
}) => {
  if (!showSelector) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Mobile: Dropdown */}
          <div className="sm:hidden">
            <label htmlFor="day-select" className="sr-only">
              Seleccionar día
            </label>
            <select
              id="day-select"
              value={currentDay}
              onChange={async (e) => {
                try {
                  await onDayChange(e.target.value as DayOfWeek);
                } catch (error) {
                  console.error('Error changing day:', error);
                }
              }}
              className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {dayLabelsLong[day]}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop: Buttons */}
          <div className="hidden sm:block">
            <nav className="flex space-x-4">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={async () => {
                    try {
                      await onDayChange(day);
                    } catch (error) {
                      console.error('Error changing day:', error);
                    }
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentDay === day
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="hidden md:inline">{dayLabelsLong[day]}</span>
                  <span className="md:hidden">{dayLabels[day]}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};