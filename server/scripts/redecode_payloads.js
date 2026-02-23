#!/usr/bin/env node
/**
 * Re-decode all transactions using Nansen classification approach
 * This script updates payload_type and re-calculates amount_tokens/amount_usd
 */

const Database = require('better-sqlite3');
const path = require('path');
const { decodePayload, classifyPayload } = require('../services/payloadDecoder');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');
const BATCH_SIZE = 10000;

// Token prices (approximate, for re-decoding)
const TOKEN_PRICES = {
    'usdt': 1.0,
    'usdc': 1.0,
    'usdt0': 1.0,
    'usdtoft': 1.0,
    'frax': 1.0,
    'dai': 1.0,
    'eth': 2500,
    'weth': 2500,
    'btc': 45000,
    'wbtc': 45000,
    'xaut': 2700,
    'xaut0': 2700,
};

// OApp address to token mapping (from Nansen analysis)
const OAPP_MAP = {
    // Tether (USDT0)
    '0xd7f8b0c3b89f56f796a9e3a8b0b3b0f0c0d8e9f0': { symbol: 'USDT0', decimals: 6, price: 1.0 },
    // Add more as we discover them
};

function getTokenPrice(symbol) {
    if (!symbol) return null;
    const normalized = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    return TOKEN_PRICES[normalized] || null;
}

async function main() {
    console.log('🔄 Starting re-decode of all transactions...');
    console.log(`📂 Database: ${DB_PATH}`);

    const db = new Database(DB_PATH);

    // Get total count
    const { total } = db.prepare('SELECT COUNT(*) as total FROM transactions').get();
    console.log(`📊 Total transactions: ${total.toLocaleString()}`);

    // Prepare statements
    const selectStmt = db.prepare(`
        SELECT tx_hash, payload, oapp_address, token_symbol
        FROM transactions
        LIMIT ? OFFSET ?
    `);

    const updateStmt = db.prepare(`
        UPDATE transactions
        SET payload_type = ?, amount_tokens = ?, amount_usd = ?
        WHERE tx_hash = ?
    `);

    // Stats tracking
    const stats = {
        processed: 0,
        decoded: 0,
        skipped: 0,
        byType: {}
    };

    const startTime = Date.now();

    // Process in batches
    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
        const batch = selectStmt.all(BATCH_SIZE, offset);

        const updateMany = db.transaction((rows) => {
            for (const row of rows) {
                try {
                    const result = decodePayload(row.payload, row.oapp_address);
                    const payloadType = result.payloadType;

                    // Track stats
                    stats.byType[payloadType] = (stats.byType[payloadType] || 0) + 1;

                    let amountTokens = null;
                    let amountUsd = null;

                    if (result.success && result.amountSD) {
                        // amountSD is in shared decimals (6), convert to tokens
                        amountTokens = (BigInt(result.amountSD) / BigInt(1_000_000)).toString();

                        // Try to get USD value
                        const price = getTokenPrice(row.token_symbol);
                        if (price) {
                            amountUsd = parseFloat(amountTokens) * price;
                        }

                        stats.decoded++;
                    } else {
                        stats.skipped++;
                    }

                    updateStmt.run(payloadType, amountTokens, amountUsd, row.tx_hash);
                    stats.processed++;

                } catch (err) {
                    console.error(`Error processing ${row.tx_hash}:`, err.message);
                }
            }
        });

        updateMany(batch);

        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = stats.processed / elapsed;
        const eta = (total - stats.processed) / rate;

        console.log(`✓ Processed ${stats.processed.toLocaleString()}/${total.toLocaleString()} (${(stats.processed / total * 100).toFixed(1)}%) | Rate: ${rate.toFixed(0)}/s | ETA: ${(eta / 60).toFixed(1)} min`);
    }

    db.close();

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 RE-DECODE COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total processed: ${stats.processed.toLocaleString()}`);
    console.log(`Successfully decoded: ${stats.decoded.toLocaleString()} (${(stats.decoded / stats.processed * 100).toFixed(1)}%)`);
    console.log(`Skipped: ${stats.skipped.toLocaleString()}`);
    console.log('\nPayload types:');
    Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  ${type}: ${count.toLocaleString()} (${(count / stats.processed * 100).toFixed(1)}%)`);
        });
    console.log('='.repeat(60));
}

main().catch(console.error);
