import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { calculateAverageFees, formatFeeUsd } from '../utils/feeUtils';

/**
 * FeeSummaryCard - Shows average fee breakdown for a set of transactions
 * Use on Home view or OAPP view to show cost analysis
 */
export default function FeeSummaryCard({ transactions, title = "Average Transaction Cost" }) {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  const avgFees = calculateAverageFees(transactions);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="text-emerald-500" size={20} />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      {/* Total Average */}
      <div className="bg-gray-800 rounded p-4 mb-4">
        <div className="text-gray-400 text-sm mb-1">Average Total Cost</div>
        <div className="text-3xl font-bold text-emerald-400">
          {formatFeeUsd(avgFees.avgTotalFee)}
        </div>
        <div className="text-gray-500 text-xs mt-1">
          Based on {transactions.length.toLocaleString()} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-gray-300 text-sm">DVN Fees</span>
          </div>
          <span className="text-white font-semibold">
            {formatFeeUsd(avgFees.avgDvnFee)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-300 text-sm">Executor Fee</span>
          </div>
          <span className="text-white font-semibold">
            {formatFeeUsd(avgFees.avgExecutorFee)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-gray-300 text-sm">Chain Gas</span>
          </div>
          <span className="text-white font-semibold">
            {formatFeeUsd(avgFees.avgChainFee)}
          </span>
        </div>
      </div>

      {/* Cost Insight */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-start gap-2">
          <TrendingUp className="text-blue-400 mt-0.5" size={16} />
          <div className="text-xs text-gray-400">
            {(() => {
              const executorPercent = (avgFees.avgExecutorFee / avgFees.avgTotalFee) * 100;
              if (executorPercent > 90) {
                return 'Executor fees dominate costs. This is typical for LayerZero transactions.';
              } else if (executorPercent > 70) {
                return 'Executor fees are the primary cost driver.';
              } else {
                return 'Costs are distributed across DVN verification and execution.';
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}