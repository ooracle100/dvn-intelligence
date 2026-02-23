#!/usr/bin/env node
/**
 * STRICT Aggregation Script for DVN Intelligence Tool
 * Date: 2026-02-15
 * 
 * PHILOSOPHY: "NO ASSUMPTIONS"
 * 
 * 1. Volume is ONLY calculated for OApps in `verified_oapps.json`.
 * 2. Only trusted payload types per OApp are included (filters out EXTENDED garbage).
 * 3. `amount_tokens` is the token count (already divided by shared decimals 10^6 by redecode_payloads.js).
 * 4. Formula: volume_usd = amount_tokens × price_usd
 * 5. Unverified OApps get volume = 0 but tx_count is preserved.
 * 6. Success rate: COUNT(DISTINCT tx_hash) to avoid >100% bug.
 * 
 * DATA PIPELINE TRACE:
 *   payloadDecoder.js → amountSD (raw BigInt)
 *   redecode_payloads.js → amount_tokens = amountSD / 1,000,000
 *   THIS SCRIPT → volume_usd = amount_tokens × price_usd
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const VERIFIED_OAPPS_PATH = path.join(__dirname, '../data/verified_oapps.json');

console.log('🛡️  STRICT Metrics Aggregation (NO ASSUMPTIONS)');
console.log(`📂 Database: ${DB_PATH}`);
console.log(`📜 Registry: ${VERIFIED_OAPPS_PATH}`);

// --- Load Verified Registry ---
if (!fs.existsSync(VERIFIED_OAPPS_PATH)) {
    console.error('❌ FATAL: verified_oapps.json not found. Cannot proceed without strict rules.');
    process.exit(1);
}

const verifiedOApps = JSON.parse(fs.readFileSync(VERIFIED_OAPPS_PATH, 'utf8'));
console.log(`✅ Loaded ${verifiedOApps.length} verified OApp rules.\n`);

const db = new Database(DB_PATH);

// --- Create Temp Table for SQL Joins ---
db.exec(`
    CREATE TEMP TABLE IF NOT EXISTS verified_tokens (
        address TEXT PRIMARY KEY,
        price_usd REAL NOT NULL,
        symbol TEXT,
        payload_types TEXT
    )
`);

const insertRule = db.prepare(
    'INSERT OR REPLACE INTO verified_tokens (address, price_usd, symbol, payload_types) VALUES (?, ?, ?, ?)'
);

db.transaction(() => {
    for (const oapp of verifiedOApps) {
        if (oapp.price_usd <= 0) {
            console.log(`   ⏭️  ${oapp.symbol}: price=$0, excluded from volume`);
            continue;
        }
        const payloadTypes = (oapp.trusted_payload_types || []).join(',');
        insertRule.run(oapp.address, oapp.price_usd, oapp.symbol, payloadTypes);
        console.log(`   ✅ ${oapp.symbol}: ×$${oapp.price_usd} | trust: [${payloadTypes}]`);
    }
})();

// --- Get Data Range ---
const dateRange = db.prepare(`
    SELECT 
        MIN(timestamp) as min_ts,
        MAX(timestamp) as max_ts,
        date(MIN(timestamp), 'unixepoch') as min_date,
        date(MAX(timestamp), 'unixepoch') as max_date
    FROM transactions
`).get();

console.log(`\n📅 Data Range: ${dateRange.min_date} to ${dateRange.max_date}`);
console.log(`   ~${Math.round((dateRange.max_ts - dateRange.min_ts) / 86400 / 30)} months of data\n`);

// --- Clear Existing Metrics ---
console.log('🗑️  Clearing existing metrics...');
db.exec('DELETE FROM dvn_metrics');
db.exec('DELETE FROM oapp_metrics');

// =============================================================================
// DVN METRICS: All-time
// =============================================================================
console.log('📈 [1/5] Aggregating DVN metrics (all-time)...');

/**
 * Volume logic:
 * - LEFT JOIN verified_tokens ON oapp_address
 * - Only include volume where:
 *   a) v.address IS NOT NULL (OApp is in registry)
 *   b) payload_type is in the trusted list for that OApp
 *   c) amount_tokens is not NULL, not 'UNKNOWN', and > 0
 * - Formula: CAST(amount_tokens AS REAL) * v.price_usd
 * 
 * Success rate logic:
 * - COUNT(DISTINCT tx_hash WHERE delivered) to avoid >100% from multi-DVN attribution
 */

const dvnAllTime = db.prepare(`
    INSERT INTO dvn_metrics (
        dvn_address, time_period, period_start, period_end,
        total_volume_usd, tx_count, success_count, failure_count,
        avg_latency_seconds, unique_oapps
    )
    SELECT 
        a.dvn_address,
        'all_time' as time_period,
        ? as period_start,
        ? as period_end,
        COALESCE(SUM(
            CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND t.amount_tokens != 'UNKNOWN'
                     AND t.amount_tokens != '0'
                     AND CAST(t.amount_tokens AS REAL) > 0
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0 
            END
        ), 0) as verified_vol,
        COUNT(DISTINCT t.tx_hash),
        COUNT(DISTINCT CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN t.tx_hash END),
        COUNT(DISTINCT CASE WHEN UPPER(t.delivery_status) = 'FAILED' THEN t.tx_hash END),
        AVG(t.latency_seconds),
        COUNT(DISTINCT t.oapp_address)
    FROM dvn_attribution a
    JOIN transactions t ON a.tx_hash = t.tx_hash
    LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
    GROUP BY a.dvn_address
`);

