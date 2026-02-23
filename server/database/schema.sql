-- DVN Intelligence Database Schema
-- Version: 1.0
-- Purpose: Store historical LayerZero transaction data for DVN/OApp analytics

-- ============================================================================
-- Transactions Table
-- ============================================================================
-- Primary source of truth for all cross-chain messages
CREATE TABLE IF NOT EXISTS transactions (
  tx_hash TEXT PRIMARY KEY,
  source_tx_hash TEXT,
  timestamp INTEGER NOT NULL,
  source_chain_eid INTEGER,
  source_chain_name TEXT,
  destination_chain_eid INTEGER,
  destination_chain_name TEXT,
  oapp_address TEXT NOT NULL,
  amount_tokens TEXT,          -- Store as string to preserve precision
  amount_usd REAL,
  token_symbol TEXT,
  required_dvn_addresses TEXT, -- JSON array: ["0x123...", "0x456..."]
  optional_dvn_addresses TEXT, -- JSON array
  delivery_status TEXT,        -- DELIVERED, FAILED, PENDING, INFLIGHT
  latency_seconds INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_tx_oapp ON transactions(oapp_address);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(delivery_status);
CREATE INDEX IF NOT EXISTS idx_tx_source_chain ON transactions(source_chain_eid);
CREATE INDEX IF NOT EXISTS idx_tx_dest_chain ON transactions(destination_chain_eid);

-- ============================================================================
-- DVN Attribution Table
-- ============================================================================
-- Maps each transaction to DVNs for performance tracking
CREATE TABLE IF NOT EXISTS dvn_attribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dvn_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  attribution_type TEXT CHECK(attribution_type IN ('required', 'optional')),
  estimated_fee_usd REAL,
  FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dvn_attr ON dvn_attribution(dvn_address, attribution_type);
CREATE INDEX IF NOT EXISTS idx_dvn_tx ON dvn_attribution(tx_hash);

-- ============================================================================
-- Aggregated Metrics Table
-- ============================================================================
-- Pre-computed metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS dvn_metrics (
  dvn_address TEXT,
  time_period TEXT,             -- 'daily', 'weekly', 'monthly', 'all_time'
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

CREATE INDEX IF NOT EXISTS idx_metrics_period ON dvn_metrics(time_period, period_start);

-- ============================================================================
-- OApp Metrics Table
-- ============================================================================
-- Pre-computed metrics for OApp/OFT analytics (Volume, Corridors)
CREATE TABLE IF NOT EXISTS oapp_metrics (
  oapp_address TEXT,
  period_start INTEGER,         -- Start of day/week (Unix timestamp)
  time_period TEXT,             -- 'daily', 'weekly', 'monthly', 'all_time'
  source_chain_eid INTEGER DEFAULT 0, -- 0 = All chains aggregated
  dest_chain_eid INTEGER DEFAULT 0,   -- 0 = All chains aggregated
  volume_usd REAL DEFAULT 0,
  tx_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,     -- Optional: future expansion
  PRIMARY KEY (oapp_address, time_period, period_start, source_chain_eid, dest_chain_eid)
);

CREATE INDEX IF NOT EXISTS idx_oapp_metrics_lookup ON oapp_metrics(oapp_address, time_period);

-- ============================================================================
-- Token Prices Table
-- ============================================================================
-- Cache historical token prices to reduce API calls
CREATE TABLE IF NOT EXISTS token_prices (
  token_symbol TEXT,
  timestamp INTEGER,            -- Unix timestamp (daily granularity)
  price_usd REAL,
  source TEXT,                  -- 'coingecko', 'coinmarketcap'
  PRIMARY KEY (token_symbol, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_lookup ON token_prices(token_symbol, timestamp);

-- ============================================================================
-- Backfill Progress Table
-- ============================================================================
-- Track backfill script progress for resumability
CREATE TABLE IF NOT EXISTS backfill_progress (
  dvn_address TEXT PRIMARY KEY,
  dvn_name TEXT,
  last_processed_timestamp INTEGER,
  total_transactions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, failed
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER
);

-- ============================================================================
-- Error Log Table
-- ============================================================================
-- Track API failures and data issues
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  error_type TEXT,              -- 'api_failure', 'data_validation', 'price_lookup'
  context TEXT,                 -- JSON with additional details
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_timestamp ON error_log(timestamp);
