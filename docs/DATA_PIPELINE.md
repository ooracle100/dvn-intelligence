# DVN Intelligence - Volume Implementation Guide

**Created:** January 28, 2026  
**Status:** In Progress

---

## Problem Statement

Volume shows $0 across all DVN profiles despite individual transaction decoding working correctly.

## Root Cause Analysis

### Finding 1: Snapshot Generator Skips Decoding
In `scripts/generateDVNSnapshots.js`:

```javascript
// Line 120 in normalizeTransaction()
amountUsd: null, // Would require price lookups - skip for snapshots

// Lines 162-163 in calculateDVNMetrics()
// Calculate volume (placeholder - would need price data)
const totalVolume = 0; // Would sum tx.amountUsd if available
```

The generator was intentionally written to skip expensive API calls.

### Finding 2: Frontend Decoder Works
Individual transaction pages successfully decode amounts using:
1. Alchemy RPC → `eth_getTransactionReceipt` → gets logs
2. ethers.js → `parseLog()` → decodes OFTSent/Transfer events
3. DefiLlama → gets decimals + price → calculates USD value

### Finding 3: Aggregation Never Calls Decoder
When calculating `totalVolumeUsd` for DVN profiles, the code sums `amountUsd` fields from transactions.
Since all transactions have `amountUsd: null`, sum = $0.

---

## Solution: Pre-Calculate During Snapshot Generation

### Architecture

```
[Old Flow - Runtime Decoding (slow)]
User opens DVN page → Fetch 298 txs → Decode each (5+ hours) → Show volume

[New Flow - Pre-computed (instant)]
Snapshot Generator → Decode each tx (runs offline, takes hours) → Save decoded amounts
User opens DVN page → Load snapshot → Volume shows instantly
```

### Supported Chains

The decoder only works for chains with Alchemy RPC endpoints:

| Chain | EID | Chain ID | Alchemy Endpoint |
|-------|-----|----------|------------------|
| Ethereum | 30101 | 1 | eth-mainnet |
| BSC | 30102 | 56 | bnb-mainnet |
| Polygon | 30109 | 137 | polygon-mainnet |
| Arbitrum | 30110 | 42161 | arb-mainnet |
| Optimism | 30111 | 10 | opt-mainnet |
| Base | 30184 | 8453 | base-mainnet |
| Avalanche | 30106 | 43114 | avax-mainnet |

**Transactions on other chains (Dexalot, Plasma, Somnia, etc.) will have `amountUsd: null`.**

---

## Adding New Chains

When Alchemy adds support for a new chain, update these locations:

### 1. Snapshot Generator (`scripts/generateDVNSnapshots.js`)

```javascript
// Add to ALCHEMY_ENDPOINTS
const ALCHEMY_ENDPOINTS = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    // ... existing chains ...
    NEW_CHAIN_ID: `https://NEW-CHAIN-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

// Add to EID_TO_CHAINID
const EID_TO_CHAINID = {
    30101: 1,   // Ethereum
    // ... existing mappings ...
    NEW_EID: NEW_CHAIN_ID,  // New Chain
};

// Add to DEFILLAMA_CHAINS
const DEFILLAMA_CHAINS = {
    1: 'ethereum',
    // ... existing chains ...
    NEW_CHAIN_ID: 'new-chain-name',  // as used by DefiLlama
};
```

### 2. Frontend Service (`src/services/IntelligenceService.js`)

Same pattern - add the chain to `ALCHEMY_ENDPOINTS` and chain mappings.

### 3. Re-run Snapshot Generation

```bash
node scripts/generateDVNSnapshots.js
```

---

## Rate Limits

- **Alchemy Free Tier:** 300 compute units/second
- **eth_getTransactionReceipt:** ~15 CU per call
- **Effective rate:** ~20 transactions/second
- **For 20,000 transactions:** ~17 minutes of API calls

The generator includes 100ms delays between calls to stay well under limits.

---

## Known Limitations

1. **Chain Coverage:** Only 7 chains supported (where Alchemy works)
2. **Token Coverage:** DefiLlama must have price data for the token
3. **Historical Accuracy:** Prices are current, not at transaction time
4. **Volume is Approximate:** Some transactions won't decode (unknown tokens, unsupported chains)

---

## Files Modified

- `scripts/generateDVNSnapshots.js` - Added decoder logic
- `src/data/dvnSnapshots.json` - Will contain decoded amounts after regeneration
- `docs/volume_implementation.md` - This document

---

## Running the Generator

```bash
# From project root
node scripts/generateDVNSnapshots.js

# Expected output:
# - Fetches ~20,000 transactions
# - Decodes amounts for supported chains (takes 15-30 min)
# - Saves to src/data/dvnSnapshots.json
# - Shows volume statistics at end
```

After running, restart the dev server to see updated volume data.
