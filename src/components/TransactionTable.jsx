// components/TransactionTable.jsx
import React from 'react';
import { formatUsd, formatLatency, parseAmount } from '../utils/format';
import { normalizeStackName } from '../utils/normalize';

/**
 * TransactionTable component - displays transaction data in table format
 * @param {Array} transactions - Array of transaction objects
 * @param {Function} onViewTransaction - Callback when "View" button clicked
 */
export default function TransactionTable({ transactions, onViewTransaction }) {
  const handleView = (tx) => {
    if (onViewTransaction) return onViewTransaction(tx);
    window.location.hash = `#tx-${tx.source_tx_hash}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-2 text-gray-500 font-medium">OAPP</th>
            <th className="text-left py-3 px-2 text-gray-500 font-medium">ASSET</th>
            <th className="text-right py-3 px-2 text-gray-500 font-medium">AMOUNT</th>
            <th className="text-left py-3 px-2 text-gray-500 font-medium">DVN STACK</th>
            <th className="text-left py-3 px-2 text-gray-500 font-medium">STATUS</th>
            <th className="text-right py-3 px-2 text-gray-500 font-medium">LATENCY</th>
            <th className="text-center py-3 px-2 text-gray-500 font-medium">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, idx) => (
            <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-900/50">
              <td className="py-3 px-2">{tx.oapp_name}</td>
              <td className="py-3 px-2">{tx.asset_type}</td>
              <td className="py-3 px-2 text-right font-mono">
                {formatUsd(parseAmount(tx.amount_usd, tx.amount_tokens))}
              </td>
              <td className="py-3 px-2">{normalizeStackName(tx.dvn_stack_names)}</td>
              <td className="py-3 px-2">{tx.delivery_status}</td>
              <td className="py-3 px-2 text-right">{formatLatency(tx.latency_seconds)}</td>
              <td className="py-3 px-2 text-center">
                <button 
                  onClick={() => handleView(tx)} 
                  className="text-xs px-2 py-1 bg-emerald-600 rounded hover:bg-emerald-700"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}