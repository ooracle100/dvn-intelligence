import React from 'react';

/**
 * FeeBreakdownCard - Displays detailed breakdown of transaction fees
 * Shows DVN fees, executor fees, and chain fees with individual DVN breakdown
 */
export default function FeeBreakdownCard({ transaction }) {
  if (!transaction) return null;

  const {
    dvn_fee_usd,
    executor_fee_usd,
    chain_fee_usd,
    total_fee_usd,
    dvn_fees_parsed,
    native_token_price_usd,
    eth_price_usd, // legacy fallback
    native_token_symbol
  } = transaction;

  // Resolve price and symbol
  const tokenPrice = native_token_price_usd || eth_price_usd;
  const tokenSymbol = native_token_symbol || 'ETH';

  // Parse fee values
  const dvnFee = parseFloat(dvn_fee_usd) || 0;
  const executorFee = parseFloat(executor_fee_usd) || 0;
  const chainFee = parseFloat(chain_fee_usd) || 0;
  const totalFee = parseFloat(total_fee_usd) || 0;

  // Calculate percentages
  const dvnPercent = totalFee > 0 ? (dvnFee / totalFee) * 100 : 0;
  const executorPercent = totalFee > 0 ? (executorFee / totalFee) * 100 : 0;
  const chainPercent = totalFee > 0 ? (chainFee / totalFee) * 100 : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Fee Breakdown</h3>

      {/* Total Fee */}
      <div className="bg-gray-800 rounded p-4 mb-4">
        <div className="text-gray-400 text-sm mb-1">Total Transaction Cost</div>
        <div className="text-3xl font-bold text-emerald-400">
          {transaction.total_fee_usd === null ? (
            <span className="text-xl text-gray-500">Data Unavailable</span>
          ) : (
            `$${totalFee.toFixed(4)}`
          )}
        </div>
        {tokenPrice && (
          <div className="text-gray-500 text-xs mt-1">
            {tokenSymbol} Price: ${parseFloat(tokenPrice).toLocaleString()}
          </div>
        )}
      </div>

      {/* Fee Components */}
      <div className="space-y-3">
        {/* DVN Fees */}
        <div className="border-l-4 border-emerald-500 pl-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-medium">DVN Fees</span>
            <span className="text-emerald-400 font-semibold">${dvnFee.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{dvnPercent.toFixed(1)}% of total</span>
            <span>{dvn_fees_parsed?.length || 0} DVNs</span>
          </div>

          {/* Individual DVN Breakdown */}
          {dvn_fees_parsed && dvn_fees_parsed.length > 0 && (
            <div className="mt-2 space-y-1 pl-3 border-l border-gray-700">
              {dvn_fees_parsed.map((dvn, idx) => {
                const dvnFeeUsd = parseFloat(dvn.fee_eth) * parseFloat(tokenPrice || 0);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {dvn.name}
                      <span className="ml-2 text-gray-600">({dvn.role})</span>
                    </span>
                    <span className="text-gray-300">
                      {dvnFeeUsd < 0.0001 ? `$${dvnFeeUsd.toExponential(2)}` : `$${dvnFeeUsd.toFixed(4)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Executor Fees */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-medium">Executor Fee</span>
            <span className="text-blue-400 font-semibold">${executorFee.toFixed(4)}</span>
          </div>
          <div className="text-sm text-gray-400">
            {executorPercent.toFixed(1)}% of total
          </div>
        </div>

        {/* Chain Fees */}
        <div className="border-l-4 border-purple-500 pl-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-medium">Chain Gas Fee</span>
            <span className="text-purple-400 font-semibold">
              ${chainFee < 0.0001 ? chainFee.toExponential(2) : chainFee.toFixed(4)}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            {chainPercent.toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500"
            style={{ width: `${dvnPercent}%` }}
            title={`DVN: ${dvnPercent.toFixed(1)}%`}
          />
          <div
            className="bg-blue-500"
            style={{ width: `${executorPercent}%` }}
            title={`Executor: ${executorPercent.toFixed(1)}%`}
          />
          <div
            className="bg-purple-500"
            style={{ width: `${chainPercent}%` }}
            title={`Chain: ${chainPercent.toFixed(1)}%`}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span>DVN</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Executor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Chain</span>
          </div>
        </div>
      </div>
    </div>
  );
}