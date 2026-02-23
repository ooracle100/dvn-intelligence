const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, 'config/.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/dvn_intelligence.db');

app.use(cors());
app.use(express.json());

// Database connection
let db;
try {
    db = new Database(DB_PATH, { readonly: true });
    console.log(`✅ Connected to database: ${DB_PATH}`);
} catch (error) {
    console.error('❌ Database connection failed:', error);
}

// --- Pre-load search registries (once at startup, not per-request) ---

// 1. Stargate ecosystem assets (18,530 entries)
let stargateAssets = [];
try {
    const raw = fs.readFileSync(path.join(__dirname, '../public/stargate-ecosystem-assets.json'), 'utf8');
    stargateAssets = JSON.parse(raw);
    console.log(`✅ Loaded ${stargateAssets.length} Stargate ecosystem assets`);
} catch (e) {
    console.error('⚠️ Could not load stargate-ecosystem-assets.json:', e.message);
}

// 2. Manual registry (institutional tokens not in Stargate file)
const MANUAL_REGISTRY = [
    {
        id: 'wyoming-frnt', symbol: 'FRNT', name: 'Frontier Stable Token',
        issuer: 'Wyoming Stable Token Commission', type: 'State-Backed Stablecoin',
        chains: ['Ethereum', 'Arbitrum', 'Avalanche', 'Base', 'Optimism', 'Polygon', 'Solana'],
        addresses: {
            30101: '0x5e817f2abccb9095585d26c2a3ce234a440574fc',
            30110: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc',
            30184: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc'
        }
    },
    {
        id: 'ondo-ousg', symbol: 'OUSG', name: 'Ondo Short-Term US Government Treasuries',
        issuer: 'Ondo Finance', type: 'RWA (Tokenized Treasuries)',
        chains: ['Ethereum', 'Arbitrum'],
        addresses: {
            30101: '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92',
            30110: '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92'
        }
    },
    {
        id: 'blackrock-buidl', symbol: 'BUIDL', name: 'BlackRock USD Institutional Digital Liquidity',
        issuer: 'BlackRock / Securitize', type: 'RWA (Tokenized Money Market)',
        chains: ['Ethereum'],
        addresses: {
            30101: '0x7712c34205737192402172185a67e2d0f9f3c13c'
        }
    }
];
console.log(`✅ Loaded ${MANUAL_REGISTRY.length} manual registry entries`);

// Helper to get metrics
const getDailyMetrics = (table, addressCol, address) => {
    const stmt = db.prepare(`
        SELECT * FROM ${table} 
        WHERE ${addressCol} = ? AND time_period = 'daily'
        ORDER BY period_start DESC
        LIMIT 180
    `);
    return stmt.all(address);
};

const getAllTimeMetrics = (table, addressCol, address) => {
    const stmt = db.prepare(`
        SELECT * FROM ${table} 
        WHERE ${addressCol} = ? AND time_period = 'all_time'
        LIMIT 1
    `);
    return stmt.get(address);
};

// --- API Endpoints ---

