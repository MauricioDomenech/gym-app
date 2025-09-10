import React from 'react';
import { VolumeDataProvider, useVolumeData } from '../contexts/VolumeDataContext';
import { Header } from '../../../shared/components/layout/Header';
import { DaySelector } from '../../../shared/components/layout/DaySelector';
import { VolumeWeekTabs } from './layout/VolumeWeekTabs';
import { VolumeNutritionTable } from './nutrition/VolumeNutritionTable';
import { VolumeExerciseList } from './exercises/VolumeExerciseList';
import { VolumeWeeklySummary } from './summary/VolumeWeeklySummary';
import { VolumeShoppingList } from './shopping/VolumeShoppingList';
import type { DayOfWeek } from '../../../shared/types/base';

const VolumeContent: React.FC = () => {
  const { currentWeek, currentDay, setCurrentDay, getDaysOfWeek, isLoading } = useVolumeData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-600 dark:text-orange-400">Cargando datos de volumen...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (currentWeek === 0) {
      // Summary view
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VolumeWeeklySummary />
        </div>
      );
    }

    // Regular week view with shopping list tab
    const [activeTab, setActiveTab] = React.useState<'nutrition' | 'shopping'>('nutrition');

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation with Volume Colors */}
        <div className="mb-6">
          <div className="border-b border-orange-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'nutrition'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-300 dark:hover:border-orange-600'
                }`}
              >
                Nutrición y Ejercicios
              </button>
              <button
                onClick={() => setActiveTab('shopping')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'shopping'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-600'
                }`}
              >
                Lista de Compras
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'nutrition' ? (
          <div className="space-y-8">
            <VolumeNutritionTable />
            <VolumeExerciseList />
          </div>
        ) : (
          <VolumeShoppingList />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900">
      <Header 
        title="Plan Nutricional y Ejercicios - Volumen" 
        className="bg-gradient-to-r from-orange-600 to-red-600"
      />
      <VolumeWeekTabs />
      <DaySelector
        currentDay={currentDay as DayOfWeek}
        onDayChange={async (day: DayOfWeek) => await setCurrentDay(day)}
        days={getDaysOfWeek()}
        showSelector={currentWeek !== 0}
      />
      {renderContent()}
    </div>
  );
};

export const VolumeApp: React.FC = () => {
  return (
    <VolumeDataProvider>
      <VolumeContent />
    </VolumeDataProvider>
  );
};