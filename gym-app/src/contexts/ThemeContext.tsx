import React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Simple theme provider that just applies dark mode
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Set dark mode on mount
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return <>{children}</>;
};