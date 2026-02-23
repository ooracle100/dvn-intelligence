#!/usr/bin/env node
/**
 * compute_dvn_analytics.js
 * 
 * Pre-computes per-DVN top routes and DVN co-occurrence stacks 
 * from dvn_attribution + transactions tables.
 * Results stored in dvn_top_routes and dvn_top_stacks for instant API serving.
 * 
 * VOLUME FORMULA (same as aggregate_metrics.js):
 *   volume_usd = CAST(amount_tokens AS REAL) × price_usd
 *   Only for verified OApps in verified_oapps.json with trusted payload types.
 * 
 * DATE: 2026-02-16
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const VERIFIED_OAPPS_PATH = path.join(__dirname, '../data/verified_oapps.json');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('🔧 Computing DVN analytics (routes + stacks) with STRICT volume...\n');
console.log(`📂 Database: ${DB_PATH}`);

// --- 0. Load verified OApps into temp table (same pattern as aggregate_metrics.js) ---
if (!fs.existsSync(VERIFIED_OAPPS_PATH)) {
  console.error('❌ FATAL: verified_oapps.json not found.');
  process.exit(1);
}

const verifiedOApps = JSON.parse(fs.readFileSync(VERIFIED_OAPPS_PATH, 'utf8'));

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

let tokenCount = 0;
db.transaction(() => {
  for (const oapp of verifiedOApps) {
    if (oapp.price_usd <= 0) continue;
    const payloadTypes = (oapp.trusted_payload_types || []).join(',');
    insertRule.run(oapp.address, oapp.price_usd, oapp.symbol, payloadTypes);
    tokenCount++;
  }
})();

console.log(`✅ Loaded ${tokenCount} verified OApp price rules.\n`);

// --- 1. Create tables ---
db.exec(`
  DROP TABLE IF EXISTS dvn_top_routes;
  CREATE TABLE dvn_top_routes (
    dvn_id TEXT NOT NULL,
    source_chain TEXT,
    dest_chain TEXT,
    tx_count INTEGER DEFAULT 0,
    volume_usd REAL DEFAULT 0,
    success_rate REAL DEFAULT 0,
    avg_latency REAL DEFAULT 0,
    PRIMARY KEY (dvn_id, source_chain, dest_chain)
  );

  DROP TABLE IF EXISTS dvn_top_stacks;
  CREATE TABLE dvn_top_stacks (
    dvn_id TEXT NOT NULL,
    stack_dvns TEXT NOT NULL,
    tx_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    volume_usd REAL DEFAULT 0,
    PRIMARY KEY (dvn_id, stack_dvns)
  );
`);

// --- 2. Get all DVN IDs with their addresses ---
const dvnGroups = db.prepare(`
  SELECT dvn_id, GROUP_CONCAT(dvn_address) as addresses 
  FROM dvn_lookup 
  GROUP BY dvn_id
`).all();

console.log(`Found ${dvnGroups.length} DVN groups to process\n`);

const insertRoute = db.prepare(`
  INSERT OR REPLACE INTO dvn_top_routes (dvn_id, source_chain, dest_chain, tx_count, volume_usd, success_rate, avg_latency)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertStack = db.prepare(`
  INSERT OR REPLACE INTO dvn_top_stacks (dvn_id, stack_dvns, tx_count, success_rate, volume_usd)
  VALUES (?, ?, ?, ?, ?)
`);

// --- 3. Process each DVN ---
let processed = 0;
let totalRoutes = 0;
let totalStacks = 0;

for (const group of dvnGroups) {
  // Normalize addresses to lowercase for consistent matching
  const addresses = group.addresses.split(',').map(a => a.toLowerCase());
  const dvnId = group.dvn_id;
  const placeholders = addresses.map(() => '?').join(',');

  // --- 3a. Top Routes with STRICT volume ---
  try {
    const routes = db.prepare(`
          SELECT 
            t.source_chain_name,
            t.destination_chain_name,
            COUNT(*) as tx_count,
            COALESCE(SUM(
              CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL 
                     AND CAST(t.amount_tokens AS REAL) > 0
                     AND CAST(t.amount_tokens AS REAL) < 1e15
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0
              END
            ), 0) as volume_usd,
            CASE WHEN COUNT(*) > 0 THEN
              SUM(CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
            ELSE 0 END as success_rate,
            AVG(CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN t.latency_seconds END) as avg_latency
          FROM dvn_attribution da
          JOIN transactions t ON da.tx_hash = t.tx_hash
          LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
          WHERE LOWER(da.dvn_address) IN (${placeholders})
          GROUP BY t.source_chain_name, t.destination_chain_name
          ORDER BY tx_count DESC
          LIMIT 20
        `).all(...addresses);

    for (const r of routes) {
      insertRoute.run(dvnId, r.source_chain_name, r.destination_chain_name, r.tx_count, r.volume_usd, r.success_rate, r.avg_latency);
      totalRoutes++;
    }
  } catch (e) {
    console.warn(`  ⚠️ Routes failed for ${dvnId}: ${e.message}`);
  }

  // --- 3b. DVN Co-occurrence Stacks with STRICT volume ---
  try {
    const stacks = db.prepare(`
          SELECT 
            t.required_dvn_addresses as stack,
            COUNT(*) as tx_count,
            CASE WHEN COUNT(*) > 0 THEN
              SUM(CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
            ELSE 0 END as success_rate,
            COALESCE(SUM(
              CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL
                     AND CAST(t.amount_tokens AS REAL) > 0
                     AND CAST(t.amount_tokens AS REAL) < 1e15
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0
              END
            ), 0) as volume_usd
          FROM dvn_attribution da
          JOIN transactions t ON da.tx_hash = t.tx_hash
          LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
          WHERE LOWER(da.dvn_address) IN (${placeholders})
            AND t.required_dvn_addresses IS NOT NULL
          GROUP BY t.required_dvn_addresses
          ORDER BY tx_count DESC
          LIMIT 10
        `).all(...addresses);

    for (const s of stacks) {
      if (s.stack) {
        insertStack.run(dvnId, s.stack, s.tx_count, s.success_rate, s.volume_usd);
        totalStacks++;
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Stacks failed for ${dvnId}: ${e.message}`);
  }

  processed++;
  if (processed % 5 === 0 || processed === dvnGroups.length) {
    console.log(`  Processed ${processed}/${dvnGroups.length} DVNs (${totalRoutes} routes, ${totalStacks} stacks so far)`);
  }
}

// --- 4. Resolve stack addresses to names ---
console.log('\n🏷️  Resolving stack DVN addresses to names...');
const dvnLookup = {};
const allLookups = db.prepare(`SELECT LOWER(dvn_address) as addr, dvn_id FROM dvn_lookup`).all();
for (const l of allLookups) {
  dvnLookup[l.addr] = l.dvn_id;
}

const dvnNames = {};
const aggregates = db.prepare(`SELECT dvn_id, dvn_name FROM dvn_aggregate`).all();
for (const a of aggregates) {
  dvnNames[a.dvn_id] = a.dvn_name;
}

const allStacks = db.prepare(`SELECT rowid, dvn_id, stack_dvns FROM dvn_top_stacks`).all();
const updateStack = db.prepare(`UPDATE dvn_top_stacks SET stack_dvns = ? WHERE rowid = ?`);

let resolved = 0;
for (const s of allStacks) {
  try {
    const addrs = JSON.parse(s.stack_dvns);
    const names = addrs.map(addr => {
      const id = dvnLookup[addr.toLowerCase()];
      return dvnNames[id] || id || addr.slice(0, 10) + '...';
    });
    updateStack.run(names.join(' + '), s.rowid);
    resolved++;
  } catch (e) {
    // Not valid JSON — leave as-is
  }
}

console.log(`   Resolved ${resolved}/${allStacks.length} stack entries to names.`);

// --- 5. Summary ---
const routeCount = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_routes`).get().cnt;
const stackCount = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_stacks`).get().cnt;
const routesWithVolume = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_routes WHERE volume_usd > 0`).get().cnt;
const stacksWithVolume = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_stacks WHERE volume_usd > 0`).get().cnt;

console.log(`\n✅ DVN Analytics complete!`);
console.log(`   ${routeCount} route entries (${routesWithVolume} with verified volume)`);
console.log(`   ${stackCount} stack entries (${stacksWithVolume} with verified volume)`);

// Show sample for Nethermind
const sample = db.prepare(`
  SELECT source_chain, dest_chain, tx_count, volume_usd 
  FROM dvn_top_routes 
  WHERE dvn_id = 'nethermind' 
  ORDER BY tx_count DESC 
  LIMIT 5
`).all();

if (sample.length > 0) {
  console.log(`\n📊 Sample — Nethermind top routes:`);
  for (const r of sample) {
    const vol = r.volume_usd >= 1e9 ? `$${(r.volume_usd / 1e9).toFixed(2)}B` :
      r.volume_usd >= 1e6 ? `$${(r.volume_usd / 1e6).toFixed(2)}M` :
        r.volume_usd >= 1e3 ? `$${(r.volume_usd / 1e3).toFixed(1)}K` :
          `$${r.volume_usd.toFixed(2)}`;
    console.log(`   ${r.source_chain} → ${r.dest_chain}: ${r.tx_count.toLocaleString()} txs, ${vol}`);
  }
}

const stackSample = db.prepare(`
  SELECT stack_dvns, tx_count, volume_usd
  FROM dvn_top_stacks
  WHERE dvn_id = 'nethermind'
  ORDER BY tx_count DESC
  LIMIT 3
`).all();

if (stackSample.length > 0) {
  console.log(`\n📊 Sample — Nethermind top stacks:`);
  for (const s of stackSample) {
    const vol = s.volume_usd >= 1e9 ? `$${(s.volume_usd / 1e9).toFixed(2)}B` :
      s.volume_usd >= 1e6 ? `$${(s.volume_usd / 1e6).toFixed(2)}M` :
        `$${s.volume_usd.toFixed(2)}`;
    console.log(`   [${s.stack_dvns}]: ${s.tx_count.toLocaleString()} txs, ${vol}`);
  }
}

db.close();
