// scripts/parseDVNMetadata.js
// Parses dvns.txt (LayerZero DVN metadata) to enhance dvnRegistry.js with complete chain coverage

const fs = require('fs');
const path = require('path');

// Map chain names to Endpoint IDs
const CHAIN_NAME_TO_EID = {
  'ethereum': 30101,
  'bsc': 30102,
  'avalanche': 30106,
  'polygon': 30109,
  'arbitrum': 30110,
  'optimism': 30111,
  'fantom': 30112,
  'base': 30184,
  'linea': 30183,
  'scroll': 30214,
  'zksync': 30165,
  'mode': 30255,
  'xlayer': 30260,
  'tenet': 30266,
  'mantle': 30290,
  'blast': 30243,
  'gnosis': 30154,
  'kava': 30145,
  'celo': 30116,
  'harmony': 30121,
  'moonbeam': 30138,
  'moonriver': 30126,
  'metis': 30151,
  'fuse': 30118,
  'klaytn': 30182,
  'rootstock': 30238,
  'animechain': 30367,
  'skale': 30285
};

// Map DVN IDs to canonical names
const DVN_ID_TO_NAME = {
  'layerzero-labs': 'LayerZero Labs',
  'google-cloud': 'Google Cloud',
  'nethermind': 'Nethermind',
  'polyhedra-network': 'Polyhedra',
  'horizen-labs': 'Horizen',
  'bitgo': 'BitGo',
  'stargate': 'Stargate',
  'p2p': 'P2P.org',
  'canary': 'Canary',
  'bcw': 'BCW Group',
  'frax': 'Frax',
  'paxos': 'Paxos',
  'curve': 'Curve',
  'usdt0': 'USDT0',
  'animoca-blockdaemon': 'Animoca-Blockdaemon',
  'chainlink': 'Chainlink CCIP',
  'axelar': 'Axelar',
  'wormhole': 'Wormhole',
  'eigenzero': 'EigenZero',
  'nodit': 'Nodit',
  'deutsche-telekom': 'Deutsche Telekom'
};

function loadDVNMetadata() {
  const txtPath = path.join(__dirname, '../dvns.txt');
  const rawData = fs.readFileSync(txtPath, 'utf8');
  return JSON.parse(rawData);
}

function extractDVNAddresses(metadata) {
  const dvnAddressMap = {}; // { dvnId: { eid: address } }

  Object.entries(metadata).forEach(([chainName, chainData]) => {
    if (!chainData.dvns) return;

    const eid = CHAIN_NAME_TO_EID[chainName];
    if (!eid) {
      console.log(`⚠️  Unknown chain: ${chainName}`);
      return;
    }

    Object.entries(chainData.dvns).forEach(([address, dvnInfo]) => {
      const dvnId = dvnInfo.id;
      if (!dvnId || dvnInfo.deprecated) return;

      if (!dvnAddressMap[dvnId]) {
        dvnAddressMap[dvnId] = {
          id: dvnId,
          name: dvnInfo.canonicalName || DVN_ID_TO_NAME[dvnId] || dvnId,
          addresses: {}
        };
      }

      dvnAddressMap[dvnId].addresses[eid] = address.toLowerCase();
    });
  });

  return Object.values(dvnAddressMap);
}

function mergeWithExistingRegistry(newAddresses) {
  const registryPath = path.join(__dirname, '../src/utils/dvnRegistry.js');
  const existingContent = fs.readFileSync(registryPath, 'utf8');

  // Extract existing DVN_REGISTRY
  const registryMatch = existingContent.match(/export const DVN_REGISTRY = ({[\s\S]*?});/);
  if (!registryMatch) {
    console.error('❌ Could not parse existing DVN_REGISTRY');
    return;
  }

  // Parse existing registry (safely eval in Node context)
  const DVN_REGISTRY = eval(`(${registryMatch[1]})`);

  // Merge new addresses with existing
  newAddresses.forEach(dvn => {
    const existingDVN = Object.values(DVN_REGISTRY).find(d => 
      d.name.toLowerCase() === dvn.name.toLowerCase()
    );

    if (existingDVN) {
      console.log(`✅ Merging addresses for: ${dvn.name}`);
      Object.assign(existingDVN.addresses, dvn.addresses);
    } else {
      console.log(`⚠️  DVN not in registry: ${dvn.name}`);
    }
  });

  return DVN_REGISTRY;
}

