// src/components/Header.jsx
// Simplified header - no search, just navigation

import React from 'react';

export default function Header({ onHome }) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={onHome}
          >
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">D</span>
            </div>
            <h1 className="text-xl font-bold">DVN Intelligence</h1>
          </div>
          
          <nav className="flex items-center gap-6">
            <a href="#home" onClick={onHome} className="text-sm text-gray-400 hover:text-white">Home</a>
            <a href="#builder" className="text-sm text-gray-400 hover:text-white">Builder</a>
            <a href="#institution" className="text-sm text-gray-400 hover:text-white">Institution</a>
            <a href="#trader" className="text-sm text-gray-400 hover:text-white">Trader</a>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-medium">LIVE</span>
            </div>
            <a href="#docs" className="text-sm text-gray-400 hover:text-white">Docs</a>
          </nav>
        </div>
      </div>
    </header>
  );
}