const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dvn_intelligence.db');

console.log('═══════════════════════════════════════════════════════════════');
console.log('   DVN INTELLIGENCE - METRICS AGGREGATION ENGINE 🏗️');
console.log('═══════════════════════════════════════════════════════════════');

const db = new Database(DB_PATH);

// Batch size for processing
const BATCH_SIZE = 50000;

function runAggregation() {
    try {
        console.log(`📊 Connected to database: ${DB_PATH}`);

        // 1. Get total transaction count
        const counts = db.prepare('SELECT count(*) as count FROM transactions').get();
        const total = counts.count;
        console.log(`📚 Total messages to process: ${total.toLocaleString()}`);

        const aggregations = {
            dvn: new Map(), // key: dvn_address:period:start
            oapp: new Map() // key: oapp_address:period:start:src:dst
        };

        let processed = 0;
        let offset = 0;

        // Prepare statements
        const txQuery = db.prepare(`
            SELECT 
                t.timestamp,
                t.oapp_address,
                t.source_chain_eid,
                t.destination_chain_eid,
                t.amount_usd,
                t.delivery_status,
                t.latency_seconds,
                da.dvn_address,
                da.attribution_type
            FROM transactions t
            LEFT JOIN dvn_attribution da ON t.tx_hash = da.tx_hash
            ORDER BY t.timestamp ASC
            LIMIT ? OFFSET ?
        `);

        // Processing Loop
        while (offset < total) {
            const rows = txQuery.all(BATCH_SIZE, offset);

            if (rows.length === 0) break;

            for (const row of rows) {
                processRow(row, aggregations);
            }

            processed += rows.length;
            offset += BATCH_SIZE;

            process.stdout.write(`\r🔄 Processed: ${processed.toLocaleString()} / ${total.toLocaleString()} (${Math.round(processed / total * 100)}%)`);
        }

        console.log('\n\n💾 Saving Aggregated Metrics to DB...');
        saveAggregations(aggregations);

        console.log('\n✅ Aggregation Complete!');

    } catch (error) {
        console.error('\n❌ Fatal Error:', error);
    } finally {
        db.close();
    }
}

function processRow(row, aggs) {
    if (!row.timestamp) return;

    // Normalize timestamp to start of day
    const date = new Date(row.timestamp * 1000);
    date.setUTCHours(0, 0, 0, 0);
    const dayStart = Math.floor(date.getTime() / 1000);

    const amountUsd = parseFloat(row.amount_usd) || 0;
    const isSuccess = row.delivery_status === 'DELIVERED';
    const isFailure = row.delivery_status === 'FAILED';

    // 1. OApp Metrics (Daily + All-Time)
    if (row.oapp_address) {
        updateOAppMetric(aggs.oapp, row.oapp_address, 'daily', dayStart, row.source_chain_eid, row.destination_chain_eid, amountUsd);
        updateOAppMetric(aggs.oapp, row.oapp_address, 'all_time', 0, row.source_chain_eid, row.destination_chain_eid, amountUsd); // 0 for all time

        // Aggregate 'All Chains' view (source=0, dest=0)
        updateOAppMetric(aggs.oapp, row.oapp_address, 'daily', dayStart, 0, 0, amountUsd);
        updateOAppMetric(aggs.oapp, row.oapp_address, 'all_time', 0, 0, 0, amountUsd);
    }

    // 2. DVN Metrics
    if (row.dvn_address) {
        updateDVNMetric(aggs.dvn, row.dvn_address, 'daily', dayStart, amountUsd, row.attribution_type, isSuccess, isFailure, row.latency_seconds);
        updateDVNMetric(aggs.dvn, row.dvn_address, 'all_time', 0, amountUsd, row.attribution_type, isSuccess, isFailure, row.latency_seconds);
    }
}

function updateOAppMetric(map, address, period, start, src, dst, vol) {
    const key = `${address}:${period}:${start}:${src}:${dst}`;

    if (!map.has(key)) {
        map.set(key, {
            oapp_address: address, time_period: period, period_start: start,
            source_chain_eid: src, dest_chain_eid: dst,
            volume_usd: 0, tx_count: 0
        });
    }

    const entry = map.get(key);
    entry.volume_usd += vol;
    entry.tx_count += 1;
}

function updateDVNMetric(map, address, period, start, vol, type, success, failure, latency) {
    const key = `${address}:${period}:${start}`;

    if (!map.has(key)) {
        map.set(key, {
            dvn_address: address, time_period: period, period_start: start,
            total_volume_usd: 0, total_volume_required_usd: 0, total_volume_optional_usd: 0,
            tx_count: 0, success_count: 0, failure_count: 0,
            latency_sum: 0, latency_count: 0
        });
    }

    const entry = map.get(key);
    entry.total_volume_usd += vol;
    if (type === 'required') entry.total_volume_required_usd += vol;
    if (type === 'optional') entry.total_volume_optional_usd += vol;

    entry.tx_count += 1;
    if (success) entry.success_count += 1;
    if (failure) entry.failure_count += 1;

    if (latency) {
        entry.latency_sum += latency;
        entry.latency_count += 1;
    }
}

function saveAggregations(aggs) {
    // 1. Save OApp Metrics
    const oappStmt = db.prepare(`
        INSERT OR REPLACE INTO oapp_metrics 
        (oapp_address, time_period, period_start, source_chain_eid, dest_chain_eid, volume_usd, tx_count)
        VALUES (@oapp_address, @time_period, @period_start, @source_chain_eid, @dest_chain_eid, @volume_usd, @tx_count)
    `);

    const insertOApp = db.transaction((metrics) => {
        for (const m of metrics) oappStmt.run(m);
    });

    console.log(`Writing ${aggs.oapp.size} OApp metric rows...`);
    insertOApp(aggs.oapp.values());

    // 2. Save DVN Metrics
    const dvnStmt = db.prepare(`
        INSERT OR REPLACE INTO dvn_metrics 
        (dvn_address, time_period, period_start, total_volume_usd, total_volume_required_usd, total_volume_optional_usd, 
         tx_count, success_count, failure_count, avg_latency_seconds)
        VALUES (@dvn_address, @time_period, @period_start, @total_volume_usd, @total_volume_required_usd, @total_volume_optional_usd,
         @tx_count, @success_count, @failure_count, @avg_latency)
    `);

    const insertDVN = db.transaction((metrics) => {
        for (const m of metrics) {
            m.avg_latency = m.latency_count > 0 ? Math.round(m.latency_sum / m.latency_count) : null;
            dvnStmt.run(m);
        }
    });

    console.log(`Writing ${aggs.dvn.size} DVN metric rows...`);
    insertDVN(aggs.dvn.values());
}

if (require.main === module) {
    runAggregation();
}
