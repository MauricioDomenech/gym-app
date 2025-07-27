import React from 'react';
import { useData } from '../../contexts/DataContext';

export const WeekTabs: React.FC = () => {
  const { currentWeek, setCurrentWeek, getWeeks } = useData();
  const weeks = getWeeks();

  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {weeks.map((week) => (
            <button
              key={week}
              onClick={async () => {
                try {
                  await setCurrentWeek(week);
                } catch (error) {
                  console.error('Error changing week:', error);
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                currentWeek === week
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Semana {week}
            </button>
          ))}
          <button
            onClick={async () => {
              try {
                await setCurrentWeek(0);
              } catch (error) {
                console.error('Error changing week:', error);
              }
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              currentWeek === 0
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Resumen
          </button>
        </div>
      </nav>
    </div>
  );
};