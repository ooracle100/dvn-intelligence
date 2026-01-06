// utils/format.js
// Formatting utilities for display values

/**
 * Format latency value for display
 * @param {number|string|null} v - Latency value in seconds
 * @returns {string} Formatted latency string
 */
export function formatLatency(v) {
  if (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) || !Number.isFinite(Number(v))) {
    return 'N/A';
  }
  // Round to 1 decimal if float
  const val = Number(v);
  return `${Number.isInteger(val) ? val : val.toFixed(1)}s`;
}

/**
 * Parse amount from various formats (USD or token amounts)
 * @param {number|string|null} v - Primary value (amount_usd)
 * @param {number|string|null} fallbackTokens - Fallback token amount
 * @returns {number} Parsed numeric amount
 */
export function parseAmount(v, fallbackTokens) {
  if (v === undefined || v === null) v = '';
  if (typeof v === 'number' && !Number.isNaN(v)) return v;

  const s = String(v).trim();
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);

  if (!Number.isNaN(n)) return n;

  if (fallbackTokens) {
    const t = String(fallbackTokens).replace(/[^0-9.\-]/g, '');
    const tn = Number(t);
    if (!Number.isNaN(tn)) return tn;
  }

  return 0;
}

/**
 * Format USD amount with proper locale formatting
 * @param {number|string} n - Numeric value to format
 * @returns {string} Formatted USD string
 */
export function formatUsd(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format address to shortened version (0x1234...5678)
 * @param {string} addr - Full address
 * @returns {string} Shortened address
 */
export function formatAddress(addr) {
  if (!addr) return 'N/A';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Format date/timestamp for display
 * @param {string|number} timestamp - ISO string or unix timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';

  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}