// scripts/generateDVNSnapshots.js
// Institutional-grade batch processor for DVN performance snapshots
// NOW WITH VOLUME DECODING via Alchemy + DefiLlama

const fs = require('fs');
const path = require('path');

const LZSCAN_API = "https://scan.layerzero-api.com/v1";
const DVN_REGISTRY_PATH = path.join(__dirname, '../src/utils/dvnRegistry.js');
const OUTPUT_PATH = path.join(__dirname, '../src/data/dvnSnapshots.json');

// ============================================================================
// ALCHEMY CONFIGURATION
// To add a new chain: Add entry to all three mappings below
// ============================================================================

const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || "TMZ0kU6zNU96mworBk8LV";

// Chain ID → Alchemy RPC endpoint
const ALCHEMY_ENDPOINTS = {
  1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  56: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  137: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  10: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  8453: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  43114: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
};

// LayerZero EID → Chain ID mapping
const EID_TO_CHAINID = {
  30101: 1,     // Ethereum
  30102: 56,    // BSC
  30109: 137,   // Polygon
  30110: 42161, // Arbitrum
  30111: 10,    // Optimism
  30184: 8453,  // Base
  30106: 43114  // Avalanche
};

// Chain ID → DefiLlama chain name
const DEFILLAMA_CHAINS = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  43114: 'avax'
};

// ============================================================================
// KNOWN TOKENS REGISTRY (for reliable decoding)
// ============================================================================

const KNOWN_TOKENS = {
  // USDC (6 decimals, $1)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, price: 1 },
  '0x27a16dc786820b16e5c9028b75b99f6f604b5d26': { symbol: 'USDC', decimals: 6, price: 1 },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, price: 1 },
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, price: 1 },
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6, price: 1 },
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, price: 1 },
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18, price: 1 },
  // USDT (6 decimals, $1)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, price: 1 },
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6, price: 1 },
  '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': { symbol: 'USDT', decimals: 6, price: 1 },
  '0x14e4a1b13bf7f943c8ff7c51fb60fa964a298d92': { symbol: 'USDT0', decimals: 6, price: 1 },
  // WETH (18 decimals)
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18 },
};

// ============================================================================
// ABI DEFINITIONS FOR DECODING
// ============================================================================

// OFTSent event signature: keccak256("OFTSent(bytes32,uint32,address,uint256,uint256)")
const OFTSENT_TOPIC = '0x85496b760a4b7f8d66384b9df21b381f5d1b1e79f229a47aaf4c232edc2fe59a';

// Transfer event signature: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load DVN Registry to get all DVN IDs
function loadDVNRegistry() {
  const content = fs.readFileSync(DVN_REGISTRY_PATH, 'utf8');
  const match = content.match(/export const DVN_REGISTRY = ({[\s\S]*?});/);
  if (!match) throw new Error('Could not parse DVN_REGISTRY');
  const registryCode = match[1];
  const DVN_REGISTRY = eval(`(${registryCode})`);
  return DVN_REGISTRY;
}

// ============================================================================
// TRANSACTION DECODER
// ============================================================================

async function decodeTransactionAmount(txHash, sourceEid) {
  const chainId = EID_TO_CHAINID[sourceEid];
  if (!chainId) return null; // Unsupported chain

  const endpoint = ALCHEMY_ENDPOINTS[chainId];
  if (!endpoint) return null;

  try {
    // Get transaction receipt
    const receiptRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });

    const receiptData = await receiptRes.json();
    const receipt = receiptData.result;

    if (!receipt || !receipt.logs) return null;

    // Look for OFTSent or Transfer events
    for (const log of receipt.logs) {
      if (!log.topics || log.topics.length === 0) continue;

      const topic0 = log.topics[0];
      const tokenAddress = log.address.toLowerCase();

      let rawAmount = null;

      // Try OFTSent event
      if (topic0 === OFTSENT_TOPIC && log.data && log.data.length >= 130) {
        // OFTSent data: dstEid(32) + amountSentLD(32) + amountReceivedLD(32)
        // amountSentLD is at offset 32 (64 hex chars after 0x)
        const amountHex = '0x' + log.data.slice(66, 130);
        rawAmount = BigInt(amountHex);
      }
      // Try Transfer event
      else if (topic0 === TRANSFER_TOPIC && log.data) {
        rawAmount = BigInt(log.data);
      }

      if (rawAmount && rawAmount > 0n) {
        // Get token info
        const tokenInfo = await getTokenInfo(tokenAddress, chainId);

        if (tokenInfo.decimals) {
          const amountTokens = Number(rawAmount) / Math.pow(10, tokenInfo.decimals);

          if (amountTokens > 0 && amountTokens < 1e15 && tokenInfo.price > 0) {
            const amountUsd = amountTokens * tokenInfo.price;
            return {
              amountTokens: amountTokens.toFixed(6),
              amountUsd: amountUsd.toFixed(2),
              symbol: tokenInfo.symbol
            };
          }
        }
      }
    }

    return null;
  } catch (e) {
    // Silently fail - many transactions won't decode
    return null;
  }
}

