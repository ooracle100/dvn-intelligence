# Historical Data Infrastructure Implementation Plan

## Overview
Build a historical data warehouse to power institutional-grade DVN/OApp analytics, providing 6-12 months of transaction history with enriched metrics.

## User Review Required

> [!IMPORTANT]
> **Database Choice**: Starting with SQLite for development. Can migrate to PostgreSQL/Supabase for production.
> **Backfill Scope**: Initial implementation targets top 10 DVNs from `dvnRegistry.js`
> **No Breaking Changes**: All new code in separate `/server` directory, existing frontend untouched

## Proposed Changes

### New Directory Structure

```
dvn-intelligence/
├── server/                    # [NEW] Backend data infrastructure
│   ├── database/
│   │   ├── schema.sql        # Database schema
│   │   ├── migrations/       # Version-controlled schema changes
│   │   └── db.js            # Database client
│   ├── services/
│   │   ├── backfill.js      # Historical data backfill
│   │   ├── lzScanClient.js  # LayerZero Scan API wrapper
│   │   └── priceOracle.js   # Price data integration
│   ├── scripts/
│   │   ├── run-backfill.js  # One-time backfill executor
│   │   └── sync-prices.js   # Historical price sync
│   └── config/
│       └── .env.example     # Environment variables template
├── data/                      # [NEW] Local database storage
│   └── .gitignore           # Ignore database files
└── docs/
    └── DATA_INFRASTRUCTURE.md  # [NEW] Architecture documentation
```

---

### Database Schema Design

#### **Transactions Table**
Primary source of truth for all cross-chain messages.

```sql
CREATE TABLE transactions (
  tx_hash TEXT PRIMARY KEY,
  source_tx_hash TEXT,
  timestamp INTEGER NOT NULL,
  source_chain_eid INTEGER,
  source_chain_name TEXT,
  destination_chain_eid INTEGER,
  destination_chain_name TEXT,
  oapp_address TEXT NOT NULL,
  amount_tokens TEXT,
  amount_usd REAL,
  token_symbol TEXT,
  required_dvn_addresses TEXT, -- JSON array
  optional_dvn_addresses TEXT, -- JSON array
  delivery_status TEXT,
  latency_seconds INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_tx_timestamp ON transactions(timestamp);
CREATE INDEX idx_tx_oapp ON transactions(oapp_address);
CREATE INDEX idx_tx_status ON transactions(delivery_status);
```

#### **DVN Attribution Table**
Maps each transaction to DVNs for performance tracking.

```sql
CREATE TABLE dvn_attribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dvn_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  attribution_type TEXT CHECK(attribution_type IN ('required', 'optional')),
  estimated_fee_usd REAL,
  FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash)
);

CREATE INDEX idx_dvn_attr ON dvn_attribution(dvn_address, attribution_type);
```

#### **Aggregated Metrics Table** (Pre-computed for fast queries)
```sql
CREATE TABLE dvn_metrics (
  dvn_address TEXT,
  time_period TEXT, -- 'daily', 'weekly', 'monthly', 'all_time'
  period_start INTEGER,
  period_end INTEGER,
  total_volume_usd REAL,
  total_volume_required_usd REAL,
  total_volume_optional_usd REAL,
  tx_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  avg_latency_seconds REAL,
  unique_oapps INTEGER,
  PRIMARY KEY (dvn_address, time_period, period_start)
);
```

---

### API Integration Strategy

#### **LayerZero Scan API**
**Endpoint:** `https://layerzeroscan.com/api/trpc/messages.list`

**Query Parameters:**
```javascript
{
  network: 'mainnet',
  filters: {
    dvnAddress: '0x...',      // Filter by DVN
    oappAddress: '0x...',     // Filter by OApp
    status: 'DELIVERED',
    created: {
      from: 1698796800,       // Unix timestamp
      to: 1706659200
    }
  },
  limit: 100,
  cursor: 'next_page_token'
}
```

