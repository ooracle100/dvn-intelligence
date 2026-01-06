// components/StackRecommender.jsx
import React from 'react';
import { formatUsd, formatLatency } from '../utils/format';
import { Zap, Shield, Trophy } from 'lucide-react';

/**
 * StackRecommender component - shows top 3 stacks with "Intelligence" badges
 */
export default function StackRecommender({ stacks }) {
  const top = (stacks || [])
    .slice()
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3);

  // Identify best metrics in this set for tagging
  const bestLatency = Math.min(...top.map(s => s.avgLatency || 9999));
  const bestReliability = Math.max(...top.map(s => s.successRate));
  const maxVol = Math.max(...top.map(s => s.delivered_volume));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {top.map((s, idx) => {
        const isFastest = s.avgLatency === bestLatency;
        const isSafest = s.successRate === bestReliability;
        const isMostVol = s.delivered_volume === maxVol;

        return (
          <div key={s.name} className="relative p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/30 transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-white break-words w-3/4">{s.name}</div>
              {idx === 0 && <Trophy size={16} className="text-yellow-400" />}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {isFastest && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/50 text-blue-300 border border-blue-800"><Zap size={10} /> FASTEST</span>}
              {isSafest && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-800"><Shield size={10} /> RELIABLE</span>}
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 border-t border-gray-800 pt-3">
              <div>
                <p className="text-gray-500 text-xs">Success Rate</p>
                <p className={`font-mono font-medium ${s.successRate >= 98 ? 'text-emerald-400' : 'text-yellow-400'}`}>{s.successRate}%</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Avg Latency</p>
                <p className="font-mono text-white">{formatLatency(s.avgLatency)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Volume</p>
                <p className="text-gray-300">{formatUsd(s.delivered_volume)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Tx Count</p>
                <p className="text-gray-300">{s.count}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}