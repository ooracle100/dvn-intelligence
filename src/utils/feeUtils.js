/**
 * Format fee values for display
 */

export function formatFeeUsd(feeUsd) {
  const fee = parseFloat(feeUsd);
  if (isNaN(fee)) return '$0.00';
  if (fee < 0.0001) return `$${fee.toExponential(2)}`;
  if (fee < 1) return `$${fee.toFixed(4)}`;
  return `$${fee.toFixed(2)}`;
}

export function formatFeeEth(feeEth) {
  const fee = parseFloat(feeEth);
  if (isNaN(fee)) return '0 ETH';
  if (fee < 0.000001) return `${fee.toExponential(2)} ETH`;
  return `${fee.toFixed(6)} ETH`;
}

export function calculateFeePercentage(partialFee, totalFee) {
  const partial = parseFloat(partialFee);
  const total = parseFloat(totalFee);
  if (isNaN(partial) || isNaN(total) || total === 0) return 0;
  return (partial / total) * 100;
}

export function aggregateDvnFees(dvnFeesParsed) {
  if (!Array.isArray(dvnFeesParsed) || dvnFeesParsed.length === 0) {
    return { totalFeeEth: 0, requiredCount: 0, optionalCount: 0 };
  }

  const totalFeeEth = dvnFeesParsed.reduce((sum, dvn) => sum + (dvn.fee_eth || 0), 0);
  const requiredCount = dvnFeesParsed.filter(dvn => dvn.role === 'required').length;
  const optionalCount = dvnFeesParsed.filter(dvn => dvn.role === 'optional').length;

  return { totalFeeEth, requiredCount, optionalCount };
}

export function calculateAverageFees(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      avgDvnFee: 0,
      avgExecutorFee: 0,
      avgChainFee: 0,
      avgTotalFee: 0
    };
  }

  const totals = transactions.reduce((acc, tx) => {
    acc.dvn += parseFloat(tx.dvn_fee_usd || 0);
    acc.executor += parseFloat(tx.executor_fee_usd || 0);
    acc.chain += parseFloat(tx.chain_fee_usd || 0);
    acc.total += parseFloat(tx.total_fee_usd || 0);
    return acc;
  }, { dvn: 0, executor: 0, chain: 0, total: 0 });

  const count = transactions.length;

  return {
    avgDvnFee: totals.dvn / count,
    avgExecutorFee: totals.executor / count,
    avgChainFee: totals.chain / count,
    avgTotalFee: totals.total / count
  };
}