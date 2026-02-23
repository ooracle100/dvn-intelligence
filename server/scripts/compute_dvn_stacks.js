#!/usr/bin/env node
/**
 * compute_dvn_stacks.js
 * 
 * Computes DVN co-occurrence stacks from dvn_attribution table.
 * Instead of relying on transactions.required_dvn_addresses (only 42 rows populated),
 * this groups all DVN addresses that verified the SAME transaction.
 * 
 * For each DVN, finds the most common stacks (groups of co-verifiers)
 * and computes tx_count, success_rate, and verified volume.
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

console.log('🔧 Computing DVN stacks from dvn_attribution co-occurrence...\n');

// --- Load verified OApps into temp table ---
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
db.transaction(() => {
  for (const oapp of verifiedOApps) {
    if (oapp.price_usd <= 0) continue;
    insertRule.run(oapp.address, oapp.price_usd, oapp.symbol, (oapp.trusted_payload_types || []).join(','));
  }
})();

// --- Build DVN address → name lookup ---
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

function addressToName(addr) {
  const id = dvnLookup[addr.toLowerCase()];
  return dvnNames[id] || id || addr.slice(0, 10) + '...';
}

// --- Clear existing stacks ---
db.exec('DELETE FROM dvn_top_stacks');

// --- Get all DVN groups ---
const dvnGroups = db.prepare(`
  SELECT dvn_id, GROUP_CONCAT(dvn_address) as addresses 
  FROM dvn_lookup 
  GROUP BY dvn_id
`).all();

console.log(`Processing ${dvnGroups.length} DVN groups...\n`);

const insertStack = db.prepare(`
  INSERT OR REPLACE INTO dvn_top_stacks (dvn_id, stack_dvns, tx_count, success_rate, volume_usd, avg_latency)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let processed = 0;
let totalStacks = 0;

for (const group of dvnGroups) {
  const addresses = group.addresses.split(',').map(a => a.toLowerCase());
  const dvnId = group.dvn_id;
  const placeholders = addresses.map(() => '?').join(',');

  try {
    // For each transaction this DVN verified, find ALL other DVNs that also verified it.
    // Group by the sorted set of co-verifiers to identify common stacks.
    // This uses a subquery approach to avoid self-join complexity:
    //   1. Get all tx_hashes where this DVN appears
    //   2. For each tx_hash, get ALL dvn_addresses from dvn_attribution
    //   3. GROUP_CONCAT(DISTINCT sorted addresses) = the "stack"
    //   4. Group by stack to get counts

    const stacks = db.prepare(`
          SELECT 
            stack,
            COUNT(*) as tx_count,
            COALESCE(SUM(vol), 0) as volume_usd,
            CASE WHEN COUNT(*) > 0 THEN
              SUM(CASE WHEN delivered = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
            ELSE 0 END as success_rate,
            AVG(CASE WHEN delivered = 1 AND latency > 0 THEN latency END) as avg_latency
          FROM (
            SELECT 
              t.tx_hash,
              GROUP_CONCAT(DISTINCT LOWER(da2.dvn_address)) as stack,
              CASE WHEN UPPER(t.delivery_status) = 'DELIVERED' THEN 1 ELSE 0 END as delivered,
              t.latency_seconds as latency,
              CASE 
                WHEN v.address IS NOT NULL 
                     AND t.payload_type IS NOT NULL
                     AND (',' || v.payload_types || ',') LIKE ('%,' || t.payload_type || ',%')
                     AND t.amount_tokens IS NOT NULL
                     AND CAST(t.amount_tokens AS REAL) > 0
                     AND CAST(t.amount_tokens AS REAL) < 1e15
                THEN CAST(t.amount_tokens AS REAL) * v.price_usd
                ELSE 0
              END as vol
            FROM dvn_attribution da1
            JOIN transactions t ON da1.tx_hash = t.tx_hash
            JOIN dvn_attribution da2 ON da1.tx_hash = da2.tx_hash
            LEFT JOIN verified_tokens v ON LOWER(t.oapp_address) = LOWER(v.address)
            WHERE LOWER(da1.dvn_address) IN (${placeholders})
            GROUP BY t.tx_hash
          )
          GROUP BY stack
          ORDER BY tx_count DESC
          LIMIT 10
        `).all(...addresses);

    for (const s of stacks) {
      if (s.stack) {
        // Resolve addresses to names
        const addrs = s.stack.split(',');
        const names = addrs.map(a => addressToName(a)).sort();
        const stackName = names.join(' + ');
        insertStack.run(dvnId, stackName, s.tx_count, s.success_rate, s.volume_usd, s.avg_latency || 0);
        totalStacks++;
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Stacks failed for ${dvnId}: ${e.message}`);
  }

  processed++;
  if (processed % 10 === 0 || processed === dvnGroups.length) {
    console.log(`  Processed ${processed}/${dvnGroups.length} DVNs (${totalStacks} stacks so far)`);
  }
}

// --- Summary ---
const stackCount = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_stacks`).get().cnt;
const stacksWithVol = db.prepare(`SELECT COUNT(*) as cnt FROM dvn_top_stacks WHERE volume_usd > 0`).get().cnt;

console.log(`\n✅ DVN Stacks complete!`);
console.log(`   ${stackCount} stack entries (${stacksWithVol} with verified volume)`);

// Sample for Nethermind
const sample = db.prepare(`
  SELECT stack_dvns, tx_count, volume_usd, avg_latency
  FROM dvn_top_stacks
  WHERE dvn_id = 'nethermind'
  ORDER BY tx_count DESC
  LIMIT 5
`).all();

if (sample.length > 0) {
  console.log(`\n📊 Sample — Nethermind top stacks:`);
  for (const s of sample) {
    const vol = s.volume_usd >= 1e9 ? `$${(s.volume_usd / 1e9).toFixed(2)}B` :
      s.volume_usd >= 1e6 ? `$${(s.volume_usd / 1e6).toFixed(2)}M` :
        s.volume_usd >= 1e3 ? `$${(s.volume_usd / 1e3).toFixed(1)}K` :
          `$${s.volume_usd.toFixed(2)}`;
    const lat = s.avg_latency > 0 ? `${s.avg_latency.toFixed(1)}s` : 'N/A';
    console.log(`   [${s.stack_dvns}]: ${s.tx_count.toLocaleString()} txs, ${vol}, latency: ${lat}`);
  }
}

db.close();
