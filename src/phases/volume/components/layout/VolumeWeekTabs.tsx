import React from 'react';
import { useVolumeData } from '../../contexts/VolumeDataContext';

export const VolumeWeekTabs: React.FC = () => {
  const { currentWeek, setCurrentWeek } = useVolumeData();

  const tabs = [
    { id: 0, label: 'Resumen', shortLabel: 'R' },
    { id: 1, label: 'Semana 1', shortLabel: 'S1' },
    { id: 2, label: 'Semana 2', shortLabel: 'S2' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-orange-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentWeek(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200
                ${currentWeek === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-300 dark:hover:border-orange-600'
                }
              `}
            >
              {/* Mobile: Show short label */}
              <span className="sm:hidden">{tab.shortLabel}</span>
              {/* Desktop: Show full label */}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};