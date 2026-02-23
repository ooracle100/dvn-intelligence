#!/usr/bin/env node
/**
 * enrich_fees.js
 * 
 * Samples real on-chain DVN fees via Alchemy to populate "AVG DVN Fee".
 * 
 * METHODOLOGY:
 * 1. For each DVN, sample 150 recent transactions on Alchemy-supported chains (ETH, Base, Arb, Opt, Poly, Avax).
 * 2. Fetch transaction receipt via Alchemy (eth_getTransactionReceipt).
 * 3. Parse 'DVNFeePaid' event from LayerZero SendLib (ULN302).
 * 4. Attribute fees correctly to required vs optional DVNs.
 * 5. Compute average fee in USD and update dvn_aggregate table.
 * 
 * DATE: 2026-02-16
 */

const Database = require('better-sqlite3');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY;

if (!ALCHEMY_KEY) {
    console.error('❌ Missing REACT_APP_ALCHEMY_KEY in .env.local');
    process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// --- Configuration ---
const SAMPLE_SIZE = 150;
const CONCURRENCY = 5; // Rate limit protection

// Chain ID map for Alchemy
const CHAIN_MAP = {
    30101: { id: 1, slug: 'eth-mainnet', nativePrice: 2600 },      // ETH
    30184: { id: 8453, slug: 'base-mainnet', nativePrice: 2600 },  // Base
    30110: { id: 42161, slug: 'arb-mainnet', nativePrice: 2600 },  // Arbitrum
    30111: { id: 10, slug: 'opt-mainnet', nativePrice: 2600 },     // Optimism
    30109: { id: 137, slug: 'polygon-mainnet', nativePrice: 0.75 },// Polygon
    30106: { id: 43114, slug: 'avax-mainnet', nativePrice: 35 }    // Avalanche
};

// LayerZero DVN Fee Event Topic
// event DVNFeePaid(address[] requiredDVNs, address[] optionalDVNs, uint256[] fees);
const DVNFeePaidSignature = 'DVNFeePaid(address[],address[],uint256[])';
const iface = new ethers.Interface([`event ${DVNFeePaidSignature}`]);
const DVNFeePaidTopic = ethers.id(DVNFeePaidSignature);

console.log('💰 Enriching DVN Fees (Sampling 150 txs per DVN)...');
console.log(`🔌 Alchemy Key: ${ALCHEMY_KEY.slice(0, 6)}...`);

// --- 1. Get List of DVNs ---
const dvnGroups = db.prepare(`
    SELECT dvn_id, GROUP_CONCAT(dvn_address) as addresses 
    FROM dvn_lookup 
    GROUP BY dvn_id
`).all();

console.log(`Found ${dvnGroups.length} DVN groups to sample.\n`);

// --- Helper: Fetch Receipt ---
async function getReceipt(txHash, chainSlug) {
    const url = `https://${chainSlug}.g.alchemy.com/v2/${ALCHEMY_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getTransactionReceipt',
                params: [txHash]
            })
        });
        const data = await response.json();
        return data.result;
    } catch (e) {
        return null;
    }
}

// --- Main Loop ---
(async () => {
    const updateFee = db.prepare(`UPDATE dvn_aggregate SET avg_dvn_fee_usd = ? WHERE dvn_id = ?`);
    let processed = 0;

    for (const group of dvnGroups) {
        const dvnId = group.dvn_id;
        const addresses = group.addresses.split(',').map(a => a.toLowerCase());
        const placeholders = addresses.map(() => '?').join(',');

        // Get sample transactions on supported chains
        const supportedEids = Object.keys(CHAIN_MAP).join(',');

        const samples = db.prepare(`
            SELECT DISTINCT t.source_tx_hash, t.source_chain_eid
            FROM dvn_attribution da
            JOIN transactions t ON da.tx_hash = t.tx_hash
            WHERE LOWER(da.dvn_address) IN (${placeholders})
              AND t.source_chain_eid IN (${supportedEids})
              AND t.source_tx_hash IS NOT NULL
            ORDER BY t.timestamp DESC
            LIMIT ${SAMPLE_SIZE}
        `).all(...addresses);

        if (samples.length === 0) {
            console.log(`⚠️  ${dvnId}: No transactions on supported chains to sample.`);
            processed++;
            continue;
        }

        console.log(`🔍 ${dvnId}: Sampling ${samples.length} transactions...`);

        let totalFeeUsd = 0;
        let feeCount = 0;

        // Process in chunks
        for (let i = 0; i < samples.length; i += CONCURRENCY) {
            const chunk = samples.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(async (tx) => {
                const chain = CHAIN_MAP[tx.source_chain_eid];
                if (!chain) return;

                const receipt = await getReceipt(tx.source_tx_hash, chain.slug);
                if (!receipt || !receipt.logs) return;

                // Find DVNFeePaid log
                const log = receipt.logs.find(l => l.topics[0] === DVNFeePaidTopic);
                if (!log) return;

                try {
                    const parsed = iface.parseLog(log);
                    const required = parsed.args[0].map(a => a.toLowerCase()); // requiredDVNs
                    const optional = parsed.args[1].map(a => a.toLowerCase()); // optionalDVNs
                    const fees = parsed.args[2]; // uint256[] fees

                    // fees array matches [ ...required, ...optional ]
                    const allDvns = [...required, ...optional];

                    // Find index of THIS DVN group in the array
                    const index = allDvns.findIndex(addr => addresses.includes(addr));

                    if (index !== -1 && fees[index]) {
                        const feeNative = Number(fees[index]) / 1e18;
                        const feeUsd = feeNative * chain.nativePrice;

                        if (feeUsd > 0 && feeUsd < 1000) { // Sanity check
                            totalFeeUsd += feeUsd;
                            feeCount++;
                        }
                    }
                } catch (e) {
                    // Decoding error
                }
            }));

            // Tiny delay to be nice to API
            await new Promise(r => setTimeout(r, 50));
        }

        if (feeCount > 0) {
            const avgFee = totalFeeUsd / feeCount;
            updateFee.run(avgFee, dvnId);
            console.log(`   ✅ ${dvnId}: Avg Fee $${avgFee.toFixed(2)} (from ${feeCount} verified txs)`);
        } else {
            console.log(`   ❌ ${dvnId}: Could not verify fees from ${samples.length} logs.`);
        }

        processed++;
    }

    console.log('\n🎉 Fee Enrichment Complete!');
    db.close();
})();
