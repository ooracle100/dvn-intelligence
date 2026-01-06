// src/components/views/WalletView.jsx
import React from 'react';
import MetricCard from '../MetricCard';
import StackRecommender from '../StackRecommender';
import TransactionTable from '../TransactionTable';
import { formatUsd, formatLatency } from '../../utils/format';
import { summarizeTransactions, summarizeStacks } from '../../utils/dvn';

export default function WalletView({ viewData, setViewMode, onViewTransaction, data, dvnScores }) {
  // ... paste OappView body from your current App.js
  const txs = viewData?.transactions || [];
  const stats = summarizeTransactions(txs);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => window.location.reload()} className="text-xs text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold">WALLET</h2>
        <p className="text-xs text-gray-500 font-mono">{viewData?.address}</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="TRANSACTIONS" value={stats.total} />
        <MetricCard label="VOLUME" value={formatUsd(stats.volume)} />
        <MetricCard label="SUCCESS RATE" value={`${stats.successRate}%`} />
        <MetricCard label="AVG LATENCY" value={formatLatency(stats.avgLatency)} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="font-bold">Recent Activity</h3>
        <TransactionTable transactions={txs.slice(0, 100)} onViewTransaction={onViewTransaction} />
      </div>
    </div>
  );
}
