// scripts/parseStargateData.js
// Script to parse Stargate ecosystem JSON and generate asset registries

const fs = require('fs');
const path = require('path');

// Institutional issuers we prioritize
const INSTITUTIONAL_ISSUERS = [
  'Ondo Finance',
  'PayPal',
  'Paxos',
  'Tether',
  'Circle',
  'Wyoming Stable Token Commission',
  'Ethena',
  'Usual',
  'Mountain Protocol',
  'Backed Finance',
  'Maple Finance',
  'Centrifuge',
  'TrueFi',
  'Goldfinch'
];

// Map chain names to LayerZero Endpoint IDs
function normalizeEndpointId(eidString) {
  return parseInt(eidString);
}

// Read the Stargate JSON file
function loadStargateData() {
  const jsonPath = path.join(__dirname, '../public/stargate-ecosystem-assets.json');
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  return JSON.parse(rawData);
}

// Group assets by issuer and symbol
function groupByIssuerAndSymbol(data) {
  const grouped = {};

  data.forEach(entry => {
    const issuer = entry.Issuer || 'Unknown';
    const symbol = entry['Asset Symbol'] || entry['Asset Name'];
    const key = `${issuer}_${symbol}`;

    if (!grouped[key]) {
      grouped[key] = {
        issuer,
        symbol,
        fullName: entry['Asset Name'],
        type: entry['Asset Type'],
        addresses: {}
      };
    }

    const eid = normalizeEndpointId(entry['Endpoint ID']);
    const oftAddress = entry['OFT Address'];

    if (eid && oftAddress) {
      grouped[key].addresses[eid] = oftAddress.toLowerCase();
    }
  });

  return Object.values(grouped);
}

// Filter for institutional assets only
function filterInstitutionalAssets(groupedAssets) {
  return groupedAssets.filter(asset => {
    return INSTITUTIONAL_ISSUERS.some(inst => 
      asset.issuer.toLowerCase().includes(inst.toLowerCase())
    );
  });
}

// Generate assetRegistry.js content
function generateAssetRegistry(institutionalAssets) {
  let output = `// src/utils/assetRegistry.js
// Generated from Stargate ecosystem data
// Last updated: ${new Date().toISOString()}

export const INSTITUTIONAL_ASSETS = {\n`;

  institutionalAssets.forEach(asset => {
    const id = `${asset.issuer.toLowerCase().replace(/\s+/g, '-')}-${asset.symbol.toLowerCase()}`;
    
    // Determine asset type category
    let category = 'Digital Asset';
    if (asset.symbol.includes('USD') || asset.symbol === 'FRNT') {
      category = 'Stablecoin';
    } else if (asset.issuer.includes('Ondo')) {
      category = 'RWA';
    }

    output += `  '${id}': {
    id: '${id}',
    name: '${asset.symbol}',
    fullName: '${asset.fullName}',
    institution: '${asset.issuer}',
    type: '${category}',
    description: '${asset.fullName} issued by ${asset.issuer}',
    addresses: ${JSON.stringify(asset.addresses, null, 6).replace(/\n/g, '\n    ')}
  },\n\n`;
  });

  output += `};\n\n`;

  // Add helper functions
  output += `
/**
 * Get asset information by address
 */
export function getAssetByAddress(address, chainEid) {
  if (!address) return null;
  const normalized = address.toLowerCase();
  
  for (const asset of Object.values(INSTITUTIONAL_ASSETS)) {
    const chainAddress = asset.addresses[chainEid]?.toLowerCase();
    if (chainAddress === normalized) {
      return asset;
    }
  }
  return null;
}

/**
 * Get display name for an asset address
 */
export function getAssetDisplayName(address, chainEid) {
  const asset = getAssetByAddress(address, chainEid);
  return asset ? asset.name : null;
}

/**
 * Get all assets for an institution
 */
export function getAssetsByInstitution(institutionName) {
  return Object.values(INSTITUTIONAL_ASSETS).filter(
    asset => asset.institution.toLowerCase().includes(institutionName.toLowerCase())
  );
}

/**
 * Get all unique institutions
 */
export function getAllInstitutions() {
  const institutions = new Set();
  Object.values(INSTITUTIONAL_ASSETS).forEach(asset => {
    institutions.add(asset.institution);
  });
  return Array.from(institutions).sort();
}

/**
 * Search assets by name or institution
 */
export function searchAssets(query) {
  if (!query) return Object.values(INSTITUTIONAL_ASSETS);
  
  const q = query.toLowerCase();
  return Object.values(INSTITUTIONAL_ASSETS).filter(asset => 
    asset.name.toLowerCase().includes(q) ||
    asset.fullName.toLowerCase().includes(q) ||
    asset.institution.toLowerCase().includes(q)
  );
}

/**
 * Get primary address for an asset (usually Ethereum)
 */
export function getPrimaryAddress(assetId) {
  const asset = INSTITUTIONAL_ASSETS[assetId];
  if (!asset) return null;
  
  // Priority: Ethereum > Base > Arbitrum > First available
  const priorities = [30101, 30184, 30110];
  
  for (const eid of priorities) {
    if (asset.addresses[eid]) return asset.addresses[eid];
  }
  
  const addresses = Object.values(asset.addresses);
  return addresses.length > 0 ? addresses[0] : null;
}

/**
 * Check if address is a known institutional OApp
 */
export function isInstitutionalOApp(address) {
  if (!address) return false;
  
  const normalized = address.toLowerCase();
  
  for (const asset of Object.values(INSTITUTIONAL_ASSETS)) {
    const addresses = Object.values(asset.addresses).map(a => a.toLowerCase());
    if (addresses.includes(normalized)) {
      return true;
    }
  }
  
  return false;
}
`;

  return output;
}

