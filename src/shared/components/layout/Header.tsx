import React from 'react';

interface HeaderProps {
  title: string;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, className }) => {
  return (
    <header className={className || "bg-slate-800 shadow-sm border-b border-slate-700"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16">
          <h1 className="text-xl font-bold text-white">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
};