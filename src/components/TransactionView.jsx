// src/components/TransactionView.jsx
// ENHANCED: Shows real amounts, assets, and fees from Alchemy decoding

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { intelligenceService } from '../services/IntelligenceService';
import LoadingSpinner from './LoadingSpinner';

export default function TransactionView() {
  const { txHash } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadTransaction() {
      setLoading(true);
      setError(null);

      try {
        const result = await intelligenceService.getTransaction(txHash);
        
        if (result.error) {
          setError(result.error);
        } else {
          setTransaction(result);
        }
      } catch (err) {
        setError('Failed to load transaction');
      } finally {
        setLoading(false);
      }
    }

    if (txHash) {
      loadTransaction();
    }
  }, [txHash]);

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getStatusIcon(status) {
    if (status === 'Delivered') return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (status === 'Failed') return <XCircle className="w-6 h-6 text-red-500" />;
    return <Clock className="w-6 h-6 text-yellow-500" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Transaction Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'Unable to load transaction details'}</p>
          <Link to="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const tx = transaction;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-lz-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link to="/" className="text-gray-400 hover:text-white mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-3">Transaction Details</h1>
          
          {/* Transaction Hash */}
          <div className="flex items-center gap-3">
            <code className="text-gray-400 text-sm break-all">{txHash}</code>
            <button
              onClick={() => copyToClipboard(txHash)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status Card */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-2">Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(tx.delivery_status)}
                <span className={`text-lg font-semibold ${
                  tx.delivery_status === 'Delivered' ? 'text-green-400' :
                  tx.delivery_status === 'Failed' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {tx.delivery_status}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-gray-400 text-sm mb-2">Latency</p>
              <p className="text-2xl font-bold">
                {tx.latency_seconds ? `${tx.latency_seconds}s` : 'Pending'}
              </p>
            </div>
            
            <div>
              <p className="text-gray-400 text-sm mb-2">Timestamp</p>
              <p className="text-sm">
                {new Date(tx.source_timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Cross-Chain Route */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Cross-Chain Route</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Source Chain */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-center">
              <p className="text-blue-400 font-semibold">{tx.source_chain_name}</p>
              <p className="text-xs text-gray-400 mt-1">Source Chain</p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-gray-400 text-2xl">→</div>
            </div>

            {/* Destination Chain */}
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
              <p className="text-green-400 font-semibold">{tx.destination_chain_name}</p>
              <p className="text-xs text-gray-400 mt-1">Destination Chain</p>
            </div>
          </div>
        </div>

        {/* Transfer Details - ENHANCED */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Transfer Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Asset */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Asset</p>
              <p className="text-lg font-semibold">
                {tx.asset_symbol || tx.oapp_display_name || 'Unknown'}
              </p>
              {tx.asset_address && (
                <code className="text-xs text-gray-500 block mt-1">
                  {tx.asset_address.slice(0, 10)}...{tx.asset_address.slice(-8)}
                </code>
              )}
            </div>

            {/* Amount */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Amount</p>
              <p className="text-lg font-semibold">
                {tx.amount_tokens ? 
                  `${tx.amount_tokens} ${tx.asset_symbol || 'tokens'}` : 
                  <span className="text-gray-500">Amount not available</span>
                }
              </p>
              {tx.asset_price_usd && (
                <p className="text-xs text-gray-500 mt-1">
                  Price: ${tx.asset_price_usd.toFixed(2)} per token
                </p>
              )}
            </div>

            {/* Value (USD) */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Value (USD)</p>
              <p className="text-2xl font-bold text-green-400">
                {tx.amount_usd ? 
                  `$${parseFloat(tx.amount_usd).toLocaleString()}` : 
                  <span className="text-gray-500 text-lg">$0</span>
                }
              </p>
            </div>

            {/* OApp Contract */}
            <div>
              <p className="text-gray-400 text-sm mb-2">OApp Contract</p>
              <Link
                to={`/oapp/${tx.oapp_address}`}
                className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-2"
              >
                <span>{tx.oapp_address?.slice(0, 10)}...{tx.oapp_address?.slice(-8)}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              {tx.oapp_display_name && (
                <p className="text-sm text-gray-400 mt-1">({tx.oapp_display_name})</p>
              )}
            </div>
          </div>
        </div>

        {/* Fee Breakdown - ENHANCED */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Fee Breakdown</h2>
          
          <div className="space-y-4">
            <FeeRow label="Chain Fee (Gas)" value={tx.chain_fee_usd} />
            <FeeRow label="DVN Fee" value={tx.dvn_fee_usd} />
            <FeeRow label="Executor Fee" value={tx.executor_fee_usd} />
            
            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Fees</span>
                <span className="text-2xl font-bold text-yellow-400">
                  {tx.total_fee_usd ? `$${tx.total_fee_usd}` : <span className="text-gray-500 text-lg">Calculating...</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DVN Verification Stack */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">DVN Verification Stack</h2>
          
          <div className="space-y-3">
            {tx.required_dvn_names?.length > 0 ? (
              tx.required_dvn_names.map((name, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-semibold">{name}</span>
                  <span className="ml-auto px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-800">
                    Required
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No DVN information available</p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-lz-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Additional Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow label="Message GUID" value={tx.message_guid} />
            <InfoRow label="Source Tx Hash" value={tx.source_tx_hash} />
            <InfoRow label="Destination Tx Hash" value={tx.destination_tx_hash || 'Pending'} />
            <InfoRow label="Source Chain EID" value={tx.source_chain_eid} />
            <InfoRow label="Destination Chain EID" value={tx.destination_chain_eid} />
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-700 flex gap-4">
            <a
              href={`https://layerzeroscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on LayerZero Scan</span>
            </a>
            
            <Link
              to={`/oapp/${tx.oapp_address}`}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <span>View OApp Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeeRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold">
        {value ? `$${value}` : <span className="text-gray-500">N/A</span>}
      </span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <code className="text-sm text-gray-300 break-all">{value || 'N/A'}</code>
    </div>
  );
}