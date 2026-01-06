// src/components/views/DvnView.jsx
import React from 'react';
import MetricCard from '../MetricCard';
import TransactionTable from '../TransactionTable';
import { formatUsd, formatLatency } from '../../utils/format';
import { summarizeDvn, summarizeStacks } from '../../utils/dvn';
import { getDvnDisplayName } from '../../utils/names';

export default function DvnView({ viewData, data, setViewMode, onViewTransaction }) {
  const address = viewData?.address || '';
  const explicitName = viewData?.name || null;
  const displayName = explicitName || (address ? getDvnDisplayName(address, data) : null) || null;
  const txs = viewData?.transactions || [];
  const stats = summarizeDvn(txs, address);
  const participation = summarizeStacks({ transactions: txs });
  const maxRate = Math.max(1, ...participation.map(p => p.successRate || 1));

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => setViewMode('home')} className="text-xs text-gray-400 hover:text-white">
          ← Back
        </button>
        <h2 className="text-2xl font-bold mt-2">{displayName || address}</h2>
        {displayName && <p className="text-xs text-gray-500 font-mono">{address}</p>}
        {!displayName && <p className="text-xs text-gray-500 font-mono">{address}</p>}
      </div>

      {/* Role Summary Badges */}
      {viewData.roleCounts && (
        <div className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-400 font-medium">DVN Role Distribution:</span>
          <span className="px-3 py-1 rounded-full text-xs bg-emerald-600 font-semibold">
            {viewData.roleCounts.required} Required
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-yellow-600 font-semibold">
            {viewData.roleCounts.optional} Optional
          </span>
          {viewData.roleCounts.unknown > 0 && (
            <span className="px-3 py-1 rounded-full text-xs bg-gray-600 font-semibold">
              {viewData.roleCounts.unknown} Unknown
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="VERIFICATIONS" value={stats.total} />
        <MetricCard label="VOLUME SECURED" value={formatUsd(stats.volume_secured || 0)} />
        <MetricCard label="SUCCESS RATE" value={`${stats.successRate}%`} />
        <MetricCard label="AVG LATENCY" value={formatLatency(stats.avgLatency)} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold mb-2">Stack Participation</h3>
        <p className="text-xs text-gray-500 mb-4">Which stacks this DVN participates in</p>
        <div className="space-y-2">
          {participation.map((p) => (
            <div key={p.name} className="p-3 bg-black border border-gray-800 rounded">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.count} tx • {formatUsd(p.delivered_volume)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{p.successRate}%</div>
                  <div className="text-xs text-gray-400">{formatLatency(p.avgLatency)}</div>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded h-2">
                <div 
                  style={{ width: `${(p.successRate / maxRate) * 100}%` }} 
                  className="h-2 rounded bg-emerald-500" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold mb-2">Recent Transactions</h3>
        <TransactionTable transactions={txs.slice(0, 200)} onViewTransaction={onViewTransaction} />
      </div>
    </div>
  );
}