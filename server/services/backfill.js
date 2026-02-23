// server/services/backfill.js
// Backfill orchestration for historical DVN data

const { getDatabase } = require('../database/db');
const { LayerZeroScanClient } = require('./lzScanClient');
const { DVN_REGISTRY } = require('../../src/utils/dvnRegistry');

class BackfillService {
    constructor() {
        this.db = getDatabase();
        this.lzClient = new LayerZeroScanClient();
        this.backfillMonths = parseInt(process.env.BACKFILL_MONTHS) || 6;
    }

    /**
     * Calculate time range for backfill
     */
    getTimeRange() {
        const now = new Date();
        const startDate = new Date();
        startDate.setMonth(now.getMonth() - this.backfillMonths);

        return {
            start: Math.floor(startDate.getTime() / 1000),
            end: Math.floor(now.getTime() / 1000)
        };
    }

    /**
     * Backfill data for a single DVN
     */
    async backfillDVN(dvnId, options = {}) {
        const dvnInfo = DVN_REGISTRY[dvnId];
        if (!dvnInfo) {
            throw new Error(`DVN not found in registry: ${dvnId}`);
        }

        // Get Ethereum mainnet address (chain EID 30101)
        const ethereumAddress = dvnInfo.addresses['30101'];
        if (!ethereumAddress) {
            throw new Error(`${dvnInfo.name} does not have an Ethereum address (EID 30101)`);
        }

        console.log(`\n🚀 Starting backfill for: ${dvnInfo.name}`);
        console.log(`📅 Time range: ${this.backfillMonths} months`);

        // Get or create backfill progress record
        let progress = this.db.getBackfillProgress(ethereumAddress);

        if (!progress) {
            this.db.updateBackfillProgress(ethereumAddress, {
                dvn_name: dvnInfo.name,
                last_processed_timestamp: null,
                total_transactions: 0,
                status: 'pending',
                started_at: null,
                completed_at: null
            });
            progress = this.db.getBackfillProgress(ethereumAddress);
        }

        // If already completed, skip unless force option is set
        if (progress && progress.status === 'completed' && !options.force) {
            console.log(`✅ Already completed (use --force to re-run)`);
            return progress;
        }

        // Update status to in_progress
        this.db.updateBackfillProgress(ethereumAddress, {
            ...progress,
            status: 'in_progress',
            started_at: Math.floor(Date.now() / 1000)
        });

        const timeRange = this.getTimeRange();
        let totalProcessed = 0;
        let errorCount = 0;

        try {
            // Fetch messages for primary chain (Ethereum)
            console.log(`\n📡 Fetching messages for ${dvnInfo.name}...`);
            console.log(`   Address: ${ethereumAddress}`);

            const messages = await this.lzClient.fetchHistoricalMessages(
                timeRange.start,
                {}, // No filter (API requires global fetch)
                (progress) => {
                    // Optional: log progress if needed, or keeping it simple
                }
            );

            console.log(`\n✓ Retrieved ${messages.length} total messages`);
            console.log(`📊 Processing transactions...`);

            // Process in batches
            const batchSize = parseInt(process.env.BACKFILL_BATCH_SIZE) || 100;

            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const transactions = [];

                for (const msg of batch) {
                    try {
                        const tx = this.lzClient.parseMessage(msg);
                        if (tx) {
                            transactions.push(tx);
                        }
                    } catch (error) {
                        console.error(`   ❌ Parse error:`, error.message);
                        this.db.logError('parse_error', { message: msg }, error.message);
                        errorCount++;
                    }
                }

                // Insert batch
                if (transactions.length > 0) {
                    try {
                        this.db.insertTransactionsBatch(transactions);
                        totalProcessed += transactions.length;

                        // Update progress
                        const lastTx = transactions[transactions.length - 1];
                        this.db.updateBackfillProgress(ethereumAddress, {
                            dvn_name: dvnInfo.name,
                            last_processed_timestamp: lastTx.timestamp,
                            total_transactions: totalProcessed,
                            status: 'in_progress'
                        });

                        process.stdout.write(`\r   Processed: ${totalProcessed}/${messages.length}`);
                    } catch (error) {
                        console.error(`\n   ❌ Batch insert error:`, error.message);
                        this.db.logError('insert_error', { batch_size: transactions.length }, error.message);
                        errorCount++;
                    }
                }
            }

            console.log(`\n\n✅ Backfill completed for ${dvnInfo.name}`);
            console.log(`   Total processed: ${totalProcessed}`);
            console.log(`   Errors: ${errorCount}`);

            // Calculate aggregated metrics
            console.log(`\n📊 Calculating metrics...`);
            const metrics = this.db.calculateDVNMetrics(ethereumAddress);

            console.log(`\n📈 DVN Metrics:`);
            console.log(`   Total Volume (USD): $${(metrics.total_volume_usd || 0).toLocaleString()}`);
            console.log(`   Total Transactions: ${metrics.tx_count || 0}`);
            console.log(`   Success Rate: ${((metrics.success_count / metrics.tx_count) * 100 || 0).toFixed(2)}%`);
            console.log(`   Unique OApps: ${metrics.unique_oapps || 0}`);

            // Mark as completed
            this.db.updateBackfillProgress(ethereumAddress, {
                dvn_name: dvnInfo.name,
                last_processed_timestamp: timeRange.end,
                total_transactions: totalProcessed,
                status: 'completed',
                completed_at: Math.floor(Date.now() / 1000)
            });

            return {
                dvn: dvnInfo.name,
                processed: totalProcessed,
                errors: errorCount,
                metrics
            };

        } catch (error) {
            console.error(`\n❌ Backfill failed for ${dvnInfo.name}:`, error.message);

            this.db.updateBackfillProgress(ethereumAddress, {
                dvn_name: dvnInfo.name,
                last_processed_timestamp: progress?.last_processed_timestamp,
                total_transactions: totalProcessed,
                status: 'failed',
                error_message: error.message
            });

            this.db.logError('backfill_failure', { dvn: dvnInfo.name }, error.message);
            throw error;
        }
    }

    /**
     * Backfill multiple DVNs
     */
    async backfillMultiple(dvnIds) {
        const results = [];

        for (const dvnId of dvnIds) {
            try {
                const result = await this.backfillDVN(dvnId);
                results.push(result);
            } catch (error) {
                console.error(`Failed to backfill ${dvnId}:`, error.message);
                results.push({ dvn: dvnId, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get top DVNs from registry
     */
    getTopDVNs(count = 10) {
        return Object.keys(DVN_REGISTRY)
            .filter(id => DVN_REGISTRY[id].confidence === 'high')
            .slice(0, count);
    }
}

module.exports = { BackfillService };
