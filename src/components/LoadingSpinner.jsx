// src/components/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ message = 'Loading...', size = 'large' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-10 w-10',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]} mb-4`}></div>
      <p className="text-gray-400 text-center">{message}</p>
    </div>
  );
}

// Inline spinner for buttons or cards
export function InlineSpinner({ size = 'small', className = '' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`}></div>
  );
}