// src/components/LoadingScreen.jsx
import React from 'react';

export default function LoadingScreen() {
  // ... paste LoadingScreen body here
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">LOADING DVN INTELLIGENCE</p>
      </div>
    </div>
  );

}