function generateUpdatedRegistry(registry) {
  let output = `// src/utils/dvnRegistry.js\n`;
  output += `// DVN Registry - Enhanced with complete chain coverage from LayerZero metadata\n`;
  output += `// Last updated: ${new Date().toISOString()}\n\n`;
  output += `export const DVN_REGISTRY = {\n`;

  Object.entries(registry).forEach(([key, dvn]) => {
    output += `  "${key}": {\n`;
    output += `    name: "${dvn.name}",\n`;
    output += `    jurisdiction: "${dvn.jurisdiction}",\n`;
    output += `    infrastructure: "${dvn.infrastructure}",\n`;
    output += `    type: "${dvn.type}",\n`;
    output += `    regulator: "${dvn.regulator}",\n`;
    output += `    confidence: "${dvn.confidence}",\n`;
    output += `    securityModel: "${dvn.securityModel}",\n`;
    output += `    description: "${dvn.description}",\n`;
    if (dvn.website) output += `    website: "${dvn.website}",\n`;
    output += `    addresses: ${JSON.stringify(dvn.addresses, null, 6).replace(/\n/g, '\n    ')}\n`;
    output += `  },\n`;
  });

  output += `};\n\n`;

  // Add helper functions (keep existing)
  output += `
export function getDVNMetadata(address, chainId) {
  const addr = address?.toLowerCase();
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    const chainAddr = dvn.addresses[chainId]?.toLowerCase();
    if (chainAddr === addr) {
      return { id: key, ...dvn };
    }
  }
  return {
    id: null,
    name: "Unknown DVN",
    jurisdiction: "Unknown",
    infrastructure: "Unknown",
    type: "Unknown",
    regulator: "None",
    confidence: "low"
  };
}

export function getDVNName(address, chainId) {
  const meta = getDVNMetadata(address, chainId);
  return meta.name;
}

export function getDVNAddresses(dvnName) {
  const normalized = dvnName.toLowerCase().trim();
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    if (dvn.name.toLowerCase().includes(normalized) || key === normalized) {
      return { name: dvn.name, addresses: dvn.addresses };
    }
  }
  return null;
}

export const CHAIN_INFO = {
  30101: { name: "Ethereum", explorer: "https://api.etherscan.io/api", chainId: 1, nativeToken: "ETH", coingeckoId: "ethereum" },
  30102: { name: "BNB Chain", explorer: "https://api.bscscan.com/api", chainId: 56, nativeToken: "BNB", coingeckoId: "binancecoin" },
  30106: { name: "Avalanche", explorer: "https://api.snowtrace.io/api", chainId: 43114, nativeToken: "AVAX", coingeckoId: "avalanche-2" },
  30109: { name: "Polygon", explorer: "https://api.polygonscan.com/api", chainId: 137, nativeToken: "POL", coingeckoId: "matic-network" },
  30110: { name: "Arbitrum", explorer: "https://api.arbiscan.io/api", chainId: 42161, nativeToken: "ETH", coingeckoId: "ethereum" },
  30111: { name: "Optimism", explorer: "https://api-optimistic.etherscan.io/api", chainId: 10, nativeToken: "ETH", coingeckoId: "ethereum" },
  30112: { name: "Fantom", explorer: "https://api.ftmscan.com/api", chainId: 250, nativeToken: "FTM", coingeckoId: "fantom" },
  30184: { name: "Base", explorer: "https://api.basescan.org/api", chainId: 8453, nativeToken: "ETH", coingeckoId: "ethereum" },
  30183: { name: "Linea", explorer: "https://api.lineascan.build/api", chainId: 59144, nativeToken: "ETH", coingeckoId: "ethereum" },
  30214: { name: "Scroll", explorer: "https://api.scrollscan.com/api", chainId: 534352, nativeToken: "ETH", coingeckoId: "ethereum" },
  30165: { name: "zkSync", explorer: "https://api-era.zksync.network/api", chainId: 324, nativeToken: "ETH", coingeckoId: "ethereum", useBlockscout: true },
  30260: { name: "X Layer", explorer: "https://www.oklink.com/api/v5/explorer/blockchain", chainId: 196, nativeToken: "OKB", useBlockscout: true },
  30266: { name: "Tenet", explorer: "https://tenetscan.io/api", chainId: 1559, nativeToken: "TENET", useBlockscout: true },
  30290: { name: "Mantle", explorer: "https://api.mantlescan.xyz/api", chainId: 5000, nativeToken: "MNT" },
  30243: { name: "Blast", explorer: "https://api.blastscan.io/api", chainId: 81457, nativeToken: "ETH", coingeckoId: "ethereum" }
};
`;

  return output;
}

function main() {
  console.log('📊 Parsing LayerZero DVN metadata...\n');

  const metadata = loadDVNMetadata();
  console.log(`✅ Loaded metadata for ${Object.keys(metadata).length} chains`);

  const dvnAddresses = extractDVNAddresses(metadata);
  console.log(`✅ Extracted ${dvnAddresses.length} unique DVNs`);

  console.log('\n📋 DVNs Found:');
  dvnAddresses.forEach(dvn => {
    console.log(`  - ${dvn.name} (${Object.keys(dvn.addresses).length} chains)`);
  });

  const mergedRegistry = mergeWithExistingRegistry(dvnAddresses);
  if (!mergedRegistry) return;

  const updatedContent = generateUpdatedRegistry(mergedRegistry);
  const outputPath = path.join(__dirname, '../src/utils/dvnRegistry.js');
  fs.writeFileSync(outputPath, updatedContent, 'utf8');

  console.log(`\n✅ Updated: src/utils/dvnRegistry.js`);
  console.log('\n🎉 Done! DVN registry now has complete chain coverage.');
}

main();