// 1. DVN History - Supports both address and DVN ID (slug)
app.get('/api/dvn/:identifier/history', (req, res) => {
    try {
        const { identifier } = req.params;

        // Check if identifier is an address or a DVN ID
        let dvnId, allAddresses;

        if (identifier.startsWith('0x')) {
            // It's an address - lookup DVN ID
            const lookup = db.prepare(`SELECT dvn_id FROM dvn_lookup WHERE dvn_address = ?`).get(identifier.toLowerCase());
            dvnId = lookup?.dvn_id;
            allAddresses = dvnId
                ? db.prepare(`SELECT dvn_address FROM dvn_lookup WHERE dvn_id = ?`).all(dvnId).map(r => r.dvn_address)
                : [identifier.toLowerCase()];
        } else {
            // It's a DVN ID (slug like "layerzero-labs")
            dvnId = identifier;
            allAddresses = db.prepare(`SELECT dvn_address FROM dvn_lookup WHERE dvn_id = ?`).all(dvnId).map(r => r.dvn_address);
        }

        if (allAddresses.length === 0) {
            return res.status(404).json({ error: 'DVN not found' });
        }

        // Get aggregated allTime metrics from dvn_aggregate
        const aggregate = db.prepare(`SELECT * FROM dvn_aggregate WHERE dvn_id = ?`).get(dvnId);

        // If no aggregate (unknown DVN), fall back to single address
        let allTime;
        if (aggregate) {
            allTime = {
                dvn_id: aggregate.dvn_id,
                dvn_name: aggregate.dvn_name,
                total_volume_usd: aggregate.total_volume_usd,
                tx_count: aggregate.tx_count,
                success_count: aggregate.success_count,
                failure_count: aggregate.failure_count,
                avg_latency_seconds: aggregate.avg_latency_seconds,
                unique_oapps: aggregate.unique_oapps,
                address_count: aggregate.address_count,
                avg_dvn_fee_usd: aggregate.avg_dvn_fee_usd,
                time_period: 'all_time'
            };
        } else {
            allTime = getAllTimeMetrics('dvn_metrics', 'dvn_address', allAddresses[0]);
        }

        // Get combined daily metrics for all addresses
        const placeholders = allAddresses.map(() => '?').join(',');
        const daily = db.prepare(`
            SELECT 
                period_start,
                SUM(total_volume_usd) as total_volume_usd,
                SUM(tx_count) as tx_count,
                SUM(success_count) as success_count,
                SUM(failure_count) as failure_count,
                AVG(avg_latency_seconds) as avg_latency_seconds
            FROM dvn_metrics 
            WHERE dvn_address IN (${placeholders}) AND time_period = 'daily'
            GROUP BY period_start
            ORDER BY period_start DESC
            LIMIT 180
        `).all(...allAddresses);

        if (!allTime && daily.length === 0) {
            return res.status(404).json({ error: 'No historical data found' });
        }

        res.json({ allTime, daily, addresses: allAddresses });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 1b. DVN Analytics (pre-computed routes + stacks)
app.get('/api/dvn/:identifier/analytics', (req, res) => {
    try {
        const { identifier } = req.params;
        let dvnId;

        if (identifier.startsWith('0x')) {
            const lookup = db.prepare(`SELECT dvn_id FROM dvn_lookup WHERE dvn_address = ?`).get(identifier.toLowerCase());
            dvnId = lookup?.dvn_id;
        } else {
            dvnId = identifier.toLowerCase();
        }

        if (!dvnId) {
            return res.status(404).json({ error: 'DVN not found' });
        }

        // Pre-computed routes
        const routes = db.prepare(`
            SELECT source_chain, dest_chain, tx_count, volume_usd, success_rate, avg_latency
            FROM dvn_top_routes WHERE dvn_id = ? ORDER BY tx_count DESC LIMIT 10
        `).all(dvnId);

        // Pre-computed stacks
        const stacks = db.prepare(`
            SELECT stack_dvns, tx_count, success_rate, volume_usd, avg_latency
            FROM dvn_top_stacks WHERE dvn_id = ? ORDER BY tx_count DESC LIMIT 10
        `).all(dvnId);

        res.json({ dvnId, routes, stacks });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 1c. Search - Local DB + Verified Registry + Stargate Ecosystem + Manual Registry
app.get('/api/search/:query', (req, res) => {
    try {
        const { query } = req.params;
        const q = query.trim().toLowerCase();

        // --- Priority 1: Direct address lookup ---
        if (q.startsWith('0x') && q.length === 42) {
            const oappData = db.prepare(`
                SELECT oapp_address, SUM(volume_usd) as total_volume, SUM(tx_count) as total_txs
                FROM oapp_metrics WHERE oapp_address = ? AND time_period = 'all_time' AND source_chain_eid = 0
            `).get(q);

            if (oappData && oappData.total_txs > 0) {
                return res.json({
                    type: 'oapp', address: q,
                    volume: oappData.total_volume, txCount: oappData.total_txs,
                    source: 'local_db'
                });
            }

            // Check dvn_lookup
            const dvnData = db.prepare(`SELECT dvn_id FROM dvn_lookup WHERE dvn_address = ?`).get(q);
            if (dvnData) {
                return res.json({ type: 'dvn', dvnId: dvnData.dvn_id, source: 'local_db' });
            }

            // Check if address exists in Stargate ecosystem
            const sgMatch = stargateAssets.find(a =>
                a['OFT Address']?.toLowerCase() === q || a['Token Address']?.toLowerCase() === q
            );
            if (sgMatch) {
                return res.json({
                    type: 'ecosystem_asset',
                    address: q,
                    symbol: sgMatch['Asset Symbol'],
                    name: sgMatch['Asset Name'],
                    issuer: sgMatch['Issuer'],
                    chain: sgMatch['Chain'],
                    source: 'stargate_ecosystem'
                });
            }

            return res.json({ type: 'address_not_found', address: q });
        }

        // --- Priority 2: Verified OApps (tokens with pricing — most valuable results) ---
        const verifiedOapps = require('./data/verified_oapps.json');
        const tokenMatches = verifiedOapps.filter(t =>
            t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
        );

        if (tokenMatches.length > 0) {
            const addresses = tokenMatches.map(t => t.address);
            const placeholders = addresses.map(() => '?').join(',');

            try {
                const volumes = db.prepare(`
                    SELECT oapp_address, SUM(volume_usd) as vol 
                    FROM oapp_metrics 
                    WHERE oapp_address IN (${placeholders}) 
                    GROUP BY oapp_address
                `).all(...addresses);

                const volMap = {};
                volumes.forEach(v => volMap[v.oapp_address.toLowerCase()] = v.vol || 0);

                tokenMatches.sort((a, b) => {
                    const volA = volMap[a.address.toLowerCase()] || 0;
                    const volB = volMap[b.address.toLowerCase()] || 0;
                    return volB - volA;
                });
            } catch (e) {
                // Ignore volume sort errors
            }

            const results = tokenMatches.map(t => ({
                type: 'oapp', address: t.address, symbol: t.symbol, name: t.name,
                source: 'verified_registry'
            }));
            return res.json({ type: 'token_matches', results });
        }

        // --- Priority 3: Stargate Ecosystem Assets (18,530 entries) ---
        // Search by Asset Symbol, Asset Name, or Issuer
        const sgMatches = stargateAssets.filter(a => {
            const symbol = (a['Asset Symbol'] || '').toLowerCase();
            const name = (a['Asset Name'] || '').toLowerCase();
            const issuer = (a['Issuer'] || '').toLowerCase();
            return symbol.includes(q) || name.includes(q) || issuer.includes(q);
        });

        if (sgMatches.length > 0) {
            // Group by Issuer + Symbol for clean display
            // e.g. "USDY" → 1 result: Ondo USDY across 4 chains
            const grouped = {};
            sgMatches.forEach(a => {
                const key = `${(a['Issuer'] || 'Unknown').toLowerCase()}|${(a['Asset Symbol'] || '').toLowerCase()}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        symbol: a['Asset Symbol'],
                        name: a['Asset Name'],
                        issuer: a['Issuer'],
                        assetType: a['Asset Type'],
                        chains: [],
                        addresses: []
                    };
                }
                grouped[key].chains.push(a['Chain']);
                grouped[key].addresses.push({
                    chain: a['Chain'],
                    chainId: a['Chain ID'],
                    oftAddress: a['OFT Address'],
                    tokenAddress: a['Token Address'],
                    endpointId: a['Endpoint ID']
                });
            });

            const results = Object.values(grouped)
                .sort((a, b) => b.chains.length - a.chains.length) // Most deployed first
                .slice(0, 20) // Cap at 20 grouped results
                .map(g => ({
                    type: 'ecosystem_asset',
                    symbol: g.symbol,
                    name: g.name,
                    issuer: g.issuer,
                    assetType: g.assetType,
                    chainCount: g.chains.length,
                    chains: g.chains.slice(0, 10), // First 10 chains for display
                    addresses: g.addresses.slice(0, 5), // First 5 addresses for detail
                    source: 'stargate_ecosystem',
                    caveat: 'Volume shown covers tracked routes only. Actual activity may span additional chains not yet indexed.'
                }));

            return res.json({ type: 'ecosystem_matches', results, totalEntries: sgMatches.length });
        }

        // --- Priority 4: Manual Registry (FRNT, OUSG, BUIDL) ---
        const manualMatches = MANUAL_REGISTRY.filter(m => {
            return m.symbol.toLowerCase().includes(q)
                || m.name.toLowerCase().includes(q)
                || m.issuer.toLowerCase().includes(q);
        });

        if (manualMatches.length > 0) {
            const results = manualMatches.map(m => ({
                type: 'institutional_asset',
                symbol: m.symbol,
                name: m.name,
                issuer: m.issuer,
                assetType: m.type,
                chainCount: m.chains.length,
                chains: m.chains,
                addresses: m.addresses,
                source: 'manual_registry'
            }));
            return res.json({ type: 'institutional_matches', results });
        }

        // --- Priority 5: DVN aggregate names ---
        const dvnMatches = db.prepare(`
            SELECT dvn_id, dvn_name, total_volume_usd, tx_count 
            FROM dvn_aggregate WHERE LOWER(dvn_name) LIKE ? ORDER BY total_volume_usd DESC LIMIT 5
        `).all(`%${q}%`);

        if (dvnMatches.length > 0) {
            return res.json({ type: 'dvn_matches', results: dvnMatches });
        }

        res.json({ type: 'no_results' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. OApp History
// 2. OApp History & Analytics
app.get('/api/oapp/:address/history', (req, res) => {
    try {
        const { address } = req.params;

        // 1. Volume & Counts (Daily)
        const daily = db.prepare(`
            SELECT period_start, sum(volume_usd) as volume_usd, sum(tx_count) as tx_count 
            FROM oapp_metrics 
            WHERE oapp_address = ? AND time_period = 'daily'
            GROUP BY period_start
            ORDER BY period_start DESC
            LIMIT 180
        `).all(address);

        // 2. Top Corridors (All Time)
        const corridors = db.prepare(`
            SELECT source_chain_eid, dest_chain_eid, sum(volume_usd) as volume_usd, sum(tx_count) as tx_count
            FROM oapp_metrics
            WHERE oapp_address = ? AND time_period = 'all_time' AND source_chain_eid != 0
            GROUP BY source_chain_eid, dest_chain_eid
            ORDER BY volume_usd DESC
            LIMIT 10
        `).all(address);

        // 3. Stats (All Time)
        const allTime = db.prepare(`
            SELECT sum(volume_usd) as total_volume_usd, sum(tx_count) as total_tx_count
            FROM oapp_metrics
            WHERE oapp_address = ? AND time_period = 'all_time' AND source_chain_eid = 0
        `).get(address);

        // 4. Advanced Analytics (Real-time aggregation from transactions)
        // These power the "Moat" features: DVN Stacks, Active Chains, Route Performance
        let dvnStacks = [];
        let routes = [];

        try {
            // A. DVN Stack Performance
            dvnStacks = db.prepare(`
                SELECT 
                    json_extract(required_dvn_addresses, '$') as required_dvns,
                    json_extract(optional_dvn_addresses, '$') as optional_dvns,
                    count(*) as tx_count,
                    sum(case when delivery_status = 'Delivered' then 1 else 0 end) as success_count
                FROM transactions 
                WHERE oapp_address = ?
                GROUP BY required_dvn_addresses, optional_dvn_addresses
                ORDER BY tx_count DESC
                LIMIT 5
            `).all(address);

            // B. Route Performance Table
            routes = db.prepare(`
                SELECT 
                    source_chain_name, 
                    destination_chain_name, 
                    count(*) as count,
                    sum(amount_usd) as volume,
                    avg(latency_seconds) as avg_latency,
                    sum(case when delivery_status = 'Delivered' then 1 else 0 end) * 100.0 / count(*) as success_rate
                FROM transactions 
                WHERE oapp_address = ?
                GROUP BY source_chain_name, destination_chain_name
                ORDER BY count DESC
                LIMIT 20
            `).all(address);
        } catch (err) {
            console.warn(`⚠️ Advanced analytics query failed for ${address} (likely timeout on large dataset). Skipping.`);
        }

        // C. Active Chains
        const activeChains = db.prepare(`
            SELECT DISTINCT source_chain_name as chain FROM transactions WHERE oapp_address = ?
            UNION 
            SELECT DISTINCT destination_chain_name as chain FROM transactions WHERE oapp_address = ?
        `).all(address, address).map(r => r.chain);

        res.json({
            stats: allTime,
            daily,
            corridors,
            analytics: {
                dvnStacks,
                routes,
                activeChains
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. full Export (CSV)
app.get('/api/export/:address', (req, res) => {
    try {
        const { address } = req.params;
        const filename = `export_${address}_${Date.now()}.csv`;

        // Stream headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // CSV Header
        res.write('tx_hash,timestamp,source_chain,dest_chain,amount_usd,status,latency_seconds\n');

        const stmt = db.prepare(`
            SELECT tx_hash, timestamp, source_chain_name, destination_chain_name, amount_usd, delivery_status, latency_seconds
            FROM transactions 
            WHERE oapp_address = ? OR dvn_address_match = ? -- approximation, refine query if needed
            ORDER BY timestamp DESC
        `);

        // We use a custom query for OApps vs DVNs
        // For simplicity, let's assume OApp export for now or use the helper
        // Re-using the logic: if it's an OApp, filter by oapp_address
        const iter = db.prepare(`
            SELECT tx_hash, timestamp, source_chain_name, destination_chain_name, amount_usd, delivery_status, latency_seconds
            FROM transactions 
            WHERE oapp_address = ? 
            ORDER BY timestamp DESC
        `).iterate(address);

        for (const row of iter) {
            const line = [
                row.tx_hash,
                new Date(row.timestamp * 1000).toISOString(),
                row.source_chain_name,
                row.destination_chain_name,
                row.amount_usd || '0',
                row.delivery_status,
                row.latency_seconds || ''
            ].join(',') + '\n';
            res.write(line);
        }

        res.end();

    } catch (e) {
        console.error(e);
        res.status(500).end();
    }
});

// 4. Whale Watch (Top 50 Txs by Volume)
app.get('/api/oapp/:address/whales', (req, res) => {
    try {
        const { address } = req.params;
        const whales = db.prepare(`
            SELECT tx_hash, timestamp, source_chain_name, destination_chain_name, amount_usd, amount_tokens 
            FROM transactions 
            WHERE oapp_address = ? AND amount_usd > 1000 -- Filter noise
            ORDER BY amount_usd DESC 
            LIMIT 50
        `).all(address);
        res.json(whales);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: !!db });
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints: /api/dvn/:addr/history, /api/oapp/:addr/history`);
});
