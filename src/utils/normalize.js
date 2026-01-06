// utils/normalize.js
// Stack name normalization utilities

/**
 * Normalize DVN stack names for consistent comparison
 * Handles variations like:
 * - "Google Cloud, LayerZero Labs"
 * - "layerzero labs + google cloud"
 * - "GOOGLE CLOUD+LAYERZERO LABS"
 * 
 * All become: "Google Cloud + Layerzero Labs"
 * 
 * @param {string} raw - Raw stack name string
 * @returns {string} Normalized stack name
 */
export function normalizeStackName(raw) {
  if (!raw) return 'unknown';
  
  // Split by comma or plus
  const parts = String(raw)
    .split(/[,+]/)
    .map(p => p.trim())
    .filter(Boolean);
  
  // Convert to lowercase and sort
  const norm = parts.map(p => p.toLowerCase()).sort();
  
  // Remove duplicates
  const unique = Array.from(new Set(norm));
  
  // Capitalize first letter of each word
  const display = unique.map(tok => 
    tok.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  ).join(' + ');
  
  return display || String(raw);
}