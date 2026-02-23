// server/database/db.js
// Database client wrapper for DVN Intelligence historical data

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');

class DVNDatabase {
    constructor() {
        // Ensure data directory exists
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new Database(DB_PATH);
        this.db.pragma('journal_mode = WAL'); // Better concurrency
        this.db.pragma('foreign_keys = ON');  // Enforce foreign keys
    }

    /**
     * Initialize database schema
     */
    initializeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema (SQLite executes multiple statements)
        this.db.exec(schema);

        console.log('✅ Database schema initialized');
    }

    /**
     * Insert transaction
     */
    insertTransaction(tx) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO transactions (
        tx_hash, source_tx_hash, timestamp,
        source_chain_eid, source_chain_name,
        destination_chain_eid, destination_chain_name,
        oapp_address, amount_tokens, amount_usd, token_symbol,
        required_dvn_addresses, optional_dvn_addresses,
        delivery_status, latency_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        return stmt.run(
            tx.tx_hash,
            tx.source_tx_hash,
            tx.timestamp,
            tx.source_chain_eid,
            tx.source_chain_name,
            tx.destination_chain_eid,
            tx.destination_chain_name,
            tx.oapp_address,
            tx.amount_tokens,
            tx.amount_usd,
            tx.token_symbol,
            JSON.stringify(tx.required_dvn_addresses || []),
            JSON.stringify(tx.optional_dvn_addresses || []),
            tx.delivery_status,
            tx.latency_seconds
        );
    }

    /**
     * Insert DVN attribution
     */
    insertDVNAttribution(dvnAddress, txHash, type, feeUsd = null) {
        const stmt = this.db.prepare(`
      INSERT INTO dvn_attribution (dvn_address, tx_hash, attribution_type, estimated_fee_usd)
      VALUES (?, ?, ?, ?)
    `);

        return stmt.run(dvnAddress, txHash, type, feeUsd);
    }

    /**
     * Batch insert transactions (transactional)
     */
    insertTransactionsBatch(transactions) {
        const insertMany = this.db.transaction((txs) => {
            for (const tx of txs) {
                this.insertTransaction(tx);

                // Insert DVN attributions
                if (tx.required_dvn_addresses) {
                    for (const dvn of tx.required_dvn_addresses) {
                        this.insertDVNAttribution(dvn, tx.tx_hash, 'required');
                    }
                }

                if (tx.optional_dvn_addresses) {
                    for (const dvn of tx.optional_dvn_addresses) {
                        this.insertDVNAttribution(dvn, tx.tx_hash, 'optional');
                    }
                }
            }
        });

        return insertMany(transactions);
    }

    /**
     * Get transactions for a DVN
     */
    getTransactionsByDVN(dvnAddress, limit = 100) {
        const stmt = this.db.prepare(`
      SELECT DISTINCT t.* 
      FROM transactions t
      JOIN dvn_attribution da ON t.tx_hash = da.tx_hash
      WHERE da.dvn_address = ?
      ORDER BY t.timestamp DESC
      LIMIT ?
    `);

        return stmt.all(dvnAddress, limit);
    }

    /**
     * Get DVN metrics
     */
    getDVNMetrics(dvnAddress, timePeriod = 'all_time') {
        const stmt = this.db.prepare(`
      SELECT * FROM dvn_metrics
      WHERE dvn_address = ? AND time_period = ?
      ORDER BY period_start DESC
      LIMIT 1
    `);

        return stmt.get(dvnAddress, timePeriod);
    }

    /**
     * Update backfill progress
     */
    updateBackfillProgress(dvnAddress, data) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO backfill_progress (
        dvn_address, dvn_name, last_processed_timestamp,
        total_transactions, status, error_message, started_at, completed_at, next_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        return stmt.run(
            dvnAddress,
            data.dvn_name,
            data.last_processed_timestamp,
            data.total_transactions,
            data.status,
            data.error_message || null,
            data.started_at || Date.now(),
            data.completed_at || null,
            data.next_token || null
        );
    }

    /**
     * Get backfill progress
     */
    getBackfillProgress(dvnAddress) {
        const stmt = this.db.prepare(`
      SELECT * FROM backfill_progress WHERE dvn_address = ?
    `);

        return stmt.get(dvnAddress);
    }

    /**
     * Log error
     */
    logError(errorType, context, message) {
        const stmt = this.db.prepare(`
      INSERT INTO error_log (error_type, context, message)
      VALUES (?, ?, ?)
    `);

        return stmt.run(errorType, JSON.stringify(context), message);
    }

    /**
     * Calculate and store aggregated metrics
     */
    calculateDVNMetrics(dvnAddress, timePeriod = 'all_time') {
        const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as tx_count,
        SUM(CASE WHEN delivery_status = 'DELIVERED' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN delivery_status != 'DELIVERED' THEN 1 ELSE 0 END) as failure_count,
        SUM(t.amount_usd) as total_volume_usd,
        AVG(t.latency_seconds) as avg_latency_seconds,
        COUNT(DISTINCT t.oapp_address) as unique_oapps
      FROM transactions t
      JOIN dvn_attribution da ON t.tx_hash = da.tx_hash
      WHERE da.dvn_address = ?
    `);

        const metrics = stmt.get(dvnAddress);

        // Insert into dvn_metrics table
        const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO dvn_metrics (
        dvn_address, time_period, period_start, period_end,
        total_volume_usd, tx_count, success_count, failure_count,
        avg_latency_seconds, unique_oapps
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const now = Math.floor(Date.now() / 1000);
        insertStmt.run(
            dvnAddress,
            timePeriod,
            0, // period_start (all time)
            now, // period_end
            metrics.total_volume_usd || 0,
            metrics.tx_count || 0,
            metrics.success_count || 0,
            metrics.failure_count || 0,
            metrics.avg_latency_seconds || 0,
            metrics.unique_oapps || 0
        );

        return metrics;
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

// Export singleton instance
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new DVNDatabase();
    }
    return dbInstance;
}

module.exports = { DVNDatabase, getDatabase };
