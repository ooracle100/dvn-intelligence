// src/components/views/SearchView.jsx
import React from 'react';
import MetricCard from '../MetricCard';
import StackRecommender from '../StackRecommender';
import TransactionTable from '../TransactionTable';
import { formatUsd, formatLatency } from '../../utils/format';
import { summarizeTransactions, summarizeStacks } from '../../utils/dvn';

export default function OappView({ viewData, setViewMode, onViewTransaction, data, dvnScores }) {
  // ... paste OappView body from your current App.js
  const results = viewData?.results || [];
  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => setViewMode('home')} className="text-xs text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold">Search Results</h2>
        <p className="text-xs text-gray-400">Found {results.length} results for “{viewData?.query}”</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <TransactionTable transactions={results.slice(0, 200)} onViewTransaction={onViewTransaction} />
      </div>
    </div>
  );
}
