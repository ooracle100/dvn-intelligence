import React from 'react';
import { getDVNName } from '../utils/dvnRegistry';

export default function DebugPanel({ dvnScores, scoringMode, setScoringMode }) {
  const top5 = (dvnScores || []).slice(0, 5);
  
  return (
    <div className="fixed top-20 right-6 p-4 border border-gray-800 rounded bg-gray-900 text-xs w-64 z-10">
      <div className="flex items-center gap-2 mb-3">
        <strong className="text-white">Score Mode:</strong>
        <select 
          value={scoringMode} 
          onChange={e => setScoringMode(e.target.value)} 
          className="bg-black text-white text-xs border border-gray-700 rounded px-2 py-1 flex-1"
        >
          <option value="balanced">Balanced</option>
          <option value="volume_first">Volume-first</option>
          <option value="simple">Simple (success%)</option>
        </select>
      </div>
      
      <div className="mb-2 text-gray-400 font-semibold">Top DVNs</div>
      
      <div className="space-y-2">
        {top5.map((d, i) => {
          const dvnName = getDVNName(d.address, 30184) || d.address.slice(0, 10) + '...';
          const volume = d.totalVolume ? `$${(d.totalVolume / 1000000).toFixed(1)}M` : '$0';
          
          return (
            <div key={i} className="flex items-center justify-between gap-2 p-2 bg-black rounded border border-gray-800">
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs truncate">{dvnName}</div>
                <div className="text-gray-500 text-xs">{d.total} tx • {volume}</div>
              </div>
              <div className="text-emerald-400 font-bold text-sm">{d.score}</div>
            </div>
          );
        })}
        {top5.length === 0 && <div className="text-gray-500 text-center py-2">No data</div>}
      </div>
    </div>
  );
}