dvnAllTime.run(dateRange.min_ts, dateRange.max_ts);

// Quick stats
const dvnAllTimeStats = db.prepare(`
    SELECT COUNT(*) as cnt, SUM(total_volume_usd) as vol, SUM(success_count) as delivered
    FROM dvn_metrics WHERE time_period = 'all_time'
`).get();
console.log(`✓ DVN all-time: ${dvnAllTimeStats.cnt} DVNs, $${(dvnAllTimeStats.vol / 1e9).toFixed(2)}B verified volume, ${dvnAllTimeStats.delivered?.toLocaleString()} delivered`);

// Sanity check: no success rate > 100%
const sanityCheck = db.prepare(`
    SELECT dvn_address, tx_count, success_count 
    FROM dvn_metrics 
    WHERE time_period = 'all_time' AND success_count > tx_count
`).all();
if (sanityCheck.length > 0) {
    console.error(`⚠️  WARNING: ${sanityCheck.length} DVNs have success_count > tx_count!`);
    sanityCheck.forEach(s => console.error(`   ${s.dvn_address}: ${s.success_count}/${s.tx_count}`));
} else {
    console.log('✓ Sanity check passed: no DVN has success_count > tx_count');
}

// =============================================================================
// DVN METRICS: Daily
// =============================================================================
console.log('\n📈 [2/5] Aggregating DVN metrics (daily)...');

const dvnDaily = db.prepare(`
    INSERT INTO dvn_metrics (
        dvn_address, time_period, period_start, period_end,
        total_volume_usd, tx_count, success_count, failure_count,
        avg_latency_seconds, unique_oapps
    )
    SELECT 
        a.dvn_address,
        'daily' as time_period,
        strftime('%s', date(t.timestamp, 'unixepoch')) as period_start,
        strftime('%s', date(t.timestamp, 'unixepoch'), '+1 day') as period_end,
        COALESCE(SUM(
            CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND t.amount_tokens != 'UNKNOWN'
                     AND t.amount_tokens != '0'
                     AND CAST(t.amount_tokens AS REAL) > 0
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0 
            END
        ), 0),
        COUNT(DISTINCT t.tx_hash),
        COUNT(DISTINCT CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN t.tx_hash END),
        COUNT(DISTINCT CASE WHEN UPPER(t.delivery_status) = 'FAILED' THEN t.tx_hash END),
        AVG(t.latency_seconds),
        COUNT(DISTINCT t.oapp_address)
    FROM dvn_attribution a
    JOIN transactions t ON a.tx_hash = t.tx_hash
    LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
    WHERE t.timestamp IS NOT NULL
    GROUP BY a.dvn_address, date(t.timestamp, 'unixepoch')
`);

dvnDaily.run();

const dvnDailyCount = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_metrics WHERE time_period = 'daily'`).get();
console.log(`✓ DVN daily: ${dvnDailyCount.cnt.toLocaleString()} daily data points`);

// =============================================================================
// OAPP METRICS: All-time
// =============================================================================
console.log('\n📈 [3/5] Aggregating OApp metrics (all-time)...');

const oappAllTime = db.prepare(`
    INSERT INTO oapp_metrics (
        oapp_address, time_period, period_start, 
        source_chain_eid, dest_chain_eid, volume_usd, tx_count
    )
    SELECT 
        t.oapp_address,
        'all_time' as time_period,
        ? as period_start,
        0 as source_chain_eid,
        0 as dest_chain_eid,
        COALESCE(SUM(
            CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND t.amount_tokens != 'UNKNOWN'
                     AND t.amount_tokens != '0'
                     AND CAST(t.amount_tokens AS REAL) > 0
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0 
            END
        ), 0),
        COUNT(*)
    FROM transactions t
    LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
    WHERE t.oapp_address IS NOT NULL AND t.oapp_address != ''
    GROUP BY t.oapp_address
`);

oappAllTime.run(dateRange.min_ts);

const oappAllTimeStats = db.prepare(`
    SELECT COUNT(*) as cnt, SUM(volume_usd) as vol FROM oapp_metrics WHERE time_period = 'all_time' AND source_chain_eid = 0
