// src/components/views/TransactionView.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatUsd, formatLatency } from '../../utils/format';
import { getAssetDisplayName, getAssetSymbol } from '../../utils/assetRegistry';
import { normalizeStatus } from '../../utils/unifiedSearch';
import FeeBreakdownCard from '../FeeBreakdownCard';

const LAYERZERO_SCAN_BASE = 'https://layerzeroscan.com/tx/';

export default function TransactionView({ viewData, setViewMode }) {
  const tx = viewData?.transaction;

  if (!tx) {
    return (
      <div className="bg-gray-900 border border-red-900 rounded-lg p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-xl font-bold mb-2">Transaction not found</h3>
        <p className="text-gray-400">Check the database or try a different hash</p>
      </div>
    );
  }

  // Get asset name
  const assetName = getAssetDisplayName(tx.oapp_address) || tx.oapp_name;
  const assetSymbol = getAssetSymbol(tx.oapp_address);

  // Get DVN names
  const dvnStackDisplay = tx.dvn_stack_names || 'Unknown';

  // Normalize status for consistent colors
  const status = normalizeStatus(tx.delivery_status);

  // Explorer hash: prefer destination (delivered) but fall back to source
  const explorerHash = tx.destination_tx_hash || tx.source_tx_hash || '';

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setViewMode('home')}
          className="text-xs text-gray-400 hover:text-white"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold mt-2">Transaction Details</h2>
        <p className="text-xs text-gray-500 font-mono">{tx.source_tx_hash}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-1">ASSET</p>
            <p className="font-medium">{assetName}</p>
            {assetSymbol !== assetName && (
              <p className="text-xs text-gray-500">{assetSymbol}</p>
            )}
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">AMOUNT</p>
            <p className="font-medium text-white">
              {tx.amount_tokens !== 'Unknown'
                ? tx.amount_tokens
                : (tx.native_value_wei && tx.native_value_wei !== '0')
                  ? `${(Number(tx.native_value_wei) / 1e18).toFixed(6)} ETH/Native`
                  : 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">VALUE (USD)</p>
            <p className="font-medium text-emerald-400">
              {Number(tx.amount_usd) > 0 ? formatUsd(tx.amount_usd) : '$-.--'}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">ROUTE</p>
            <p className="font-medium">
              {tx.source_chain || tx.source_chain_name || 'Unknown'} → {tx.destination_chain || tx.destination_chain_name || 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">STATUS</p>
            <p className={`font-medium text-${status.color}-400`}>
              {status.text}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">LATENCY</p>
            <p className="font-medium">{formatLatency(tx.latency_seconds)}</p>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1">TIMESTAMP</p>
            <p className="font-medium text-xs">
              {tx.source_timestamp
                ? new Date(tx.source_timestamp).toLocaleString()
                : 'N/A'}
            </p>
          </div>

          <div className="col-span-2">
            <p className="text-gray-400 text-xs mb-1">DVN VERIFICATION STACK</p>
            <p className="font-medium text-sm">{dvnStackDisplay}</p>
          </div>

          <div className="col-span-2">
            <p className="text-gray-400 text-xs mb-1">OAPP ADDRESS</p>
            <p className="font-mono text-xs text-gray-500">{tx.oapp_address}</p>
          </div>

          <div className="col-span-2 mt-4 flex items-center gap-4">
            <a
              href={`${LAYERZERO_SCAN_BASE}${explorerHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1 bg-gray-800 border border-gray-700 rounded hover:border-gray-600"
            >
              View on LayerZeroScan
            </a>
            <button
              onClick={() => setViewMode('home')}
              className="text-xs px-3 py-1 bg-emerald-600 rounded hover:bg-emerald-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <FeeBreakdownCard transaction={tx} />
    </div>
  );
}