// src/utils/helpers.js
// Utility functions for data formatting and calculations

/**
 * Format number as USD currency
 * @param {number|string} value - Numeric value
 * @param {boolean} compact - Use compact notation (K, M, B)
 * @returns {string} Formatted currency string
 */
export function formatUSD(value, compact = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';

  if (compact) {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format large numbers with K/M/B suffixes
 * @param {number} value - Numeric value
 * @returns {string} Formatted string
 */
export function formatNumber(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';

  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;

  return num.toLocaleString('en-US');
}

/**
 * Truncate Ethereum address (0x1234...5678)
 * @param {string} address - Full address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Truncated address
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format timestamp to relative time (e.g., "2h ago", "3d ago")
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time string
 */
export function timeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit[0]} ago`;
    }
  }

  return 'just now';
}

/**
 * Format timestamp to readable date and time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted date string
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

/**
 * Calculate success rate percentage
 * @param {number} delivered - Number of delivered transactions
 * @param {number} total - Total transactions
 * @returns {number} Percentage (0-100)
 */
export function calculateSuccessRate(delivered, total) {
  if (total === 0) return 0;
  return parseFloat(((delivered / total) * 100).toFixed(2));
}

/**
 * Get status color class for Tailwind
 * @param {string} status - Transaction status
 * @returns {object} Color classes for text and background
 */
export function getStatusColors(status) {
  const statusMap = {
    'Delivered': { text: 'text-green-500', bg: 'bg-green-900/30', border: 'border-green-700' },
    'Inflight': { text: 'text-yellow-500', bg: 'bg-yellow-900/30', border: 'border-yellow-700' },
    'Failed': { text: 'text-red-500', bg: 'bg-red-900/30', border: 'border-red-700' },
    'Blocked': { text: 'text-orange-500', bg: 'bg-orange-900/30', border: 'border-orange-700' },
    'PENDING': { text: 'text-gray-500', bg: 'bg-gray-800', border: 'border-gray-600' }
  };

  return statusMap[status] || statusMap['PENDING'];
}

/**
 * Get status icon emoji
 * @param {string} status - Transaction status
 * @returns {string} Emoji
 */
export function getStatusIcon(status) {
  const iconMap = {
    'Delivered': '✅',
    'Inflight': '⏳',
    'Failed': '❌',
    'Blocked': '🚫',
    'PENDING': '⏸️'
  };

  return iconMap[status] || '❓';
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Download data as CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - File name
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Convert transactions array to CSV format
 * @param {array} transactions - Array of transaction objects
 * @param {object} filters - Applied filters (for filename)
 * @returns {object} { csvContent, filename }
 */
export function transactionsToCSV(transactions, filters = {}) {
  const headers = [
    'Transaction Hash',
    'Timestamp',
    'Source Chain',
    'Destination Chain',
    'Amount Transferred',
    'Asset Type',
    'DVN Stack Used',
    'Status',
    'Fees Paid (USD)',
    'Latency (seconds)'
  ];

  const rows = transactions.map(tx => [
    tx.source_tx_hash || 'N/A',
    tx.source_timestamp || 'N/A',
    tx.source_chain_name || 'Unknown',
    tx.destination_chain_name || 'Unknown',
    tx.amount_tokens || 'Unknown',
    tx.oapp_display_name || tx.oapp_name || 'Unknown',
    tx.dvn_stack_names || 'Unknown',
    tx.delivery_status || 'Unknown',
    tx.total_fee_usd || '0.00',
    tx.latency_seconds || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const oappName = filters.oappName || 'OApp';
  const startDate = filters.startDate ? filters.startDate.split('T')[0] : '';
  const endDate = filters.endDate ? filters.endDate.split('T')[0] : '';
  
  const filename = startDate && endDate
    ? `${oappName}_Compliance_Report_${startDate}_to_${endDate}.csv`
    : `${oappName}_Compliance_Report_${dateStr}.csv`;

  return { csvContent, filename };
}

/**
 * Aggregate transactions by DVN stack
 * @param {array} transactions - Array of transaction objects
 * @returns {array} Aggregated data by DVN stack
 */
export function aggregateByDVNStack(transactions) {
  const stacks = {};

  transactions.forEach(tx => {
    const stackName = tx.dvn_stack_names || 'Unknown';
    
    if (!stacks[stackName]) {
      stacks[stackName] = {
        name: stackName,
        count: 0,
        volume: 0,
        delivered: 0,
        failed: 0,
        totalLatency: 0,
        totalFees: 0,
        latencyCount: 0,
        feeCount: 0
      };
    }

    stacks[stackName].count++;
    
    if (tx.amount_usd) {
      stacks[stackName].volume += parseFloat(tx.amount_usd);
    }
    
    if (tx.delivery_status === 'Delivered') {
      stacks[stackName].delivered++;
    } else if (tx.delivery_status === 'Failed') {
      stacks[stackName].failed++;
    }
    
    if (tx.latency_seconds) {
      stacks[stackName].totalLatency += tx.latency_seconds;
      stacks[stackName].latencyCount++;
    }
    
    if (tx.total_fee_usd) {
      stacks[stackName].totalFees += parseFloat(tx.total_fee_usd);
      stacks[stackName].feeCount++;
    }
  });

  // Calculate averages
  return Object.values(stacks).map(stack => ({
    ...stack,
    successRate: calculateSuccessRate(stack.delivered, stack.count),
    avgLatency: stack.latencyCount > 0 
      ? (stack.totalLatency / stack.latencyCount).toFixed(1) 
      : null,
    avgFee: stack.feeCount > 0 
      ? (stack.totalFees / stack.feeCount).toFixed(2) 
      : null
  })).sort((a, b) => b.count - a.count);
}

/**
 * Aggregate transactions by route (source → destination)
 * @param {array} transactions - Array of transaction objects
 * @returns {array} Aggregated data by route
 */
export function aggregateByRoute(transactions) {
  const routes = {};

  transactions.forEach(tx => {
    const routeName = `${tx.source_chain_name} → ${tx.destination_chain_name}`;
    
    if (!routes[routeName]) {
      routes[routeName] = {
        route: routeName,
        sourceChain: tx.source_chain_name,
        destChain: tx.destination_chain_name,
        count: 0,
        volume: 0,
        delivered: 0,
        totalLatency: 0,
        latencyCount: 0
      };
    }

    routes[routeName].count++;
    
    if (tx.amount_usd) {
      routes[routeName].volume += parseFloat(tx.amount_usd);
    }
    
    if (tx.delivery_status === 'Delivered') {
      routes[routeName].delivered++;
    }
    
    if (tx.latency_seconds) {
      routes[routeName].totalLatency += tx.latency_seconds;
      routes[routeName].latencyCount++;
    }
  });

  return Object.values(routes).map(route => ({
    ...route,
    successRate: calculateSuccessRate(route.delivered, route.count),
    avgLatency: route.latencyCount > 0 
      ? (route.totalLatency / route.latencyCount).toFixed(1) 
      : null
  })).sort((a, b) => b.volume - a.volume);
}

/**
 * Filter transactions by criteria
 * @param {array} transactions - Array of transaction objects
 * @param {object} filters - Filter criteria
 * @returns {array} Filtered transactions
 */
export function filterTransactions(transactions, filters) {
  return transactions.filter(tx => {
    // Date range filter
    if (filters.startDate) {
      const txDate = new Date(tx.source_timestamp);
      const start = new Date(filters.startDate);
      if (txDate < start) return false;
    }
    
    if (filters.endDate) {
      const txDate = new Date(tx.source_timestamp);
      const end = new Date(filters.endDate);
      if (txDate > end) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'All') {
      if (tx.delivery_status !== filters.status) return false;
    }

    // Source chain filter
    if (filters.sourceChain && filters.sourceChain !== 'All') {
      if (tx.source_chain_name !== filters.sourceChain) return false;
    }

    // Destination chain filter
    if (filters.destChain && filters.destChain !== 'All') {
      if (tx.destination_chain_name !== filters.destChain) return false;
    }

    // DVN stack filter
    if (filters.dvnStack && filters.dvnStack !== 'All') {
      if (tx.dvn_stack_names !== filters.dvnStack) return false;
    }

    return true;
  });
}

/**
 * Get unique values from transaction array for a specific field
 * @param {array} transactions - Array of transaction objects
 * @param {string} field - Field name to extract
 * @returns {array} Sorted unique values
 */
export function getUniqueValues(transactions, field) {
  const values = new Set();
  transactions.forEach(tx => {
    if (tx[field]) {
      values.add(tx[field]);
    }
  });
  return Array.from(values).sort();
}