#!/usr/bin/env node
/**
 * identify_top_oapps.js
 * 
 * Cross-references the top OApps in the DB (by tx count) against:
 *   1. stargate-ecosystem-assets.json (433 entries)
 *   2. stargateRegistry.js (373 assets, exported as STARGATE_REGISTRY)
 *   3. manualRegistry.js (FRNT, USDC, USDT0, Ondo)
 *   4. verified_oapps.json (8 current entries)
 * 
 * Outputs: which top OApps are already identifiable and which need manual lookup.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const STARGATE_JSON = path.join(__dirname, '../../public/stargate-ecosystem-assets.json');
const VERIFIED_JSON = path.join(__dirname, '../data/verified_oapps.json');

console.log('🔍 Top OApp Identification & Cross-Reference\n');

// --- 1. Load registries ---
const stargateAssets = JSON.parse(fs.readFileSync(STARGATE_JSON, 'utf8'));
const verifiedOApps = JSON.parse(fs.readFileSync(VERIFIED_JSON, 'utf8'));

// Build address lookup maps (lowercase → info)
const addressLookup = new Map();

// From stargate-ecosystem-assets.json
for (const asset of stargateAssets) {
    const addr = (asset['OFT Address'] || '').toLowerCase();
    if (addr && addr.startsWith('0x')) {
        addressLookup.set(addr, {
            source: 'stargate-ecosystem',
            symbol: asset['Asset Symbol'],
            name: asset['Asset Name'],
            issuer: asset['Issuer'],
            type: asset['Asset Type'],
            chain: asset['Chain'],
            endpointId: asset['Endpoint ID']
        });
    }
    // Also check token address  
    const tokenAddr = (asset['Token Address'] || '').toLowerCase();
    if (tokenAddr && tokenAddr.startsWith('0x') && tokenAddr !== '0x0000000000000000000000000000000000000000') {
        if (!addressLookup.has(tokenAddr)) {
            addressLookup.set(tokenAddr, {
                source: 'stargate-ecosystem (token)',
                symbol: asset['Asset Symbol'],
                name: asset['Asset Name'],
                issuer: asset['Issuer'],
                type: asset['Asset Type'],
                chain: asset['Chain']
            });
        }
    }
}

// From verified_oapps.json
for (const oapp of verifiedOApps) {
    addressLookup.set(oapp.address.toLowerCase(), {
        source: 'verified_oapps',
        symbol: oapp.symbol,
        name: oapp.name,
        price_usd: oapp.price_usd
    });
}

console.log(`📚 Loaded ${addressLookup.size} unique addresses from registries\n`);

// --- 2. Query top 50 OApps by tx count ---
const db = new Database(DB_PATH, { readonly: true });

const topOApps = db.prepare(`
  SELECT t.oapp_address, 
         COUNT(*) as tx_cnt,
         COUNT(CASE WHEN t.payload_type = 'STANDARD_OFT' THEN 1 END) as std_cnt,
         COUNT(CASE WHEN t.payload_type = 'COMPOSE' THEN 1 END) as compose_cnt,
         COUNT(CASE WHEN t.payload_type = 'EXTENDED' THEN 1 END) as ext_cnt,
         COUNT(CASE WHEN t.payload_type = 'OPERATIONAL' THEN 1 END) as op_cnt,
         SUM(CASE WHEN t.amount_tokens IS NOT NULL AND t.amount_tokens != 'UNKNOWN' 
              AND CAST(t.amount_tokens AS REAL) > 0 
              AND t.payload_type IN ('STANDARD_OFT', 'COMPOSE')
              THEN CAST(t.amount_tokens AS REAL) ELSE 0 END) as trusted_tokens
  FROM transactions t
  GROUP BY t.oapp_address
  ORDER BY tx_cnt DESC
  LIMIT 50
`).all();

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  TOP 50 OApps by Transaction Count — Cross-Referenced');
console.log('═══════════════════════════════════════════════════════════════════\n');

let identified = 0;
let unidentified = 0;
let unidentifiedList = [];

for (let i = 0; i < topOApps.length; i++) {
    const oapp = topOApps[i];
    const addr = oapp.oapp_address.toLowerCase();
    const match = addressLookup.get(addr);

    const statusIcon = match ? '✅' : '❓';
    const identity = match
        ? `${match.symbol} (${match.issuer || match.name}) [${match.source}]`
        : 'UNIDENTIFIED';

    console.log(`${(i + 1).toString().padStart(3)}. ${statusIcon} ${oapp.oapp_address}`);
    console.log(`     ${identity}`);
    console.log(`     Txs: ${oapp.tx_cnt.toLocaleString()} | STD: ${oapp.std_cnt} | COMPOSE: ${oapp.compose_cnt} | EXT: ${oapp.ext_cnt} | OP: ${oapp.op_cnt}`);
    if (oapp.trusted_tokens > 0) {
        console.log(`     Trusted tokens (STD+COMPOSE): ${oapp.trusted_tokens.toLocaleString()}`);
    }
    if (match && match.price_usd) {
        console.log(`     💰 Price: $${match.price_usd} → Volume: $${(oapp.trusted_tokens * match.price_usd).toLocaleString()}`);
    }
    console.log('');

    if (match) { identified++; }
    else {
        unidentified++;
        unidentifiedList.push(oapp);
    }
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  SUMMARY: ${identified}/50 identified, ${unidentified}/50 unidentified`);
console.log('═══════════════════════════════════════════════════════════════════\n');

// --- 3. Get top 30 UNIDENTIFIED OApps for user research ---
const unidentifiedOApps = db.prepare(`
  SELECT t.oapp_address, 
         COUNT(*) as tx_cnt,
         COUNT(CASE WHEN t.payload_type = 'STANDARD_OFT' THEN 1 END) as std_cnt,
         COUNT(CASE WHEN t.payload_type = 'COMPOSE' THEN 1 END) as compose_cnt,
         SUM(CASE WHEN t.amount_tokens IS NOT NULL AND t.amount_tokens != 'UNKNOWN' 
              AND CAST(t.amount_tokens AS REAL) > 0  
              AND t.payload_type IN ('STANDARD_OFT', 'COMPOSE')
              THEN CAST(t.amount_tokens AS REAL) ELSE 0 END) as trusted_tokens
  FROM transactions t
  GROUP BY t.oapp_address
  HAVING tx_cnt >= 50
  ORDER BY tx_cnt DESC
`).all();

// Filter out ones we've identified
const trueUnknowns = unidentifiedOApps.filter(o => !addressLookup.has(o.oapp_address.toLowerCase()));

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`  TOP 30 UNIDENTIFIED OApps (for manual lookup) — ${trueUnknowns.length} total unknown with ≥50 txs`);
console.log('═══════════════════════════════════════════════════════════════════\n');

for (let i = 0; i < Math.min(30, trueUnknowns.length); i++) {
    const o = trueUnknowns[i];
    // Get a sample tx for block explorer lookup
    const sampleTx = db.prepare(`
    SELECT tx_hash, source_chain_name FROM transactions WHERE oapp_address = ? LIMIT 1
  `).get(o.oapp_address);

    console.log(`${(i + 1).toString().padStart(3)}. ${o.oapp_address}`);
    console.log(`     Txs: ${o.tx_cnt.toLocaleString()} | STD: ${o.std_cnt} | COMPOSE: ${o.compose_cnt}`);
    if (o.trusted_tokens > 0) console.log(`     Trusted tokens: ${o.trusted_tokens.toLocaleString()}`);
    if (sampleTx) console.log(`     Sample: ${sampleTx.tx_hash} (${sampleTx.source_chain_name})`);
    console.log('');
}

// --- 4. Coverage stats ---
const totalTxs = db.prepare('SELECT COUNT(*) as cnt FROM transactions').get().cnt;
const identifiedTxCount = db.prepare(`
  SELECT COUNT(*) as cnt FROM transactions WHERE LOWER(oapp_address) IN (${[...addressLookup.keys()].map(a => `'${a}'`).join(',')
    })
`).get().cnt;

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('  COVERAGE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  Total addresses in lookup: ${addressLookup.size}`);
console.log(`  Total DB transactions: ${totalTxs.toLocaleString()}`);
console.log(`  Matched to known OApps: ${identifiedTxCount.toLocaleString()} (${(identifiedTxCount / totalTxs * 100).toFixed(1)}%)`);
console.log(`  Unmatched: ${(totalTxs - identifiedTxCount).toLocaleString()} (${((totalTxs - identifiedTxCount) / totalTxs * 100).toFixed(1)}%)`);
console.log('═══════════════════════════════════════════════════════════════════');

db.close();