// Generate complete Stargate registry (all 3,138 OFTs)
function generateCompleteRegistry(groupedAssets) {
  let output = `// src/utils/stargateRegistry.js
// Complete registry of all LayerZero OFTs from Stargate ecosystem
// Total assets: ${groupedAssets.length}
// Last updated: ${new Date().toISOString()}

export const STARGATE_REGISTRY = [\n`;

  groupedAssets.forEach(asset => {
    output += `  ${JSON.stringify(asset, null, 2).replace(/\n/g, '\n  ')},\n`;
  });

  output += `];\n\n`;

  // Add search function
  output += `
/**
 * Search all OFTs by symbol, issuer, or address
 */
export function searchOFT(query, chainEid = null) {
  if (!query) return [];
  
  const q = query.toLowerCase();
  
  return STARGATE_REGISTRY.filter(asset => {
    // Search by symbol or issuer
    const matchesText = asset.symbol.toLowerCase().includes(q) ||
                       asset.issuer.toLowerCase().includes(q) ||
                       asset.fullName.toLowerCase().includes(q);
    
    // Search by address if provided
    if (chainEid) {
      const address = asset.addresses[chainEid];
      return matchesText || (address && address.toLowerCase().includes(q));
    }
    
    return matchesText;
  });
}

/**
 * Get OFT by exact address match
 */
export function getOFTByAddress(address, chainEid) {
  if (!address) return null;
  const normalized = address.toLowerCase();
  
  return STARGATE_REGISTRY.find(asset => {
    const chainAddress = asset.addresses[chainEid]?.toLowerCase();
    return chainAddress === normalized;
  });
}

/**
 * Get all OFTs for a specific issuer
 */
export function getOFTsByIssuer(issuer) {
  return STARGATE_REGISTRY.filter(asset => 
    asset.issuer.toLowerCase().includes(issuer.toLowerCase())
  );
}
`;

  return output;
}

// Main execution
function main() {
  console.log('📊 Parsing Stargate ecosystem data...\n');

  // Load data
  const data = loadStargateData();
  console.log(`✅ Loaded ${data.length} entries`);

  // Group by issuer and symbol
  const grouped = groupByIssuerAndSymbol(data);
  console.log(`✅ Grouped into ${grouped.length} unique assets`);

  // Filter institutional assets
  const institutional = filterInstitutionalAssets(grouped);
  console.log(`✅ Found ${institutional.length} institutional assets`);

  console.log('\n📋 Institutional Issuers Found:');
  const issuers = new Set(institutional.map(a => a.issuer));
  issuers.forEach(issuer => console.log(`  - ${issuer}`));

  // Generate assetRegistry.js
  const assetRegistryContent = generateAssetRegistry(institutional);
  const assetRegistryPath = path.join(__dirname, '../src/utils/assetRegistry.js');
  fs.writeFileSync(assetRegistryPath, assetRegistryContent, 'utf8');
  console.log(`\n✅ Generated: src/utils/assetRegistry.js`);

  // Generate complete stargateRegistry.js
  const completeRegistryContent = generateCompleteRegistry(grouped);
  const completeRegistryPath = path.join(__dirname, '../src/utils/stargateRegistry.js');
  fs.writeFileSync(completeRegistryPath, completeRegistryContent, 'utf8');
  console.log(`✅ Generated: src/utils/stargateRegistry.js`);

  console.log('\n🎉 Done! Run your app to see the updated asset registry.');
}

// Run the script
main();