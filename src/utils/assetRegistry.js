// Asset Registry - Maps OFT addresses to token metadata
// Built from LayerZero ecosystem data

import assetData from '../stargate-ecosystem-assets.json';

// Build lookup maps
const addressToAsset = {};
const endpointToAssets = {};

// Process the asset data
assetData.forEach(asset => {
  const oftAddress = asset['OFT Address']?.toLowerCase();
  const endpointId = asset['Endpoint ID'];
  
  if (oftAddress) {
    // Store by address for quick lookup
    addressToAsset[oftAddress] = {
      name: asset['Asset Name'],
      symbol: asset['Asset Symbol'],
      issuer: asset['Issuer'],
      type: asset['Asset Type'],
      chain: asset['Chain'],
      endpointId: endpointId
    };
    
    // Store by endpoint for chain-specific lookups
    if (!endpointToAssets[endpointId]) {
      endpointToAssets[endpointId] = {};
    }
    endpointToAssets[endpointId][oftAddress] = addressToAsset[oftAddress];
  }
});

/**
 * Get asset info by OFT address
 * @param {string} address - OFT contract address
 * @param {number} endpointId - Optional endpoint ID for chain-specific lookup
 * @returns {object|null} Asset metadata or null
 */
export function getAssetInfo(address, endpointId = null) {
  if (!address) return null;
  
  const normalized = address.toLowerCase();
  
  // Try chain-specific lookup first if endpoint provided
  if (endpointId && endpointToAssets[endpointId]?.[normalized]) {
    return endpointToAssets[endpointId][normalized];
  }
  
  // Fall back to global lookup
  return addressToAsset[normalized] || null;
}

/**
 * Get display name for an OAPP/OFT
 * @param {string} address - Contract address
 * @param {number} endpointId - Optional endpoint ID
 * @returns {string} Formatted name
 */
export function getAssetDisplayName(address, endpointId = null) {
  const asset = getAssetInfo(address, endpointId);
  
  if (asset) {
    // Format: "Issuer Symbol" (e.g., "Stargate USDC.e")
    return `${asset.issuer} ${asset.symbol}`;
  }
  
  // Fallback to shortened address
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown';
}

/**
 * Get asset symbol only
 * @param {string} address - Contract address
 * @param {number} endpointId - Optional endpoint ID
 * @returns {string} Symbol or shortened address
 */
export function getAssetSymbol(address, endpointId = null) {
  const asset = getAssetInfo(address, endpointId);
  return asset?.symbol || (address ? `${address.slice(0, 8)}...` : 'Unknown');
}

/**
 * Check if address is a known OFT
 * @param {string} address - Contract address
 * @returns {boolean}
 */
export function isKnownOFT(address) {
  if (!address) return false;
  return addressToAsset.hasOwnProperty(address.toLowerCase());
}

/**
 * Get all assets for a specific chain
 * @param {number} endpointId - LayerZero endpoint ID
 * @returns {array} Array of asset objects
 */
export function getAssetsByChain(endpointId) {
  const assets = endpointToAssets[endpointId];
  return assets ? Object.values(assets) : [];
}

/**
 * Search assets by symbol or name
 * @param {string} query - Search query
 * @returns {array} Matching assets
 */
export function searchAssets(query) {
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  return Object.values(addressToAsset).filter(asset => 
    asset.symbol.toLowerCase().includes(lowerQuery) ||
    asset.name.toLowerCase().includes(lowerQuery) ||
    asset.issuer.toLowerCase().includes(lowerQuery)
  );
}

export default {
  getAssetInfo,
  getAssetDisplayName,
  getAssetSymbol,
  isKnownOFT,
  getAssetsByChain,
  searchAssets
};