`).get();
console.log(`✓ OApp all-time: ${oappAllTimeStats.cnt.toLocaleString()} OApps, $${(oappAllTimeStats.vol / 1e9).toFixed(2)}B verified volume`);

// =============================================================================
// OAPP METRICS: Corridors
// =============================================================================
console.log('\n📈 [4/5] Aggregating OApp corridor metrics...');

const oappCorridors = db.prepare(`
    INSERT INTO oapp_metrics (
        oapp_address, time_period, period_start, 
        source_chain_eid, dest_chain_eid, volume_usd, tx_count
    )
    SELECT 
        t.oapp_address,
        'all_time' as time_period,
        ? as period_start,
        t.source_chain_eid,
        t.destination_chain_eid,
        COALESCE(SUM(
            CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND t.amount_tokens != 'UNKNOWN'
                     AND t.amount_tokens != '0'
                     AND CAST(t.amount_tokens AS REAL) > 0
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0 
            END
        ), 0),
        COUNT(*)
    FROM transactions t
    LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
    WHERE t.oapp_address IS NOT NULL 
      AND t.oapp_address != ''
      AND t.source_chain_eid IS NOT NULL
      AND t.destination_chain_eid IS NOT NULL
    GROUP BY t.oapp_address, t.source_chain_eid, t.destination_chain_eid
`);

oappCorridors.run(dateRange.min_ts);

const corridorCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM oapp_metrics WHERE time_period = 'all_time' AND source_chain_eid != 0
`).get();
console.log(`✓ OApp corridors: ${corridorCount.cnt.toLocaleString()} route aggregations`);

// =============================================================================
// OAPP METRICS: Daily
// =============================================================================
console.log('\n📈 [5/5] Aggregating OApp daily metrics...');

const oappDaily = db.prepare(`
    INSERT INTO oapp_metrics (
        oapp_address, time_period, period_start, 
        source_chain_eid, dest_chain_eid, volume_usd, tx_count
    )
    SELECT 
        t.oapp_address,
        'daily' as time_period,
        strftime('%s', date(t.timestamp, 'unixepoch')) as period_start,
        0 as source_chain_eid,
        0 as dest_chain_eid,
        COALESCE(SUM(
            CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND t.amount_tokens != 'UNKNOWN'
                     AND t.amount_tokens != '0'
                     AND CAST(t.amount_tokens AS REAL) > 0
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0 
            END
        ), 0),
        COUNT(*)
    FROM transactions t
    LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
    WHERE t.oapp_address IS NOT NULL 
      AND t.oapp_address != ''
      AND t.timestamp IS NOT NULL
    GROUP BY t.oapp_address, date(t.timestamp, 'unixepoch')
`);

oappDaily.run();

const oappDailyCount = db.prepare(`SELECT COUNT(*) as cnt FROM oapp_metrics WHERE time_period = 'daily'`).get();
console.log(`✓ OApp daily: ${oappDailyCount.cnt.toLocaleString()} daily data points`);

// =============================================================================
// SUMMARY
// =============================================================================

// Top DVNs
const topDVNs = db.prepare(`
    SELECT dvn_address, total_volume_usd, tx_count, success_count, failure_count
    FROM dvn_metrics 
    WHERE time_period = 'all_time'
    ORDER BY total_volume_usd DESC
    LIMIT 5
`).all();

console.log('\n🏆 Top 5 DVNs by Verified Volume:');
topDVNs.forEach((d, i) => {
    const rate = d.tx_count > 0 ? ((d.success_count / d.tx_count) * 100).toFixed(2) : '0';
    console.log(`  ${i + 1}. ${d.dvn_address.substring(0, 12)}... $${(d.total_volume_usd / 1e9).toFixed(2)}B | ${d.tx_count.toLocaleString()} txs | ${rate}% success`);
});

// Top OApps
const topOApps = db.prepare(`
    SELECT oapp_address, volume_usd, tx_count
    FROM oapp_metrics 
    WHERE time_period = 'all_time' AND source_chain_eid = 0
    ORDER BY volume_usd DESC
    LIMIT 5
`).all();

console.log('\n🏆 Top 5 OApps by Verified Volume:');
topOApps.forEach((o, i) => {
    const vol = o.volume_usd >= 1e9
        ? `$${(o.volume_usd / 1e9).toFixed(2)}B`
        : `$${(o.volume_usd / 1e6).toFixed(2)}M`;
    console.log(`  ${i + 1}. ${o.oapp_address.substring(0, 12)}... ${vol} | ${o.tx_count.toLocaleString()} txs`);
});

console.log('\n' + '='.repeat(60));
console.log('📊 AGGREGATION SUMMARY');
console.log('='.repeat(60));
console.log(`Data Period: ${dateRange.min_date} to ${dateRange.max_date}`);
console.log(`DVN Metrics: ${dvnAllTimeStats.cnt} DVNs, ${dvnDailyCount.cnt.toLocaleString()} daily records`);
console.log(`OApp Metrics: ${oappAllTimeStats.cnt.toLocaleString()} OApps, ${corridorCount.cnt.toLocaleString()} corridors, ${oappDailyCount.cnt.toLocaleString()} daily records`);
console.log(`Total Verified Volume (DVN): $${(dvnAllTimeStats.vol / 1e9).toFixed(2)}B`);
console.log(`Total Verified Volume (OApp): $${(oappAllTimeStats.vol / 1e9).toFixed(2)}B`);
console.log('='.repeat(60));

console.log('\n✅ Aggregation complete. Volume is STRICTLY VERIFIED.');

db.close();
