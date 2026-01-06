// DVN Registry - Single Source of Truth
// Generated: Day 3 of Institutional MVP Plan
// Contains verified metadata (Jurisdiction, Infra, Type) and address mappings

export const DVN_REGISTRY = {
  "google-cloud": {
    name: "Google Cloud",
    jurisdiction: "US",
    infrastructure: "Google Cloud Platform",
    type: "Corporate",
    regulator: "None",
    confidence: "high",
    securityModel: "Institutional Trust (Proof of Authority)",
    description: "Highly reliable institutional verifier using Google cloud infrastructure",
    website: "https://cloud.google.com/web3",
    addresses: {
      30101: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30102: "0x8931bda63ebe89146d5e7488f8dd03a2b0f10930",
      30106: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30109: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30110: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30111: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30184: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
      30214: "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc"
    }
  },
  "animoca-blockdaemon": {
    name: "Animoca-Blockdaemon",
    jurisdiction: "USA",
    infrastructure: "Permissioned, ISO-certified infrastructure",
    type: "Corporate",
    regulator: "None",
    confidence: "medium",
    securityModel: "Company-funded (no token)",
    description: "Institutional-grade, highly-secure cross-chain verifier network",
    website: "https://blockdaemon.com",
    addresses: {
      30101: "0x7e65bdd15c8db8995f80abf0d6593b57dc8be437",
      30110: "0xddaa92ce2d2fac3f7c5eae19136e438902ab46cc",
      30106: "0xffe42dc3927a240f3459e5ec27eaabd88727173e"
    }
  },
  "chainlink": {
    name: "Chainlink CCIP",
    jurisdiction: "Cayman",
    infrastructure: "Decentralized Oracle Network",
    type: "Oracle",
    regulator: "None",
    confidence: "high",
    securityModel: "LINK token staking and oracle bonds",
    description: "Uses Chainlink DONs and risk network to secure messages",
    website: "https://chain.link",
    addresses: {
      30101: "0x771d10d0c86e26ea8d3b778ad4d31b30533b9cbf"
    }
  },
  "axelar": {
    name: "Axelar",
    jurisdiction: "USA",
    infrastructure: "Proof-of-Stake validator chain",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    securityModel: "AXL token staking",
    description: "Cosmos-based PoS blockchain securing cross-chain transfers",
    website: "https://axelar.network",
    addresses: {}
  },
  "wormhole": {
    name: "Wormhole",
    jurisdiction: "N/A",
    infrastructure: "Proof-of-Authority guardian network",
    type: "Bridge",
    regulator: "None",
    confidence: "medium",
    securityModel: "No native staking; security by reputation",
    description: "Guardian network (19 validators) securing via reputation",
    website: "https://wormhole.com",
    addresses: {}
  },
  "eigenzero": {
    name: "EigenZero",
    jurisdiction: "N/A",
    infrastructure: "EigenCloud restaked infrastructure",
    type: "Restaking",
    regulator: "None",
    confidence: "high",
    securityModel: "Slashable ZRO token collateral",
    description: "Cryptoeconomic DVN via EigenCloud",
    website: "https://eigenlayer.xyz",
    addresses: {}
  },
  "nodit": {
    name: "Nodit",
    jurisdiction: "South Korea",
    infrastructure: "Private enterprise node infrastructure",
    type: "Corporate",
    regulator: "None",
    confidence: "low",
    securityModel: "Company-funded",
    description: "Enterprise-grade DVN with AML compliance for Asia",
    website: "https://nodit.io",
    addresses: {}
  },
  "deutsche-telekom": {
    name: "Deutsche Telekom",
    jurisdiction: "Germany",
    infrastructure: "Open Telekom Cloud (GDPR-compliant)",
    type: "Telecom",
    regulator: "BNetzA",
    confidence: "high",
    securityModel: "Institutional Trust (Proof of Authority)",
    description: "Enterprise-grade DVN with high-reliability infrastructure",
    website: "https://mms.telekom.com",
    addresses: {
      30184: "0xc2a0c36f5939a14966705c7cec813163faeea1f0"
    }
  },
  "nethermind": {
    name: "Nethermind",
    jurisdiction: "UK",
    infrastructure: "Self-hosted", // Hybrid/Kubernetes
    type: "Research",
    regulator: "FCA",
    confidence: "high",
    description: "Ethereum infrastructure company, EU-based",
    website: "https://nethermind.io",
    addresses: {
      30101: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30102: "0x31f748a368a893bdb5abb67ec95f232507601a73",
      30106: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30109: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30110: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30111: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30184: "0xcd37ca043f8479064e10635020c65ffc005d36f6",
      30214: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
      30260: "0x28af4dadbc5066e994986e8bb105240023dc44b6",
      30271: "0x9e0e95ede70f680f74480b510ff9f45c70e3da80"
    }
  },
  "polyhedra-network": {
    name: "Polyhedra",
    jurisdiction: "Singapore",
    infrastructure: "GCP", // Proof Cloud partnership
    type: "Startup",
    regulator: "MAS",
    confidence: "high",
    description: "Zero-knowledge proof infrastructure",
    website: "https://polyhedra.network",
    addresses: {
      30101: "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
      30184: "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
      30260: "0x8ddf05f9a5c488b4973897e278b58895bf87cb24"
    }
  },
  "layerzero-labs": {
    name: "LayerZero Labs",
    jurisdiction: "US", // or Cayman
    infrastructure: "Multi-cloud",
    type: "Core Protocol",
    regulator: "None",
    confidence: "medium",
    description: "Core protocol DVN",
    website: "https://layerzero.network",
    addresses: {
      30101: "0x589dedbd617e0cbcb916a9223f4d1300c294236b",
      30102: "0xfd6865c841c2d64565562fcc7e05e619a30615f0",
      30106: "0x962f502a63f5fBeb44Dc9ab932122648E8352959",
      30109: "0x23de2fe932d9043291f870324b74f820e11dc81a",
      30110: "0x2f55c492897526677c5b68fb199ea31e2c126416",
      30111: "0xa7b5189bca84cd304d8553977c7c614329750d99",
      30184: "0x9e059a54699a285714207b43b055483e78faac25",
      30214: "0xbe0d08a85eebfcc6eda0a843521f7cbb1180d2e2",
      30165: "0x9e059a54699a285714207b43b055483e78faac25",
      30255: "0x9e059a54699a285714207b43b055483e78faac25",
      30260: "0x9c061c9a4782294eef65ef28cb88233a987f4bdd",
      30266: "0x282b3386571f7f794450d5789911a9804fa346b4",
      30271: "0x282b3386571f7f794450d5789911a9804fa346b4",
      30383: "0x9e059a54699a285714207b43b055483e78faac25",
      30367: "0x9e059a54699a285714207b43b055483e78faac25"
    }
  },
  "horizen-labs": {
    name: "Horizen",
    jurisdiction: "US",
    infrastructure: "AWS",
    type: "Corporate",
    regulator: "SEC",
    confidence: "medium",
    description: "Zero-knowledge infrastructure provider",
    website: "https://horizenlabs.io",
    addresses: {
      30101: "0xa7b5189bca84cd304d8553977c7c614329750d99",
      30184: "0xa7b5189bca84cd304d8553977c7c614329750d99",
      30260: "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
      30266: "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b"
    }
  },
  "bitgo": {
    name: "BitGo",
    jurisdiction: "US",
    infrastructure: "Self-hosted", // Custodian vaults
    type: "Custodian",
    regulator: "NYDFS", // Regulated Trust
    confidence: "high",
    description: "Institutional digital asset custodian",
    website: "https://bitgo.com",
    addresses: {
      30101: "0xce8358bc28dd8296ce8caf1cd2b44787abd65887",
      30184: "0x133e9fb2d339d8428476a714b1113b024343811e"
    }
  },
  "stargate": {
    name: "Stargate",
    jurisdiction: "Cayman Islands",
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "CIMA",
    confidence: "low",
    description: "LayerZero ecosystem bridge",
    website: "https://stargate.finance",
    addresses: {
      30101: "0x589dedbd617e0cbcb916a9223f4d1300c294236b", // Uses LZ Labs DVN often
      30184: "0xcdf31d62140204c08853b547e64707110fbc6680"
    }
  },
  "p2p": {
    name: "P2P.org",
    jurisdiction: "EU",
    infrastructure: "Self-hosted",
    type: "Staking",
    regulator: "None",
    confidence: "medium",
    description: "Non-custodial staking provider",
    website: "https://p2p.org",
    addresses: {
      30184: "0x5b6735c66d97479ccd18294fc96b3084ecb2fa3f"
    }
  },
  "canary": {
    name: "Canary",
    jurisdiction: "US",
    infrastructure: "Unknown",
    type: "Auditor",
    regulator: "None",
    confidence: "medium",
    addresses: {
      30184: "0x554833698ae0fb22ecc90b01222903fd62ca4b47",
      30260: "0x047d9dbe4fc6b5c916f37237f547f9f42809935a",
      30266: "0xa1491ada1168f04df32f72913fc3f27522950acf"
    }
  },
  "bcw": {
    name: "BCW Group",
    jurisdiction: "APAC",
    infrastructure: "Unknown",
    type: "VC",
    regulator: "None",
    confidence: "low",
    addresses: {
      30184: "0xb3ce0a5d132cd9bf965aba435e650c55edce0062",
      30266: "0x7fe673201724925b5c477d4e1a4bd3e954688cf5"
    }
  },
  "frax": {
    name: "Frax",
    jurisdiction: "US",
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    addresses: {
      30184: "0x187cf227f81c287303ee765ee001e151347faaa2",
      30260: "0x2ae36a544b904f2f2960f6fd1a6084b4b11ba334"
    }
  },
  "paxos": {
    name: "Paxos",
    jurisdiction: "US",
    infrastructure: "Self-hosted",
    type: "Issuer",
    regulator: "NYDFS",
    confidence: "high",
    addresses: {
      30260: "0x8befb8cd9529e539b095251ea3a058e710225d30"
    }
  },
  "curve": {
    name: "Curve",
    jurisdiction: "EU", /* Switzerland DAO */
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    addresses: {
      30260: "0x1a92c25cb7cd80e1138e8125fc0a0b0642688c0b"
    }
  },
  "usdt0": {
    name: "Tether",
    jurisdiction: "APAC", /* BVI/HK */
    infrastructure: "Unknown",
    type: "Issuer",
    regulator: "None",
    confidence: "medium",
    addresses: {
      30260: "0x6de0d56e2d695db9e2b4fbeca3d81372c59848bb"
    }
  }
};