**Rate Limiting:**
- Max 10 requests/second (assumed conservative)
- Implement exponential backoff

#### **Price Oracle Integration**
**Primary:** CoinGecko API (free tier: 50 calls/min)
**Fallback:** CoinMarketCap API

**Strategy:**
1. Batch price requests by day (reduce API calls)
2. Cache prices in separate `token_prices` table
3. Use linear interpolation for missing hourly data

---

### Backfill Script Architecture

#### **Phase 1: Setup (Preparation)**
```javascript
// 1. Load DVN registry (top 10)
// 2. Initialize database
// 3. Set date range (6 months back)
// 4. Calculate total API calls needed
```

#### **Phase 2: Data Collection**
```javascript
// For each DVN:
//   For each month in range:
//     1. Fetch transactions (paginated)
//     2. Extract token transfers
//     3. Queue price lookups
//     4. Insert into transactions table
//     5. Create DVN attributions
//     6. Log progress
```

#### **Phase 3: Enrichment**
```javascript
// 1. Fetch historical prices (batch by day)
// 2. Update transactions with USD values
// 3. Calculate aggregated metrics
// 4. Generate summary report
```

#### **Progress Tracking**
```javascript
{
  dvn: "Deutsche Telekom",
  status: "in_progress",
  processed: 12450,
  total: 24800,
  currentMonth: "2025-08",
  errors: []
}
```

---

### Error Handling & Resilience

1. **API Failures:**
   - Retry with exponential backoff (3 attempts)
   - Log failed requests to `errors.log`
   - Resume from last checkpoint

2. **Data Validation:**
   - Reject transactions with missing critical fields
   - Flag suspicious USD values for manual review
   - Track data quality metrics

3. **Checkpointing:**
   - Save progress every 100 transactions
   - Allow script to resume from failures

---

## Verification Plan

### Automated Tests
1. **Database Schema:**
   - Validate foreign key constraints
   - Test index performance

2. **Backfill Script:**
   - Unit test: API response parsing
   - Integration test: 1 DVN, 1 week of data
   - Validate: Total volume matches LayerZero Scan UI

### Manual Verification
1. Run backfill for **Deutsche Telekom** (6 months)
2. Compare results:
   - Total transactions: Should match LayerZero Scan count
   - Volume USD: Cross-reference with known Stargate/Ondo volumes
3. Test UI: DVN Profile should show historical chart

---

## Deployment Strategy

### Development (Local)
```bash
# 1. Install dependencies
npm install better-sqlite3 dotenv axios

# 2. Set up environment
cp server/config/.env.example .env

# 3. Initialize database
node server/database/migrations/001_initial.js

# 4. Run backfill (test mode)
node server/scripts/run-backfill.js --dvn=deutsche-telekom --days=7
```

### Production (Vercel)
1. **Database:** Migrate to Vercel Postgres
2. **Backfill:** Run once locally, export to production DB
3. **Polling:** Vercel Cron Job (every 5 minutes)

---

## Timeline

| **Day** | **Milestone** |
|---------|---------------|
| 1 | Database schema + API client |
| 2 | Backfill script core logic |
| 3 | Price oracle integration |
| 4 | Test with 1 DVN (7 days) |
| 5 | Run full 6-month backfill (top 10 DVNs) |
| 6 | Update UI to consume historical data |
| 7 | Documentation + handoff |

---

## Risks & Mitigations

| **Risk** | **Mitigation** |
|----------|----------------|
| LayerZero API rate limits hit | Implement request queue with throttling |
| Price data incomplete | Use fallback APIs, linear interpolation |
| SQLite performance degrades | Plan migration to PostgreSQL early |
| Backfill takes too long | Parallelize by DVN, cache intermediate results |

---

## Next Steps

1. ✅ Review this plan
2. Create `/server` directory structure
3. Implement database schema
4. Build LayerZero Scan API client
5. Test with single DVN
