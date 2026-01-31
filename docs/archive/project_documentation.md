# DVN Intelligence - Complete Project Documentation

## Project Overview

**Project Name:** DVN Intelligence  
**Version:** 1.1  
**Purpose:** Institutional-grade analytics platform for LayerZero DVN (Decentralized Verification Network) performance analysis  
**Target Audience:** Builders, Institutions, Traders making cross-chain infrastructure decisions  
**Tech Stack:** React, JavaScript, LayerZeroScan API, Etherscan V2 API, DeFiLlama, CoinGecko

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DVN Intelligence UI                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │HomeView │ │ DVNView  │ │ OAppView │ │TransactionView  │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───────┬─────────┘ │
└───────┼───────────┼────────────┼───────────────┼───────────┘
        │           │            │               │
        ▼           ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ dvn_data.json  │  │  lzscanApi.js  │  │ dvnRegistry.js│ │
│  │ (Static Data)  │  │ (Live Search)  │  │ (DVN Metadata)│ │
│  └────────────────┘  └───────┬────────┘  └───────────────┘ │
└──────────────────────────────┼──────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│LayerZeroScan │      │ Etherscan V2 │      │  DeFiLlama   │
│     API      │      │     API      │      │  CoinGecko   │
│              │      │              │      │              │
│ - TX Details │      │ - Fee Events │      │ - USD Prices │
│ - DVN Config │      │ - Gas Costs  │      │ - ETH Price  │
│ - Delivery   │      │ - OFT Amount │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

## File Structure

```
dvn-intelligence/
├── public/
│   └── dvn_data.json        # Static dataset (2509 tx, Base→Ethereum)
├── src/
│   ├── App.jsx              # Main component, routing, state
│   ├── components/
│   │   ├── Header.jsx       # Navigation header
│   │   ├── MetricCard.jsx   # Reusable stat card
│   │   ├── TransactionTable.jsx
│   │   ├── FeeBreakdownCard.jsx
│   │   ├── StackRecommender.jsx  # DVN stack recommendations
│   │   ├── EfficiencyMatrix.jsx  # Route performance matrix
│   │   └── views/
│   │       ├── HomeView.jsx        # Dashboard home
│   │       ├── EnhancedDvnView.jsx # DVN detail page
│   │       ├── OappView.jsx        # OApp detail page
│   │       └── TransactionView.jsx # Single TX view
│   └── utils/
│       ├── lzscanApi.js     # Live search + enrichment
│       ├── dvnRegistry.js   # DVN addresses + metadata
│       ├── dvn.js           # Scoring/aggregation logic
│       ├── format.js        # Formatting utilities
│       ├── assetRegistry.js # OFT/token metadata
│       └── unifiedSearch.js # Search router
├── .env.local               # API keys (REACT_APP_ETHERSCAN_KEY)
└── package.json
```

---

## Data Sources

### 1. Static Dataset (`dvn_data.json`)
- **Source:** Flipside Analytics (SQL queries) + LayerZeroScan validation
- **Content:** 2,509 transactions, Base→Ethereum route only
- **Fields:** 36 columns including DVN addresses, fees, latency, status
- **Issue:** All transactions show "Delivered" - no failures in dataset

### 2. LayerZeroScan API
- **Base URL:** `https://scan.layerzero-api.com/v1`
- **Endpoints Used:**
  - `GET /messages/tx/{txHash}` - Single transaction
  - `GET /messages/oapp/{chainId}/{address}` - OApp transactions
  - `GET /messages/status/{status}` - INFLIGHT/BLOCKED/FAILED messages
- **Data Provided:** DVN config, delivery status, latency, routing

### 3. Etherscan V2 Unified API
- **Base URL:** `https://api.etherscan.io/v2/api`
- **Purpose:** Extract fee events from transaction receipts
- **Event Signatures Parsed:**
  - DVNFeePaid (V1): `0x2f32cdb6...`
  - DVNFeePaid (V2): `0x07ea52d8...`
  - ExecutorFeePaid: `0x67438c46...` / `0x61ed099e...`
  - OFTSent: `0x85496b76...`
- **Limitation:** Free key doesn't support all chains (Base fails)

### 4. Price Oracles
- **DeFiLlama:** Token prices via `https://coins.llama.fi/prices/current/{chain}:{address}`
- **CoinGecko:** Native token prices (ETH, BNB, etc.)

---

## Key Features Implemented

### 1. DVN Rankings (HomeView)
- Scores DVNs based on: delivery rate, volume, latency
- Color-coded tiers: Excellent (90+), Good (80+), Acceptable (70+)

### 2. Stack Recommender (OappView)
- Shows top DVN stacks for an OApp
- Badges: ⚡ FASTEST, 🛡️ RELIABLE

### 3. Efficiency Matrix (OappView)
- Route-level aggregation (Source → Destination)
- Metrics: Volume, Avg Latency, Avg Cost, Reliability, TX Count

### 4. DVN Jurisdiction Metadata (dvnRegistry.js)
- Each DVN tagged with: jurisdiction (EU/US/APAC), type, GDPR/SOC2 compliance
- Displayed as badges in EnhancedDvnView

### 5. Live Transaction Search
- Searches LayerZeroScan for any tx hash
- Enriches with Etherscan fee data
- Shows complete fee breakdown

### 6. Pending Messages Fetcher (fetchPendingMessages)
- Fetches real INFLIGHT/BLOCKED transactions from network
- NOT YET integrated into UI

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `REACT_APP_ETHERSCAN_KEY` | Etherscan V2 API key | Hardcoded free key |
| `REACT_APP_BSCSCAN_KEY` | BscScan API key | Falls back to generic |
| `REACT_APP_POLYGONSCAN_KEY` | PolygonScan API key | Falls back to generic |

---

## Running the Project

```bash
cd dvn-intelligence
npm install
npm start
# Opens at http://localhost:3000
```

---

## Known Limitations

1. **100% Success Rate Data** - Dataset has no failures
2. **Base Chain Fees** - Free Etherscan V2 key doesn't support Base
3. **No Historical Data** - Static snapshot, no time-series
4. **No Slashing Data** - DVN economic stake not available publicly
5. **Live Pending Not in UI** - Backend function exists but not displayed

---

## API Key Requirements for Full Functionality

| Chain | Free Key Works? | Paid Key Needed? |
|-------|-----------------|------------------|
| Ethereum | ✅ Yes | No |
| BSC | ⚠️ V1 only | For V2 |
| Base | ❌ No | Yes |
| Arbitrum | ❌ No | Yes |
| Optimism | ❌ No | Yes |
| Polygon | ⚠️ V1 only | For V2 |