// --- Helper Functions ---

export function getDVNMetadata(address, chainId) {
  const addr = address?.toLowerCase();

  // 1. Direct Address Match
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    const chainAddr = dvn.addresses[chainId]?.toLowerCase();

    // Check if address matches for this chain OR if address is widely known (fuzzy)
    // For MVP, we respect the chainId map primarily
    if (chainAddr === addr) {
      return {
        id: key,
        ...dvn
      };
    }
  }

  // 2. Name Match (if address not found but name passed or mocked)
  // This helps when we only have a messy name string
  const name = address || '';
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    if (dvn.name.toLowerCase().includes(name.toLowerCase())) {
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
      return {
        name: dvn.name,
        addresses: dvn.addresses
      };
    }
  }
  return null;
}

export const CHAIN_INFO = {
  // --- V2 MAINNET EIDS ---
  30101: { name: "Ethereum", explorer: "https://etherscan.io", chainId: 1, nativeToken: "ETH" },
  30102: { name: "BNB Chain", explorer: "https://bscscan.com", chainId: 56, nativeToken: "BNB" },
  30106: { name: "Avalanche", explorer: "https://snowtrace.io", chainId: 43114, nativeToken: "AVAX" },
  30109: { name: "Polygon", explorer: "https://polygonscan.com", chainId: 137, nativeToken: "POL" },
  30110: { name: "Arbitrum", explorer: "https://arbiscan.io", chainId: 42161, nativeToken: "ETH" },
  30111: { name: "Optimism", explorer: "https://optimistic.etherscan.io", chainId: 10, nativeToken: "ETH" },
  30112: { name: "Fantom", explorer: "https://ftmscan.com", chainId: 250, nativeToken: "FTM" },
  30184: { name: "Base", explorer: "https://basescan.org", chainId: 8453, nativeToken: "ETH" },
  30183: { name: "Linea", explorer: "https://lineascan.build", chainId: 59144, nativeToken: "ETH" },
  30214: { name: "Scroll", explorer: "https://scrollscan.com", chainId: 534352, nativeToken: "ETH" },
  30165: { name: "zkSync", explorer: "https://explorer.zksync.io", chainId: 324, nativeToken: "ETH" },
  30255: { name: "Mode", explorer: "https://explorer.mode.network", chainId: 34443, nativeToken: "ETH" },
  30260: { name: "X Layer", explorer: "https://www.oklink.com/xlayer", chainId: 196, nativeToken: "OKB" },
  30266: { name: "Tenet", explorer: "https://tenetscan.io", chainId: 1559, nativeToken: "TENET" },
  30290: { name: "Mantle", explorer: "https://mantlescan.info", chainId: 5000, nativeToken: "MNT" },
  30243: { name: "Blast", explorer: "https://blastscan.io", chainId: 81457, nativeToken: "ETH" },
  30154: { name: "Gnosis", explorer: "https://gnosisscan.io", chainId: 100, nativeToken: "xDAI" },
  30150: { name: "Solana", explorer: "https://solscan.io", chainId: 0, nativeToken: "SOL" },
  30115: { name: "Polygon zkEVM", explorer: "https://zkevm.polygonscan.com", chainId: 1101, nativeToken: "ETH" },
  30151: { name: "Metis", explorer: "https://andromeda-explorer.metis.io", chainId: 1088, nativeToken: "METIS" },
  30138: { name: "Moonbeam", explorer: "https://moonscan.io", chainId: 1284, nativeToken: "GLMR" },
  30145: { name: "Kava", explorer: "https://kavascan.com", chainId: 2222, nativeToken: "KAVA" },
  30116: { name: "Celo", explorer: "https://celoscan.io", chainId: 42220, nativeToken: "CELO" },
  30121: { name: "Harmony", explorer: "https://explorer.harmony.one", chainId: 1666600000, nativeToken: "ONE" },
  30126: { name: "Moonriver", explorer: "https://moonriver.moonscan.io", chainId: 1285, nativeToken: "MOVR" },
  30118: { name: "Fuse", explorer: "https://explorer.fuse.io", chainId: 122, nativeToken: "FUSE" },
  30182: { name: "Klaytn", explorer: "https://klaytnscope.com", chainId: 8217, nativeToken: "KLAY" },
  30206: { name: "Viction", explorer: "https://vicscan.xyz", chainId: 88, nativeToken: "VIC" },
  30137: { name: "OKX", explorer: "https://www.oklink.com/okc", chainId: 66, nativeToken: "OKT" },

  // --- TESTNET EIDS (Common for devs/builders) ---
  40161: { name: "Sepolia", explorer: "https://sepolia.etherscan.io", chainId: 11155111, nativeToken: "ETH" },
  40231: { name: "Arbitrum Sepolia", explorer: "https://sepolia.arbiscan.io", chainId: 421614, nativeToken: "ETH" },
  40232: { name: "Optimism Sepolia", explorer: "https://sepolia-optimism.etherscan.io", chainId: 11155420, nativeToken: "ETH" },
  40245: { name: "Base Sepolia", explorer: "https://sepolia.basescan.org", chainId: 84532, nativeToken: "ETH" },
  40106: { name: "Avalanche Fuji", explorer: "https://testnet.snowtrace.io", chainId: 43113, nativeToken: "AVAX" },
  40109: { name: "Mumbai", explorer: "https://mumbai.polygonscan.com", chainId: 80001, nativeToken: "MATIC" },
  40102: { name: "BSC Testnet", explorer: "https://testnet.bscscan.com", chainId: 97, nativeToken: "tBNB" },
  40267: { name: "Amoy", explorer: "https://amoy.polygonscan.com", chainId: 80002, nativeToken: "POL" },
  40277: { name: "Story Testnet", explorer: "https://testnet.storyscan.xyz", chainId: 1513, nativeToken: "IP" }
};