// Token info cache
const tokenCache = new Map();

async function getTokenInfo(tokenAddress, chainId) {
  const cacheKey = `${chainId}:${tokenAddress}`;
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  // Check known tokens first
  const known = KNOWN_TOKENS[tokenAddress.toLowerCase()];
  if (known) {
    // For WETH, fetch current ETH price
    if (known.symbol === 'WETH' && !known.price) {
      try {
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const priceData = await priceRes.json();
        known.price = priceData.ethereum?.usd || 3000;
      } catch (e) {
        known.price = 3000; // Fallback
      }
    }
    tokenCache.set(cacheKey, known);
    return known;
  }

  // Fallback to DefiLlama
  const info = { symbol: 'UNKNOWN', decimals: 18, price: 0 };

  try {
    const chainName = DEFILLAMA_CHAINS[chainId];
    if (chainName) {
      const priceRes = await fetch(
        `https://coins.llama.fi/prices/current/${chainName}:${tokenAddress}`
      );
      const priceData = await priceRes.json();
      const coinData = priceData.coins?.[`${chainName}:${tokenAddress}`];

      if (coinData) {
        if (coinData.price) info.price = coinData.price;
        if (coinData.decimals) info.decimals = coinData.decimals;
        if (coinData.symbol) info.symbol = coinData.symbol;
      }
    }
  } catch (e) {
    // Use defaults
  }

  tokenCache.set(cacheKey, info);
  return info;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchTransactionBatch(limit = 100) {
  try {
    const url = `${LZSCAN_API}/messages/latest?limit=${limit}`;
    console.log(`  Fetching batch (limit: ${limit})...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const messages = json.data || [];

    console.log(`  ✓ Received ${messages.length} messages`);
    return messages;

  } catch (error) {
    console.error(`  ✗ Batch fetch failed:`, error.message);
    return [];
  }
}

async function fetchLargeDataset(targetSize = 10000) {
  console.log(`\n📥 Fetching ${targetSize} transactions from LayerZero...`);

  const allMessages = [];
  const batchSize = 100;
  const maxBatches = Math.ceil(targetSize / batchSize);

  for (let i = 0; i < maxBatches; i++) {
    console.log(`\nBatch ${i + 1}/${maxBatches}:`);

    const batch = await fetchTransactionBatch(batchSize);

    if (batch.length === 0) {
      console.log(`  ℹ️  No more data available`);
      break;
    }

    allMessages.push(...batch);
    console.log(`  Total collected: ${allMessages.length}`);

    if (i < maxBatches - 1) {
      console.log(`  ⏳ Waiting 1s...`);
      await sleep(1000);
    }

    if (batch.length < batchSize) {
      console.log(`  ℹ️  Reached end of available data`);
      break;
    }
  }

  console.log(`\n✅ Collected ${allMessages.length} total transactions`);
  return allMessages;
}

// ============================================================================
// TRANSACTION PROCESSING
// ============================================================================

async function normalizeTransaction(msg, index, total) {
  const src = msg.source?.tx || {};
  const dst = msg.destination?.tx || {};
  const pathway = msg.pathway || {};
  const config = msg.config?.outboundConfig || msg.config || {};

  let status = 'PENDING';
  const statusName = msg.status?.name || msg.status || '';

  if (dst.txHash || statusName === 'DELIVERED') {
    status = 'Delivered';
  } else if (statusName === 'FAILED') {
    status = 'Failed';
  } else if (statusName === 'INFLIGHT') {
    status = 'Inflight';
  }

  const sourceEid = pathway.srcEid;
  const sourceTxHash = src.txHash;

  // Decode amount (only for supported chains)
  let amountUsd = null;
  let amountTokens = null;
  let symbol = null;

  if (sourceTxHash && sourceEid && EID_TO_CHAINID[sourceEid]) {
    if (index % 100 === 0) {
      console.log(`  📊 Decoding tx ${index + 1}/${total}...`);
    }

    const decoded = await decodeTransactionAmount(sourceTxHash, sourceEid);
    if (decoded) {
      amountUsd = parseFloat(decoded.amountUsd);
      amountTokens = decoded.amountTokens;
      symbol = decoded.symbol;
    }

    // Rate limiting: 100ms between Alchemy calls
    await sleep(100);
  }

  return {
    sourceChain: sourceEid,
    destChain: pathway.dstEid,
    oappAddress: pathway.sender?.address,
    requiredDVNs: (config.requiredDVNs || []).map(a => a.toLowerCase()),
    optionalDVNs: (config.optionalDVNs || []).map(a => a.toLowerCase()),
    requiredDVNNames: config.requiredDVNNames || [],
    status,
    latency: (dst.blockTimestamp && src.blockTimestamp) ? dst.blockTimestamp - src.blockTimestamp : null,
    amountUsd,
    amountTokens,
    symbol,
    timestamp: src.blockTimestamp
  };
}

// ============================================================================
// DVN METRICS CALCULATION
// ============================================================================

function calculateDVNMetrics(transactions, dvnId, dvnData) {
  console.log(`\n  Analyzing ${dvnId}...`);

  const dvnAddresses = Object.values(dvnData.addresses || {}).map(a => a.toLowerCase());

  if (dvnAddresses.length === 0) {
    console.log(`    ⚠️  No addresses configured`);
    return null;
  }

  const dvnTxs = transactions.filter(tx => {
    const allDVNs = [...tx.requiredDVNs, ...tx.optionalDVNs];
    return dvnAddresses.some(addr => allDVNs.includes(addr));
  });

  if (dvnTxs.length === 0) {
    console.log(`    ⚠️  No transactions found`);
    return null;
  }

  console.log(`    ✓ Found ${dvnTxs.length} transactions`);

  // Success rate
  const delivered = dvnTxs.filter(tx => tx.status === 'Delivered').length;
  const failed = dvnTxs.filter(tx => tx.status === 'Failed').length;
  const inflight = dvnTxs.filter(tx => tx.status === 'Inflight').length;
  const successRate = dvnTxs.length > 0 ? (delivered / dvnTxs.length) * 100 : 0;

  // Latency
  const deliveredTxs = dvnTxs.filter(tx => tx.status === 'Delivered' && tx.latency);
  const avgLatency = deliveredTxs.length > 0
    ? deliveredTxs.reduce((sum, tx) => sum + tx.latency, 0) / deliveredTxs.length
    : null;

  // VOLUME - Now calculated from decoded amounts!
  const txsWithVolume = dvnTxs.filter(tx => tx.amountUsd && tx.amountUsd > 0);
  const totalVolume = txsWithVolume.reduce((sum, tx) => sum + tx.amountUsd, 0);
  const avgTransactionSize = txsWithVolume.length > 0 ? totalVolume / txsWithVolume.length : 0;

  console.log(`    💰 Volume: $${totalVolume.toFixed(2)} from ${txsWithVolume.length} decoded txs`);

  // Unique OApps
  const uniqueOApps = new Set(dvnTxs.map(tx => tx.oappAddress).filter(Boolean));

  // Top routes
  const routes = {};
  dvnTxs.forEach(tx => {
    if (tx.sourceChain && tx.destChain) {
      const route = `${tx.sourceChain}-${tx.destChain}`;
      routes[route] = (routes[route] || 0) + 1;
    }
  });
  const topRoutes = Object.entries(routes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  // DVN stacks with full metrics
  const stackMetrics = {};
  dvnTxs.forEach(tx => {
    const stackName = tx.requiredDVNNames.sort().join(' + ') || 'Unknown';

    if (!stackMetrics[stackName]) {
      stackMetrics[stackName] = {
        count: 0,
        delivered: 0,
        totalLatency: 0,
        latencyCount: 0,
        totalVolume: 0
      };
    }

    stackMetrics[stackName].count++;

    if (tx.status === 'Delivered') {
      stackMetrics[stackName].delivered++;
      if (tx.latency) {
        stackMetrics[stackName].totalLatency += tx.latency;
        stackMetrics[stackName].latencyCount++;
      }
    }

    if (tx.amountUsd) {
      stackMetrics[stackName].totalVolume += tx.amountUsd;
    }
  });

  const topStacks = Object.entries(stackMetrics)
    .map(([stack, metrics]) => ({
      stack,
      count: metrics.count,
      successRate: parseFloat(((metrics.delivered / metrics.count) * 100).toFixed(1)),
      avgLatency: metrics.latencyCount > 0 ? parseFloat((metrics.totalLatency / metrics.latencyCount).toFixed(1)) : null,
      totalVolumeUsd: metrics.totalVolume.toFixed(2)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    transactionCount: dvnTxs.length,
    successRate: parseFloat(successRate.toFixed(2)),
    avgLatency: avgLatency ? parseFloat(avgLatency.toFixed(1)) : null,
    totalVolume: parseFloat(totalVolume.toFixed(2)),
    avgTransactionSize: parseFloat(avgTransactionSize.toFixed(2)),
    decodedTransactions: txsWithVolume.length,
    uniqueOApps: uniqueOApps.size,
    topRoutes,
    topStacks,
    delivered,
    failed,
    inflight,
    lastUpdated: new Date().toISOString()
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  DVN Performance Snapshot Generator                    ║');
  console.log('║  WITH VOLUME DECODING (Alchemy + DefiLlama)            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // Load DVN Registry
    console.log('\n📖 Loading DVN Registry...');
    const DVN_REGISTRY = loadDVNRegistry();
    const dvnCount = Object.keys(DVN_REGISTRY).length;
    console.log(`✅ Loaded ${dvnCount} DVNs`);

    // Fetch transaction dataset
    const TARGET_SIZE = 5000; // Start smaller for testing, increase later
    const rawTransactions = await fetchLargeDataset(TARGET_SIZE);

    if (rawTransactions.length === 0) {
      throw new Error('Failed to fetch any transactions');
    }

    // Normalize and decode all transactions
    console.log('\n🔄 Normalizing and decoding transactions...');
    console.log('   (This may take 10-30 minutes for large datasets)');

    const normalized = [];
    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = await normalizeTransaction(rawTransactions[i], i, rawTransactions.length);
      normalized.push(tx);
    }

    const decodedCount = normalized.filter(tx => tx.amountUsd !== null).length;
    console.log(`\n✅ Normalized ${normalized.length} transactions`);
    console.log(`   💰 Successfully decoded ${decodedCount} with USD values`);

    // Calculate metrics for each DVN
    console.log('\n📊 Calculating DVN metrics...');
    const snapshots = {};
    let processedCount = 0;
    let skippedCount = 0;
    let totalVolumeAllDVNs = 0;

    for (const [dvnId, dvnData] of Object.entries(DVN_REGISTRY)) {
      const metrics = calculateDVNMetrics(normalized, dvnId, dvnData);

      if (metrics) {
        snapshots[dvnId] = metrics;
        processedCount++;
        totalVolumeAllDVNs += metrics.totalVolume;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Processed ${processedCount} DVNs`);
    console.log(`⚠️  Skipped ${skippedCount} DVNs (no data)`);

    // Add metadata
    const output = {
      _metadata: {
        generatedAt: new Date().toISOString(),
        sampleSize: normalized.length,
        decodedTransactions: decodedCount,
        dvnsAnalyzed: processedCount,
        totalVolumeUsd: totalVolumeAllDVNs,
        supportedChains: Object.keys(EID_TO_CHAINID).map(eid => `EID ${eid}`),
        dataSource: 'LayerZero Scan API + Alchemy + DefiLlama',
        updateFrequency: 'Weekly recommended'
      },
      dvns: snapshots
    };

    // Write to file
    console.log('\n💾 Writing snapshot file...');
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✅ Saved to: ${OUTPUT_PATH}`);

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Generation Complete                                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`  - Sample size: ${normalized.length} transactions`);
    console.log(`  - Decoded with USD: ${decodedCount} (${(decodedCount / normalized.length * 100).toFixed(1)}%)`);
    console.log(`  - Total volume: $${totalVolumeAllDVNs.toFixed(2)}`);
    console.log(`  - DVNs with data: ${processedCount}`);
    console.log(`  - Time elapsed: ${elapsed} minutes`);
    console.log(`  - Output file: src/data/dvnSnapshots.json`);
    console.log(`\n⚡ Next step: Restart your dev server to load new data\n`);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run
main();