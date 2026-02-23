#!/usr/bin/env node
// server/scripts/repair-payloads.js
// Smart Repair: Fetches messages via API and backfills MISSING payloads in DB
// Optimized to skip parsing info we already have.

require('dotenv').config();

const { LayerZeroScanClient } = require('../services/lzScanClient');
const { getDatabase } = require('../database/db');

const BATCH_SIZE = 750;
const PROGRESS_INTERVAL = 10;

async function repairPayloads() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   DVN DATA REPAIR - PAYLOAD BACKFILL (HARDENED MODE)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    while (true) {
        try {
            await runRepairCycle();
            break; // If completes successfully, exit loop
        } catch (e) {
            console.error(`\n❌ Critical Error: ${e.message}`);
            console.log('🔄 Restarting repair cycle in 30 seconds...\n');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
}

async function runRepairCycle() {
    const client = new LayerZeroScanClient();
    const db = getDatabase();

    // Check how many need repair
    const missingCount = db.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE payload IS NULL').get().count;
    console.log(`🔧 Found ${missingCount.toLocaleString()} transactions missing payloads`);

    let nextToken = null;
    let totalChecked = 0;
    let totalRepaired = 0;
    let startTime = Date.now();
    let pages = 0;

    // Check for resume token
    const savedProgress = db.getBackfillProgress('repair_payloads');
    if (savedProgress && savedProgress.next_token) {
        nextToken = savedProgress.next_token;
        console.log(`🔄 Resuming repair from saved checkpoint`);
    }

    const updatePayloadStmt = db.db.prepare(`
        UPDATE transactions 
        SET payload = ? 
        WHERE tx_hash = ? AND payload IS NULL
    `);

    console.log('📡 Starting repair stream...\n');

    while (true) {
        pages++;
        try {
            const { messages, nextToken: newToken } = await client.fetchMessages({
                limit: BATCH_SIZE,
                nextToken
            });

            if (messages.length === 0) {
                console.log('\n✓ Reached end of stream');
                break;
            }

            const updates = [];

            // Transaction for speed
            const runUpdates = db.db.transaction((batch) => {
                let batchRepaired = 0;
                for (const msg of batch) {
                    const src = msg.source?.tx || {};
                    const dst = msg.destination?.tx || {};
                    const txHash = dst.txHash || src.txHash;
                    const payload = src.payload;

                    if (txHash && payload) {
                        const result = updatePayloadStmt.run(payload, txHash);
                        if (result.changes > 0) {
                            batchRepaired++;
                        }
                    }
                }
                return batchRepaired;
            });

            const repairedInBatch = runUpdates(messages);

            totalChecked += messages.length;
            totalRepaired += repairedInBatch;
            nextToken = newToken;

            // logging
            if (pages % PROGRESS_INTERVAL === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = totalChecked / elapsed;
                console.log(`📊 Page ${pages}: Checked ${totalChecked.toLocaleString()} | Repaired: ${totalRepaired.toLocaleString()} | Rate: ${rate.toFixed(0)} msg/s`);
            }

            // Save progress
            if (pages % 50 === 0) { // Checkpoint every 50 pages
                db.updateBackfillProgress('repair_payloads', {
                    dvn_name: 'Payload Repair',
                    last_processed_timestamp: Math.floor(Date.now() / 1000), // Approximate
                    total_transactions: totalRepaired,
                    status: 'in_progress',
                    next_token: nextToken
                });
            }

            if (!nextToken) break;

            // Optional: Smart Stop? 
            // If we check 500 pages (375k msgs) and find 0 repairs, maybe we are done?
            // But we know we have 2.89M to go, so let's just run.

        } catch (e) {
            console.error(`❌ Error: ${e.message}`);
            // Wait and retry logic handled by manual restart for now
            // break;
            throw e; // Throw to trigger global restart
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   REPAIR COMPLETE');
    console.log(`   Repaired: ${totalRepaired.toLocaleString()} transactions`);
}

repairPayloads();
