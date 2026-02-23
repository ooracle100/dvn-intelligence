#!/usr/bin/env node
// server/scripts/run-full-backfill.js
// Production backfill script for 6 months of historical DVN data
// Uses nextToken pagination to fetch ALL historical messages

require('dotenv').config();

const { LayerZeroScanClient } = require('../services/lzScanClient');
const { getAllDvnIds } = require('../services/dvnAddressMap');
const { getDatabase } = require('../database/db');

// Configuration
const MONTHS_TO_BACKFILL = parseInt(process.env.BACKFILL_MONTHS) || 6;
const BATCH_SIZE = 750; // Messages per API call (reduced from 1000 to avoid timeouts)
const PROGRESS_INTERVAL = 10; // Log every N pages
const SAVE_INTERVAL = 20; // Save to DB every N pages

async function runFullBackfill() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   DVN INTELLIGENCE - 6-MONTH HISTORICAL BACKFILL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const client = new LayerZeroScanClient();
    const db = getDatabase();

    // Get all DVN IDs for attribution
    const allDvnIds = getAllDvnIds();
    console.log(`📊 Loaded ${allDvnIds.length} DVNs for attribution\n`);

    // Calculate target timestamp (6 months ago)
    const now = Math.floor(Date.now() / 1000);
    const targetTimestamp = now - (MONTHS_TO_BACKFILL * 30 * 24 * 60 * 60);
    const targetDate = new Date(targetTimestamp * 1000);

    console.log(`🎯 Target: Fetch all messages back to ${targetDate.toISOString()}`);
    console.log(`   That's ${MONTHS_TO_BACKFILL} months of data\n`);

    // Stats tracking
    const stats = {
        startTime: Date.now(),
        totalPages: 0,
        totalMessages: 0,
        messagesProcessed: 0,
        transactionsStored: 0,
        dvnAttributions: 0,
        errors: 0,
        dvnCounts: {}
    };

    // Initialize DVN counters
    allDvnIds.forEach(id => stats.dvnCounts[id] = 0);

    let nextToken = null;
    let oldestTimestamp = Infinity;
    let reachedTarget = false;
    let messageBatch = [];

    // Check for existing progress
    const savedProgress = db.getBackfillProgress('global_backfill');
    if (savedProgress && savedProgress.next_token) {
        nextToken = savedProgress.next_token;
        console.log(`🔄 Resuming backfill from saved token`);
        console.log(`   Last processed: ${new Date(savedProgress.last_processed_timestamp * 1000).toISOString()}`);
    }

    console.log('📡 Starting data collection...\n');

    try {
        while (!reachedTarget) {
            stats.totalPages++;

            // Fetch page
            const { messages, nextToken: newToken } = await client.fetchMessages({
                limit: BATCH_SIZE,
                nextToken
            });

            if (messages.length === 0) {
                console.log('\n✓ Reached end of available data');
                break;
            }

            stats.totalMessages += messages.length;

            // Process each message
            for (const msg of messages) {
                const parsed = client.parseMessageWithDvnAttribution(msg);
                if (!parsed) continue;

                stats.messagesProcessed++;

                // Track oldest message
                if (parsed.timestamp > 0 && parsed.timestamp < oldestTimestamp) {
                    oldestTimestamp = parsed.timestamp;
                }

                // Check if we've reached target
                if (parsed.timestamp > 0 && parsed.timestamp <= targetTimestamp) {
                    reachedTarget = true;
                }

                // Track DVN attributions
                for (const dvn of parsed.dvns) {
                    if (dvn.dvnId && stats.dvnCounts[dvn.dvnId] !== undefined) {
                        stats.dvnCounts[dvn.dvnId]++;
                        stats.dvnAttributions++;
                    }
                }

                messageBatch.push(parsed);
            }

            nextToken = newToken;

            // Save to database periodically
            if (stats.totalPages % SAVE_INTERVAL === 0 && messageBatch.length > 0) {
                const saved = await saveBatchToDatabase(db, messageBatch);
                stats.transactionsStored += saved;

                // Save progress checkpoint
                db.updateBackfillProgress('global_backfill', {
                    dvn_name: 'Global Backfill',
                    last_processed_timestamp: oldestTimestamp,
                    total_transactions: stats.totalMessages,
                    status: 'in_progress',
                    next_token: nextToken
                });

                messageBatch = [];
            }

            // Progress logging
            if (stats.totalPages % PROGRESS_INTERVAL === 0) {
                const elapsed = (Date.now() - stats.startTime) / 1000;
                const rate = stats.totalMessages / elapsed;
                const oldestDate = new Date(oldestTimestamp * 1000);

                console.log(`📊 Page ${stats.totalPages}: ${stats.totalMessages.toLocaleString()} messages`);
                console.log(`   Oldest: ${oldestDate.toISOString()} | Rate: ${rate.toFixed(0)} msg/s`);

                // Top DVNs so far
                const topDvns = Object.entries(stats.dvnCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .filter(([_, count]) => count > 0);

                if (topDvns.length > 0) {
                    console.log(`   Top DVNs: ${topDvns.map(([id, c]) => `${id}(${c})`).join(', ')}`);
                }
                console.log('');
            }

            if (!nextToken) {
                console.log('\n✓ Reached end of pagination');
                break;
            }
        }

        // Save remaining batch
        if (messageBatch.length > 0) {
            const saved = await saveBatchToDatabase(db, messageBatch);
            stats.transactionsStored += saved;

            // Save final progress
            db.updateBackfillProgress('global_backfill', {
                dvn_name: 'Global Backfill',
                last_processed_timestamp: oldestTimestamp,
                total_transactions: stats.totalMessages,
                status: reachedTarget ? 'completed' : 'stopped',
                next_token: nextToken
            });
        }

    } catch (error) {
        console.error(`\n❌ Error during backfill: ${error.message}`);
        stats.errors++;
    }

    // Final summary
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   BACKFILL COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
    console.log(`📄 Pages fetched: ${stats.totalPages.toLocaleString()}`);
    console.log(`📨 Messages processed: ${stats.messagesProcessed.toLocaleString()}`);
    console.log(`💾 Transactions stored: ${stats.transactionsStored.toLocaleString()}`);
    console.log(`🔗 DVN attributions: ${stats.dvnAttributions.toLocaleString()}`);

    if (oldestTimestamp < Infinity) {
        const oldestDate = new Date(oldestTimestamp * 1000);
        const daysBack = (now - oldestTimestamp) / 86400;
        console.log(`📅 Data range: ${daysBack.toFixed(1)} days back to ${oldestDate.toISOString()}`);
    }

    // DVN summary
    console.log('\n📊 DVN Transaction Counts:');
    const sortedDvns = Object.entries(stats.dvnCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    sortedDvns.forEach(([id, count]) => {
        console.log(`   ${id}: ${count.toLocaleString()}`);
    });

    if (stats.errors > 0) {
        console.log(`\n⚠️  Errors: ${stats.errors}`);
    }

    console.log('\n✨ Done!\n');

    db.close();
    return stats;
}

/**
 * Save batch of messages to database
 */
async function saveBatchToDatabase(dbWrapper, messages) {
    if (messages.length === 0) return 0;

    // Access the raw better-sqlite3 instance
    const db = dbWrapper.db;

    let saved = 0;
    const insertTx = db.prepare(`
        INSERT OR IGNORE INTO transactions (
            tx_hash, source_tx_hash, timestamp, 
            source_chain_eid, source_chain_name,
            destination_chain_eid, destination_chain_name,
            oapp_address, delivery_status, latency_seconds,
            created_at, payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAttribution = db.prepare(`
        INSERT OR IGNORE INTO dvn_attribution (
            tx_hash, dvn_address, attribution_type, estimated_fee_usd
        ) VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
        for (const msg of messages) {
            if (!msg.tx_hash) continue;

            try {
                insertTx.run(
                    msg.tx_hash,
                    msg.source_tx_hash,
                    msg.timestamp,
                    msg.source_chain_eid,
                    msg.source_chain_name,
                    msg.destination_chain_eid,
                    msg.destination_chain_name,
                    msg.oapp_address,
                    msg.delivery_status,
                    msg.latency_seconds,
                    Math.floor(Date.now() / 1000),
                    msg.payload || null
                );
                saved++;

                // Insert DVN attributions
                for (const dvn of msg.dvns) {
                    insertAttribution.run(
                        msg.tx_hash,
                        dvn.address,
                        dvn.isRequired ? 'required' : 'optional',
                        null  // estimated_fee_usd
                    );
                }
            } catch (e) {
                // Ignore duplicates
            }
        }
    });

    transaction();
    return saved;
}

// Run if called directly
if (require.main === module) {
    runFullBackfill().catch(console.error);
}

module.exports = { runFullBackfill };
