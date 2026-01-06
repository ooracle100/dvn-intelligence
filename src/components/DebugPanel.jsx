// src/components/DebugPanel.jsx
import React from 'react';

export default function DebugPanel({ scoringMode, setScoringMode }) {
  return (
    <div className="flex items-center gap-3 mb-6 p-3 bg-gray-900 border border-gray-800 rounded-lg">
      <span className="text-sm text-gray-400 font-medium">DVN Scoring Mode:</span>
      <select 
        value={scoringMode} 
        onChange={e => setScoringMode(e.target.value)} 
        className="bg-black text-white text-sm border border-gray-700 rounded px-3 py-1.5"
      >
        <option value="balanced">Balanced (Delivery + Volume)</option>
        <option value="volume_first">Volume-First</option>
        <option value="simple">Simple (Success Rate Only)</option>
      </select>
      <span className="text-xs text-gray-500 ml-auto">
        Affects DVN rankings across the tool
      </span>
    </div>
  );
}