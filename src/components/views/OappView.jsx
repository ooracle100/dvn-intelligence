
// src/components/views/OappView.jsx
import React from 'react';
import MetricCard from '../MetricCard';
import StackRecommender from '../StackRecommender';
import TransactionTable from '../TransactionTable';
import EfficiencyMatrix from '../EfficiencyMatrix';
import { formatUsd, formatLatency } from '../../utils/format';
import { summarizeTransactions, summarizeStacks } from '../../utils/dvn';
import RiskDashboard from '../RiskDashboard';

export default function OappView({ viewData, setViewMode, onViewTransaction, data, dvnScores }) {
  // ... paste OappView body from your current App.js
  const txs = viewData?.transactions || [];
  const stats = summarizeTransactions(txs);
  const stackCompare = summarizeStacks({ transactions: txs });
  const primaryRoute = viewData?.primaryRoute || viewData?.transactions?.[0]?.oapp_chain || viewData?.route || '';

  // Calculate Risk for the primary stack
  const primaryStack = stackCompare[0];
  const dvnAddresses = txs[0]?.required_dvn_addresses || [];



  // Global stacks for Market Intelligence
  const globalStacks = summarizeStacks(data);

  // small comparison: build a normalized stack object for this OAPP and top stacks globally
  const thisStacks = stackCompare.slice().map(s => ({ name: s.name, successRate: s.successRate, delivered_volume: s.delivered_volume }));
  const topGlobalStacks = summarizeStacks(data).slice(0, 3).map(s => ({ name: s.name, successRate: s.successRate, delivered_volume: s.delivered_volume }));

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <button onClick={() => setViewMode('home')} className="text-xs text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold mt-2">{viewData?.name || viewData?.address || 'OAPP'}</h2>
        <p className="text-xs text-gray-500 font-mono">{viewData?.address} • Route: {primaryRoute}</p>
        {viewData?.topStacks && viewData.topStacks.length > 0 && <p className="text-xs text-gray-400 mt-1">Top Stacks: {viewData.topStacks.join(' • ')}</p>}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="TOTAL TXS" value={stats.total} />
        <MetricCard label="DELIVERED VOLUME" value={formatUsd(viewData?.delivered_volume || stats.volume || 0)} />
        <MetricCard label="SUCCESS RATE" value={`${stats.successRate}%`} />
        <MetricCard label="AVG LATENCY" value={formatLatency(stats.avgLatency)} />
        <MetricCard label="FAILURES" value={stats.failed} />
      </div>

      {/* Institutional Risk Dashboard (Dynamic) */}
      <RiskDashboard
        dvnStack={txs[0]?.required_dvn_addresses || []}
        chainId={txs[0]?.source_chain_eid || 30101}
      />

      {/* Efficiency Matrix */}
      <EfficiencyMatrix transactions={txs} tokenPrice={viewData?.asset_price_usd} />

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold mb-2">Top Verified Stacks</h3>
        <p className="text-xs text-gray-500 mb-4">Most popular DVN configurations by volume and reliability (Market Intelligence).</p>
        <StackRecommender stacks={globalStacks.slice(0, 5)} />
      </div>

      {/* Stack comparison block - small, non-intrusive */}
      {/* Intelligence: Stack Benchmarking */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold mb-2">Performance Intelligence</h3>
        <p className="text-xs text-gray-500 mb-6">Benchmarking your primary verification stack against top global performers.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Your Stack Performance */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-300 border-b border-gray-700 pb-2">Your Stack: {thisStacks[0]?.name || 'Unknown'}</h4>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Success Rate</span>
              <span className={`font-mono ${stats.successRate >= 95 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {stats.successRate}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Avg Latency</span>
              <span className="font-mono text-white">{formatLatency(stats.avgLatency)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Volume Delivered</span>
              <span className="font-mono text-white">{formatUsd(stats.volume || viewData?.delivered_volume)}</span>
            </div>
          </div>

          {/* 2. Benchmark vs Global Top 3 */}
          <div className="space-y-4 bg-gray-950/50 p-4 rounded border border-gray-800">
            <h4 className="text-sm font-semibold text-emerald-400 border-b border-gray-800 pb-2 flex items-center gap-2">
              Global Benchmark (Top 3 Avg)
            </h4>

            {topGlobalStacks.length > 0 ? (() => {
              // Calculate global averages
              const globalAvgRate = Math.round(topGlobalStacks.reduce((acc, s) => acc + s.successRate, 0) / topGlobalStacks.length);
              const diffRate = stats.successRate - globalAvgRate;

              return (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Target Success Rate</span>
                    <div className="text-right">
                      <span className="font-mono text-gray-300">{globalAvgRate}%</span>
                      <span className={`ml-2 text-xs ${diffRate >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        ({diffRate >= 0 ? '+' : ''}{diffRate}%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-400 italic">
                    {diffRate < -5
                      ? "⚠️ Your stack is significantly strictly underperforming the global average. Consider the recommendations above."
                      : "✅ Your stack is performing within industry standards."
                    }
                  </div>
                </>
              );
            })() : (
              <p className="text-xs text-gray-500">Not enough global data for benchmarks.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold mb-2">Recent Transactions (preview)</h3>
        <TransactionTable transactions={txs.slice(0, 50)} onViewTransaction={onViewTransaction} />
      </div>
    </div >
  );
}