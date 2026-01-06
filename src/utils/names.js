// utils/names.js
// DVN display name resolution

/**
 * Get human-readable display name for a DVN address
 * Checks metadata labels and transaction records
 * 
 * @param {string} address - DVN address to look up
 * @param {object} data - Full dataset object
 * @returns {string|null} Display name or null if not found
 */
export function getDvnDisplayName(address, data) {
  if (!address || !data) return null;
  
  const a = String(address).toLowerCase().trim();

  // 1) Check explicit metadata mapping (fast, reliable)
  const labelsMeta = data?.metadata?.dvn_labels || {};
  const labelsRoot = data?.dvn_labels || {};
  const labels = { ...labelsMeta, ...labelsRoot };
  
  if (labels[a]) return labels[a];

  // 2) Find first transaction where this address appears and has a dvn_name
  for (const t of (data.transactions || [])) {
    const addrs = ((t.required_dvn_addresses || []).concat(t.optional_dvn_addresses || []))
      .map(x => String(x || '').toLowerCase().trim());
    
    if (addrs.includes(a) && t.dvn_name) {
      return t.dvn_name;
    }
  }

  // Not found
  return null;
}