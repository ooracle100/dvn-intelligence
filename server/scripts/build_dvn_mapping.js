#!/usr/bin/env node
/**
 * Parse dvns.txt and build a lookup table of DVN addresses to canonical names
 * Then aggregate metrics by canonical DVN ID instead of per-address
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const DVNS_PATH = path.join(__dirname, '../../dvns.txt');

console.log('🔧 Building DVN Address Mapping...');

// Parse dvns.txt
const dvnsData = JSON.parse(fs.readFileSync(DVNS_PATH, 'utf8'));

// Build address → dvn_id mapping
const addressToId = new Map();

for (const [chainName, chainData] of Object.entries(dvnsData)) {
    if (!chainData.dvns) continue;

    for (const [address, dvnInfo] of Object.entries(chainData.dvns)) {
        if (dvnInfo.deprecated) continue; // Skip deprecated DVNs

        const id = dvnInfo.id || dvnInfo.canonicalName?.toLowerCase().replace(/\s+/g, '-');
        const name = dvnInfo.canonicalName || dvnInfo.id;

        if (id && address.startsWith('0x')) {
            addressToId.set(address.toLowerCase(), {
                id: id,
                name: name,
                chain: chainName
            });
        }
    }
}

console.log(`✓ Parsed ${addressToId.size} DVN address mappings from dvns.txt`);

// Create DVN lookup table in database
const db = new Database(DB_PATH);

// Drop and recreate the lookup table
db.exec(`DROP TABLE IF EXISTS dvn_lookup`);
db.exec(`
    CREATE TABLE dvn_lookup (
        dvn_address TEXT PRIMARY KEY,
        dvn_id TEXT NOT NULL,
        dvn_name TEXT NOT NULL,
        chain_name TEXT
    )
`);

// Insert all mappings
const insertLookup = db.prepare(`
    INSERT OR REPLACE INTO dvn_lookup (dvn_address, dvn_id, dvn_name, chain_name)
    VALUES (?, ?, ?, ?)
`);

for (const [address, info] of addressToId) {
    insertLookup.run(address, info.id, info.name, info.chain);
}

console.log(`✓ Inserted ${addressToId.size} entries into dvn_lookup table`);

// Show top DVN volume addresses and their ID mappings
console.log('\n🔍 Top 10 DVN addresses by volume with ID mappings:');

const topAddrs = db.prepare(`
    SELECT m.dvn_address, m.total_volume_usd, m.tx_count, l.dvn_id, l.dvn_name
    FROM dvn_metrics m
    LEFT JOIN dvn_lookup l ON LOWER(m.dvn_address) = l.dvn_address
    WHERE m.time_period = 'all_time'
    ORDER BY m.total_volume_usd DESC
    LIMIT 10
`).all();

topAddrs.forEach((row, i) => {
    const id = row.dvn_id || 'UNKNOWN';
    const name = row.dvn_name || 'Unknown DVN';
    console.log(`  ${i + 1}. ${row.dvn_address.slice(0, 10)}... $${(row.total_volume_usd / 1e9).toFixed(2)}B | ${id} (${name})`);
});

// Count how many DVN addresses have mappings
const mappedCount = db.prepare(`
    SELECT COUNT(*) as mapped FROM dvn_metrics m
    JOIN dvn_lookup l ON LOWER(m.dvn_address) = l.dvn_address
    WHERE m.time_period = 'all_time'
`).get();

const totalCount = db.prepare(`
    SELECT COUNT(*) as total FROM dvn_metrics WHERE time_period = 'all_time'
`).get();

console.log(`\n📊 Coverage: ${mappedCount.mapped} / ${totalCount.total} DVN addresses mapped (${(mappedCount.mapped / totalCount.total * 100).toFixed(1)}%)`);

// Aggregate by DVN ID
console.log('\n📈 Aggregating by DVN ID...');

db.exec(`DROP TABLE IF EXISTS dvn_aggregate`);
db.exec(`
    CREATE TABLE dvn_aggregate (
        dvn_id TEXT PRIMARY KEY,
        dvn_name TEXT,
        total_volume_usd REAL,
        tx_count INTEGER,
        success_count INTEGER,
        failure_count INTEGER,
        avg_latency_seconds REAL,
        unique_oapps INTEGER,
        address_count INTEGER
    )
`);

db.exec(`
    INSERT INTO dvn_aggregate (dvn_id, dvn_name, total_volume_usd, tx_count, success_count, failure_count, avg_latency_seconds, unique_oapps, address_count)
    SELECT 
        COALESCE(l.dvn_id, 'unknown-' || SUBSTR(m.dvn_address, 1, 10)),
        COALESCE(l.dvn_name, 'Unknown'),
        SUM(m.total_volume_usd),
        SUM(m.tx_count),
        SUM(m.success_count),
        SUM(m.failure_count),
        AVG(m.avg_latency_seconds),
        SUM(m.unique_oapps),
        COUNT(DISTINCT m.dvn_address)
    FROM dvn_metrics m
    LEFT JOIN dvn_lookup l ON LOWER(m.dvn_address) = l.dvn_address
    WHERE m.time_period = 'all_time'
    GROUP BY COALESCE(l.dvn_id, 'unknown-' || SUBSTR(m.dvn_address, 1, 10))
`);

// Show aggregated results
console.log('\n🏆 Top 10 DVNs by consolidated volume:');
const topDvns = db.prepare(`
    SELECT dvn_id, dvn_name, total_volume_usd, tx_count, address_count,
           ROUND(success_count * 100.0 / NULLIF(tx_count, 0), 2) as success_rate
    FROM dvn_aggregate
    ORDER BY total_volume_usd DESC
    LIMIT 10
`).all();

topDvns.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.dvn_name} ($${(d.total_volume_usd / 1e9).toFixed(2)}B) | ${d.tx_count.toLocaleString()} txs | ${d.address_count} addresses | ${d.success_rate}% success`);
});

db.close();
console.log('\n✅ DVN ID aggregation complete!');
