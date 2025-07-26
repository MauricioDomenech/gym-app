import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider, useData } from './contexts/DataContext';
import { Header } from './components/layout/Header';
import { WeekTabs } from './components/layout/WeekTabs';
import { DaySelector } from './components/layout/DaySelector';
import { NutritionTable } from './components/nutrition/NutritionTable';
import { ExerciseList } from './components/exercises/ExerciseList';
import { WeeklySummary } from './components/summary/WeeklySummary';
import { ShoppingList } from './components/shopping/ShoppingList';

const AppContent: React.FC = () => {
  const { currentWeek, isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (currentWeek === 0) {
      // Summary view
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WeeklySummary />
        </div>
      );
    }

    // Regular week view with shopping list tab
    const [activeTab, setActiveTab] = React.useState<'nutrition' | 'shopping'>('nutrition');

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'nutrition'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Nutrición y Ejercicios
              </button>
              <button
                onClick={() => setActiveTab('shopping')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'shopping'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
            <NutritionTable />
            <ExerciseList />
          </div>
        ) : (
          <ShoppingList />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      <WeekTabs />
      <DaySelector />
      {renderContent()}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
