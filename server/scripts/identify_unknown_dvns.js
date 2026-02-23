const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('🕵️‍♂️ Analyzing Unknown DVNs...');

// 1. Get Unknown DVNs from aggregate table
const unknownDvns = db.prepare(`
    SELECT dvn_id, dvn_name, total_volume_usd, tx_count, address_count
    FROM dvn_aggregate 
    WHERE dvn_id LIKE 'unknown%'
    ORDER BY total_volume_usd DESC
    LIMIT 20
`).all();

console.log(`Found ${unknownDvns.length} top unknown DVNs to analyze.\n`);

for (const dvn of unknownDvns) {
    console.log(`=== ${dvn.dvn_id} ===`);
    console.log(`Volume: $${(dvn.total_volume_usd / 1e6).toFixed(2)}M | Txs: ${dvn.tx_count.toLocaleString()}`);

    // Get the actual addresses
    // Note: Since we don't have direct link in aggregate table, we have to find them
    // The aggregate ID is like 'unknown-0x1234...' so we can extract the address
    const addressFragment = dvn.dvn_id.replace('unknown-', '');

    const addresses = db.prepare(`
        SELECT dvn_address 
        FROM dvn_metrics 
        WHERE time_period='all_time' 
          AND LOWER(dvn_address) LIKE ?
          AND dvn_address NOT IN (SELECT dvn_address FROM dvn_lookup)
    `).all(`${addressFragment}%`);

    for (const addrRow of addresses) {
        const address = addrRow.dvn_address;
        console.log(`  Address: ${address}`);

        // Analyze partners (who do they work with?)
        const partners = db.prepare(`
            SELECT da2.dvn_address, COUNT(*) as count
            FROM dvn_attribution da1
            JOIN dvn_attribution da2 ON da1.tx_hash = da2.tx_hash
            WHERE da1.dvn_address = ? AND da2.dvn_address != ?
            GROUP BY da2.dvn_address
            ORDER BY count DESC
            LIMIT 3
        `).all(address, address);

        const partnerNames = partners.map(p => {
            const lookup = db.prepare('SELECT dvn_name FROM dvn_lookup WHERE dvn_address = ?').get(p.dvn_address);
            return `${lookup ? lookup.dvn_name : p.dvn_address.slice(0, 10)} (${p.count})`;
        }).join(', ');

        console.log(`  Top Partners: ${partnerNames}`);

        // Analyze top OApps verified
        const oapps = db.prepare(`
            SELECT t.oapp_address, COUNT(*) as count
            FROM dvn_attribution da
            JOIN transactions t ON da.tx_hash = t.tx_hash
            WHERE da.dvn_address = ?
            GROUP BY t.oapp_address
            ORDER BY count DESC
            LIMIT 3
        `).all(address);

        console.log(`  Top OApps:`);
        oapps.forEach(o => {
            console.log(`    - ${o.oapp_address} (${o.count})`);
        });
    }
    console.log('');
}

db.close();
