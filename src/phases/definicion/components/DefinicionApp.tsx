import React from 'react';
import { DefinicionDataProvider, useDefinicionData } from '../contexts/DefinicionDataContext';
import { Header } from '../../../shared/components/layout/Header';
import { DaySelector } from '../../../shared/components/layout/DaySelector';
import { DefinicionPhaseTimeline } from './layout/DefinicionPhaseTimeline';
import { DefinicionWeekSelector } from './layout/DefinicionWeekSelector';
import { DefinicionNutritionTable } from './nutrition/DefinicionNutritionTable';
import { DefinicionExerciseList } from './exercises/DefinicionExerciseList';
import { DefinicionShoppingList } from './shopping/DefinicionShoppingList';
import { DefinicionCardioTracker } from './cardio/DefinicionCardioTracker';
import { DefinicionBodyTracker } from './body/DefinicionBodyTracker';
import { DefinicionSummary } from './summary/DefinicionSummary';
import { DefinicionProgressAlerts } from './checkin/DefinicionProgressAlerts';
import { getMesocycleInfo } from '../types/definicion';
import type { DayOfWeek } from '../../../shared/types/base';

const DefinicionContent: React.FC = () => {
  const { currentWeek, currentDay, setCurrentDay, getDaysOfWeek, isLoading } = useDefinicionData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-emerald-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600 dark:text-emerald-400">Cargando datos de definicion...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (currentWeek === 0) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DefinicionSummary />
        </div>
      );
    }

    const mesocycle = getMesocycleInfo(currentWeek);

    return <WeekContent mesocycleIsDeload={mesocycle.isDeload} />;
  };

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-slate-900">
      <Header
        title="Plan Nutricional y Ejercicios - Definicion"
        className="bg-gradient-to-r from-emerald-600 to-teal-600"
      />
      <DefinicionPhaseTimeline />
      <DefinicionWeekSelector />
      <DaySelector
        currentDay={currentDay as DayOfWeek}
        onDayChange={async (day: DayOfWeek) => await setCurrentDay(day)}
        days={getDaysOfWeek()}
        showSelector={currentWeek !== 0}
      />
      {currentWeek !== 0 && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"><DefinicionProgressAlerts /></div>}
      {renderContent()}
    </div>
  );
};

const WeekContent: React.FC<{ mesocycleIsDeload: boolean }> = ({ mesocycleIsDeload }) => {
  const [activeTab, setActiveTab] = React.useState<'nutrition' | 'cardio' | 'body' | 'shopping'>('nutrition');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Deload banner */}
      {mesocycleIsDeload && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
          <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">
            ↻ Semana de Deload — Reduce volumen y RPE
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-emerald-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'nutrition'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300'
              }`}
            >
              Nutricion y Ejercicios
            </button>
            <button
              onClick={() => setActiveTab('cardio')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'cardio'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:border-cyan-300'
              }`}
            >
              Cardio
            </button>
            <button
              onClick={() => setActiveTab('body')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'body'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-violet-700 dark:hover:text-violet-300 hover:border-violet-300'
              }`}
            >
              Cuerpo
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                activeTab === 'shopping'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300'
              }`}
            >
              Compras
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'nutrition' && (
        <div className="space-y-8">
          <DefinicionNutritionTable />
          <DefinicionExerciseList />
        </div>
      )}
      {activeTab === 'cardio' && <DefinicionCardioTracker />}
      {activeTab === 'body' && <DefinicionBodyTracker />}
      {activeTab === 'shopping' && <DefinicionShoppingList />}
    </div>
  );
};

export const DefinicionApp: React.FC = () => {
  return (
    <DefinicionDataProvider>
      <DefinicionContent />
    </DefinicionDataProvider>
  );
};
