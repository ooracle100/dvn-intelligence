# Data Infrastructure Documentation

## Overview
Historical data warehouse for LayerZero DVN/OApp analytics. Provides institutional-grade metrics with 6-month transaction history.

## Architecture

### Database Schema
- **transactions**: Source of truth for all cross-chain messages
- **dvn_attribution**: Maps DVNs to transactions (required/optional)
- **dvn_metrics**: Pre-computed aggregated metrics for fast queries
- **token_prices**: Historical price cache
- **backfill_progress**: Tracks backfill state for resumability
- **error_log**: API failures and data issues

### Components
1. **Database Client** (`server/database/db.js`): SQLite wrapper with transaction insert, metrics calculation
2. **LayerZero Scan Client** (`server/services/lzScanClient.js`): API client with rate limiting, pagination
3. **Backfill Service** (`server/services/backfill.js`): Orchestration logic with progress tracking
4. **CLI Script** (`server/scripts/run-backfill.js`): User-facing backfill execution

## Usage

### Initialize Database
```bash
node server/database/migrations/001_initial.js
```

### Run Backfill

**Test mode** (7 days, single DVN):
```bash
node server/scripts/run-backfill.js --dvn=deutsche-telekom --days=7
```

**Production** (6 months, top 10 DVNs):
```bash
node server/scripts/run-backfill.js --all
```

**Force re-run**:
```bash
node server/scripts/run-backfill.js --dvn=google-cloud --force
```

## Configuration

Environment variables (`.env`):
```
DATABASE_PATH=./data/dvn_intelligence.db
BACKFILL_MONTHS=6
BACKFILL_BATCH_SIZE=100
BACKFILL_RATE_LIMIT_MS=100
```

## Data Flow

1. **Fetch**: LayerZero Scan API → Messages (paginated)
2. **Parse**: Extract DVN addresses, chains, status, latency
3. **Insert**: Transactions + DVN attributions (batched)
4. **Aggregate**: Calculate metrics (volume, success rate, latency)
5. **Track**: Update backfill_progress for resumability

## Next Steps

1. Price oracle integration (CoinGecko/CMC)
2. Frontend integration (query historical data)
3. Polling service (continuous updates)
4. Migration to PostgreSQL (production)

## Database Location

- **Development**: `./data/dvn_intelligence.db` (gitignored)
- **Production**: Vercel Postgres (TBD)
