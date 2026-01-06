/* global BigInt */
// src/services/IntelligenceService.js
// THE GRAND FIX: Robust, Class-Based Data Service for DVN Intelligence

import { CHAIN_INFO, getDVNAddresses } from '../utils/dvnRegistry';
import { getAssetDisplayName } from '../utils/assetRegistry';

const LZSCAN_API = "https://scan.layerzero-api.com/v1";
const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const ETHERSCAN_KEY = process.env.REACT_APP_ETHERSCAN_KEY || "VTDG6VHKP4CJHK4G5CDDQYWF5CWUHVKGM4";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Event signatures (keccak256 hashes)
const EVENT_SIGNATURES = {
    DVNFeePaid: '0x2f32cdb66b67e12c3e2b4784aa1d3aca8b1e898e5dfbe69e1f95e8e0bdb74a66',
    ExecutorFeePaid: '0x67438c464be5cea5c673c9902f1d2f6c56ad0a8f6a1933a367b92f4568772b8c'
};

// Cache Constants
const CACHE_TTL = 1000 * 60 * 5; // 5 mins standard
const LIVE_TTL = 1000 * 30;      // 30s for live feeds

class LayerZeroIntelligenceService {
    constructor() {
        this.cache = new Map();
    }

    /* -------------------------------------------------------------------------- */
    /*                            CORE SEARCH API                                 */
    /* -------------------------------------------------------------------------- */

    async search(query) {
        const q = query.trim().toLowerCase();

        // 1. DVN Name Lookup
        const dvnInfo = getDVNAddresses(query) || getDVNAddresses(q);
        if (dvnInfo) {
            return {
                type: "dvn_name",
                name: dvnInfo.name,
                addresses: dvnInfo.addresses,
                message: `Found ${dvnInfo.name}. Select an address to view.`
            };
        }

        // 2. Transaction Hash
        if (q.startsWith('0x') && q.length === 66) {
            return await this.getTransaction(q);
        }

        // 3. Address (Wallet or DVN or OApp)
        if (q.startsWith('0x') && q.length === 42) {
            return await this.getAddressProfile(q);
        }

        return { error: "Invalid format. Try a Tx Hash, Address (0x...), or DVN Name." };
    }

    /* -------------------------------------------------------------------------- */
    /*                            TRANSACTION DATALAYER                           */
    /* -------------------------------------------------------------------------- */

    async getTransaction(txHash) {
        const cacheKey = `tx:${txHash}`;
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            // 1. Fetch RAW Data (Critical Path)
            let rawMsg = await this._fetchRawMessage(txHash);
            if (!rawMsg) return { error: "Transaction not found on LayerZero." };

            // 2. Parse into Standard Model (Safe)
            let transaction = this._normalizeTransaction(rawMsg);

            // 3. Enrich (Non-Critical Path)
            try {
                const enriched = await this._enrichTransaction(transaction);
                transaction = { ...transaction, ...enriched };
            } catch (e) {
                console.warn('Enrichment partially failed:', e);
            }

            this._setCache(cacheKey, transaction);
            return transaction;

        } catch (e) {
            console.error('Service Error (getTx):', e);
            return { error: "Failed to load transaction data." };
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                            ADDRESS / TRADER DATALAYER                      */
    /* -------------------------------------------------------------------------- */

    async getAddressProfile(address) {
        const cacheKey = `addr:${address}`;
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            let rawTxs = [];

            // Strategy 1: Try global endpoint with address filter (works for senders)
            try {
                // Use /messages/latest as it is the verified working endpoint
                const globalRes = await fetch(`${LZSCAN_API}/messages/latest?senderAddress=${address}&limit=50`);
                if (globalRes.ok) {
                    const globalData = await globalRes.json();
                    rawTxs = globalData.data || globalData.messages || [];
                }
            } catch { /* continue to fallback */ }

            // Strategy 2: Disabled (Legacy endpoint /messages/address/... often 404s on V1)
            // We rely on Strategy 1 (Global) or Strategy 3 (Chain Scan V2)
            if (false && rawTxs.length === 0) {
                // Legacy block preserved but disabled
            }

            // Strategy 3: Scan priority chains
            if (rawTxs.length === 0) {
                // Expanded Priority Chains (Top 20 by Volume)
                const PRIORITY_CHAINS = [
                    30101, 30102, 30110, 30184, 30109, 30106, 30111, 30112, // Eth, BNB, Arb, Base, Poly, Avax, Opt, Fantom
                    30165, 30183, 30214, 30243, 30290, 30145, 30121, 30150  // ZkSync, Linea, Scroll, Blast, Mantle, Kava, Harmony, Sol
                ];
                rawTxs = await this._scanChainsForAddress(address, PRIORITY_CHAINS);
            }

            if (rawTxs.length === 0) {
                return { error: "No activity found. This address may not have recent LayerZero transactions." };
            }

            const transactions = rawTxs.map(msg => this._normalizeTransaction(msg))
                .sort((a, b) => new Date(b.source_timestamp) - new Date(a.source_timestamp));

            // Detect address type based on transaction patterns
            let addressType = 'wallet';
            const isDVN = transactions.some(tx =>
                tx.required_dvn_addresses?.includes(address.toLowerCase()) ||
                tx.optional_dvn_addresses?.includes(address.toLowerCase())
            );
            const isOApp = transactions.some(tx =>
                tx.oapp_address?.toLowerCase() === address.toLowerCase()
            );

            if (isDVN) addressType = 'dvn';
            else if (isOApp) addressType = 'oapp';

            const stats = await this._calculateTraderMetrics(address, transactions);

            const profile = {
                type: addressType,
                address,
                display_name: getAssetDisplayName(address) || null,
                transactions,
                stats
            };

            this._setCache(cacheKey, profile);
            return profile;

        } catch (e) {
            console.error('Service Error (getAddress):', e);
            return { error: "Failed to scan address." };
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                            LIVE INTELLIGENCE (GLOBAL)                      */
    /* -------------------------------------------------------------------------- */

    async getLiveFeed(limit = 100) {
        const cacheKey = 'live_feed_v4';
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            // FIX: Verified endpoint is /messages/latest
            // This endpoint supports global queries without 404s
            const url = `${LZSCAN_API}/messages/latest?limit=${limit}`;
            const res = await fetch(url);
            const data = await res.json();
            const allMessages = data.data || data.messages || [];

            const results = {
                inflight: [], blocked: [], failed: [],
                recent: allMessages.map(m => this._normalizeTransaction(m)), // Full history including Delivered
                insights: { topChain: null }
            };

            // Filter by status client-side
            results.inflight = allMessages.filter(m => (m.status === 'INFLIGHT' || m.status?.name === 'INFLIGHT'))
                .map(m => this._normalizeTransaction(m))
                .slice(0, limit);

            results.blocked = allMessages.filter(m => (m.status === 'BLOCKED' || m.status?.name === 'BLOCKED'))
                .map(m => this._normalizeTransaction(m))
                .slice(0, limit);

            results.failed = allMessages.filter(m => (m.status === 'FAILED' || m.status?.name === 'FAILED'))
                .map(m => this._normalizeTransaction(m))
                .slice(0, limit);

            if (results.inflight.length > 0) {
                const counts = {};
                results.inflight.forEach(t => counts[t.source_chain_name] = (counts[t.source_chain_name] || 0) + 1);
                results.insights.topChain = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
            }

            this._setCache(cacheKey, results, LIVE_TTL);
            return results;

        } catch (e) {
            console.error('Service Error (LiveFeed):', e);
            return { inflight: [], blocked: [], failed: [], insights: {} };
        }
    }

    async getDvnPulse(dvnAddress) {
        try {
            const res = await fetch(`${LZSCAN_API}/messages?limit=100`);
            const data = await res.json();
            const msgs = data.messages || data.data || [];

            const relevant = msgs.map(m => this._normalizeTransaction(m))
                .filter(tx => {
                    const stack = [...tx.required_dvn_addresses, ...tx.optional_dvn_addresses];
                    return stack.some(a => a.toLowerCase() === dvnAddress.toLowerCase());
                });

            if (relevant.length === 0) return null;

            const delivered = relevant.filter(t => t.delivery_status === 'Delivered');

            return {
                recentTxs: relevant,
                successRate: (delivered.length / relevant.length) * 100,
                uniqueChains: new Set(relevant.map(t => t.source_chain_eid)).size
            };
        } catch { return null; }
    }


    /* -------------------------------------------------------------------------- */
    /*                            NORMALIZATION & ENRICHMENT                      */
    /* -------------------------------------------------------------------------- */

    _normalizeTransaction(msg) {
        const src = msg.source?.tx || {};
        const dst = msg.destination?.tx || {};
        const pathway = msg.pathway || {};
        const config = msg.config?.outboundConfig || msg.config || {};

        // Status Logic
        let status = 'PENDING';
        if (dst.txHash) status = 'Delivered';
        else if (msg.status === 'FAILED' || msg.status?.name === 'FAILED') status = 'Failed';
        else if (msg.status === 'INFLIGHT' || msg.status?.name === 'INFLIGHT') status = 'Inflight';
        else if (msg.status === 'BLOCKED' || msg.status?.name === 'BLOCKED') status = 'Blocked';

        // Chain Names Resolution
        const srcEid = pathway.srcEid || pathway.sender?.eid;
        const dstEid = pathway.dstEid || pathway.receiver?.eid;

        const srcName = CHAIN_INFO[srcEid] ? CHAIN_INFO[srcEid].name : (pathway.sender?.chain || `Chain ${srcEid}`);
        const dstName = CHAIN_INFO[dstEid] ? CHAIN_INFO[dstEid].name : (pathway.receiver?.chain || `Chain ${dstEid}`);

        return {
            // IDs
            message_guid: msg.guid,
            source_tx_hash: src.txHash,
            destination_tx_hash: dst.txHash,

            // Chain Info (BOTH formats for UI compatibility)
            source_chain_eid: srcEid,
            source_chain_name: srcName,
            source_chain: srcName,  // Alias for TransactionView.jsx
            destination_chain_eid: dstEid,
            destination_chain_name: dstName,
            destination_chain: dstName,  // Alias for TransactionView.jsx

            // Assets
            oapp_address: pathway.sender?.address,
            oapp_name: pathway.sender?.name || 'Unknown OApp',
            oapp_display_name: getAssetDisplayName(pathway.sender?.address, srcEid),

            // Setup
            required_dvn_addresses: config.requiredDVNs || [],
            optional_dvn_addresses: config.optionalDVNs || [],
            required_dvn_names: config.requiredDVNNames || [],
            dvn_stack_names: (config.requiredDVNNames || []).join(' + ') || 'Unknown Stack',

            // Metrics
            delivery_status: status,
            source_timestamp: src.blockTimestamp ? new Date(src.blockTimestamp * 1000).toISOString() : new Date().toISOString(),
            latency_seconds: (dst.blockTimestamp && src.blockTimestamp) ? dst.blockTimestamp - src.blockTimestamp : null,

            // Data - Try multiple sources for amount
            amount_tokens: this._extractAmountFromPayload(src.payload) !== 'Unknown'
                ? this._extractAmountFromPayload(src.payload)
                : (BigInt(src.value || '0') > 0n ? (Number(BigInt(src.value) / 10n ** 14n) / 10000).toFixed(4) + ' Native' : 'Unknown'),
            native_value_wei: src.value || msg.nativeValue || src.options?.lzReceive?.value || '0', // Raw native value from API
            amount_usd: 0,
            total_fee_usd: null,
            chain_fee_usd: null,
            dvn_fee_usd: null,
            executor_fee_usd: null
        };
    }

    async _enrichTransaction(tx) {
        const enriched = {};

        // 1. Get Asset Price (STRICT SEPARATION)
        try {
            const price = await this._getAssetPrice(tx.oapp_address, tx.source_chain_eid);

            if (price > 0 && tx.amount_tokens) {
                const cleanAmt = tx.amount_tokens.split(' ')[0].replace(/,/g, ''); // "1,000.00 USDC" -> "1000.00"
                const val = parseFloat(cleanAmt);
                if (!isNaN(val)) {
                    enriched.amount_usd = (val * price).toFixed(2);
                }
            }
            enriched.asset_price_usd = price;
        } catch (e) {
            console.warn('Price fetch failed', e);
        }

        // 2. Get Fees (Etherscan)
        if (tx.source_tx_hash && tx.source_chain_eid) {
            try {
                const fees = await this._fetchFeesFromExplorer(tx.source_tx_hash, tx.source_chain_eid);
                Object.assign(enriched, fees);
            } catch (e) {
                console.warn('Fee fetch failed', e);
            }
        }

        return enriched;
    }

    // --- External API Logic ---

    async _getAssetPrice(address, eid) {
        if (!address || !eid) return 0;

        try {
            // Map EID to DefiLlama Chain Name
            const chainMap = {
                30101: 'ethereum', 30102: 'bsc', 30110: 'arbitrum',
                30184: 'base', 30109: 'polygon', 30106: 'avax', 30111: 'optimism'
            };

            const chainName = chainMap[eid];
            if (chainName) {
                const res = await fetch(`https://coins.llama.fi/prices/current/${chainName}:${address}`);
                const data = await res.json();
                const price = data.coins[`${chainName}:${address}`]?.price;
                if (price) return price;
            }
        } catch (e) { /* ignore */ }
        return 0;
    }

    async _fetchFeesFromExplorer(txHash, eid) {
        const result = {
            dvn_fee_usd: null, executor_fee_usd: null, chain_fee_usd: null, total_fee_usd: null,
            dvn_fees_parsed: []
        };

        const chainInfo = CHAIN_INFO[eid];
        if (!chainInfo) return result;

        // 1. Get Receipt Logs
        let logs = null;
        let gasUsed = 0n;
        let gasPrice = 0n;

        try {
            if (chainInfo.useBlockscout) {
                const r = await fetch(`${chainInfo.explorer}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`);
                const d = await r.json();
                if (d.result) {
                    logs = d.result.logs;
                    gasUsed = BigInt(d.result.gasUsed);
                    gasPrice = BigInt(d.result.effectiveGasPrice || d.result.gasPrice);
                }
            } else {
                // Try Etherscan V2
                const url = `${ETHERSCAN_V2_API}?chainid=${chainInfo.chainId}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_KEY}`;
                const r = await fetch(url);
                const d = await r.json();

                // Check for V2 error, fallback to legacy
                if (d.status === "0" && chainInfo.explorer) {
                    const fbUrl = `${chainInfo.explorer}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${this._getApiKeyForChain(chainInfo.chainId)}`;
                    const r2 = await fetch(fbUrl);
                    const d2 = await r2.json();
                    logs = d2.result?.logs;
                    gasUsed = BigInt(d2.result?.gasUsed || 0);
                    gasPrice = BigInt(d2.result?.effectiveGasPrice || d2.result?.gasPrice || 0);
                } else {
                    logs = d.result?.logs;
                    gasUsed = BigInt(d.result?.gasUsed || 0);
                    gasPrice = BigInt(d.result?.effectiveGasPrice || d.result?.gasPrice || 0);
                }
            }
        } catch (e) { return result; }

        if (!logs) return result;

        // 2. Calculate Fees
        const nativePrice = await this._getNativeTokenPrice(chainInfo.coingeckoId);

        // Chain Fee
        const costWei = gasUsed * gasPrice;
        const costEth = Number(costWei) / 1e18;
        result.chain_fee_usd = (costEth * nativePrice).toFixed(2);
        let totalFee = parseFloat(result.chain_fee_usd);

        // DVN Fee 
        const dvnLogs = logs.filter(l => l.topics[0].toLowerCase() === EVENT_SIGNATURES.DVNFeePaid.toLowerCase());
        let dvnFeeWei = 0n;
        dvnLogs.forEach(l => dvnFeeWei += BigInt(l.data));
        result.dvn_fee_usd = ((Number(dvnFeeWei) / 1e18) * nativePrice).toFixed(4);
        totalFee += parseFloat(result.dvn_fee_usd);

        // Executor Fee
        const execLogs = logs.filter(l => l.topics[0].toLowerCase() === EVENT_SIGNATURES.ExecutorFeePaid.toLowerCase());
        let execFeeWei = 0n;
        execLogs.forEach(l => execFeeWei += BigInt(l.data));
        result.executor_fee_usd = ((Number(execFeeWei) / 1e18) * nativePrice).toFixed(2);
        totalFee += parseFloat(result.executor_fee_usd);

        result.total_fee_usd = totalFee.toFixed(2);
        return result;
    }

    async _scanChainsForAddress(address, eids) {
        const promises = eids.map(async (eid) => {
            try {
                // Use /messages/latest with srcEid filter for robust scanning
                const url = `${LZSCAN_API}/messages/latest?senderAddress=${address}&srcEid=${eid}&limit=20`;
                const res = await fetch(url);
                if (!res.ok) return [];
                const json = await res.json();
                return json.data || json.messages || [];
            } catch { return []; }
        });
        const results = await Promise.all(promises);
        return results.flat();
    }

    async _fetchRawMessage(txHash) {
        try {
            // Updated Path: Use Global Latest with sourceTxHash filter
            const res = await fetch(`${LZSCAN_API}/messages/latest?sourceTxHash=${txHash}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) return json.data[0];
                if (json.messages && json.messages.length > 0) return json.messages[0];
            }

            // Fallback 1: Legacy TX endpoint
            const resLegacy1 = await fetch(`${LZSCAN_API}/messages/tx/${txHash}`);
            if (resLegacy1.ok) {
                const json = await resLegacy1.json();
                return json.data?.[0];
            }

            // Fallback 2: Legacy short endpoint
            const resLegacy2 = await fetch(`${LZSCAN_API}/messages/${txHash}`);
            if (resLegacy2.ok) {
                const json = await resLegacy2.json();
                return json.data?.[0];
            }
        } catch { return null; }
        return null;
    }

    /* -------------------------------------------------------------------------- */
    /*                            HELPERS                                         */
    /* -------------------------------------------------------------------------- */

    _extractAmountFromPayload(payload) {
        if (!payload || !payload.startsWith('0x')) return "Unknown";
        // Heuristic: Last 32 bytes often uint256 amount
        try {
            const clean = payload.replace('0x', '');
            if (clean.length < 64) return "Unknown";
            const last64 = clean.slice(-64);
            const val = BigInt('0x' + last64);
            if (val > 0n && val < 1000000000000000000000000000n) { // Sanity check
                return (Number(val) / 1e18).toFixed(4);
            }
        } catch { }
        return "Unknown";
    }

    async _calculateTraderMetrics(address, txs) {
        let totalVol = 0;
        const routes = {};
        const assets = {};

        // Heuristic price for volume
        const recentEid = txs[0]?.source_chain_eid;
        const price = await this._getAssetPrice(address, recentEid);

        txs.forEach(tx => {
            const r = `${tx.source_chain_name} → ${tx.destination_chain_name}`;
            routes[r] = (routes[r] || 0) + 1;

            const a = tx.oapp_display_name || 'Unknown';
            assets[a] = (assets[a] || 0) + 1;

            if (tx.amount_usd) totalVol += parseFloat(tx.amount_usd);
        });

        const topRoute = Object.entries(routes).sort((a, b) => b[1] - a[1])[0];
        const topAsset = Object.entries(assets).sort((a, b) => b[1] - a[1])[0];

        return {
            totalVolumeUsd: totalVol.toFixed(2),
            topRoute: topRoute?.[0],
            topRouteCount: topRoute?.[1],
            topAsset: topAsset?.[0],
            assetPriceUsd: price
        };
    }

    async _getNativeTokenPrice(id) {
        if (!id) return 0;
        try {
            const r = await fetch(`${COINGECKO_API}?ids=${id}&vs_currencies=usd`);
            const d = await r.json();
            return d[id]?.usd || 0;
        } catch { return 0; }
    }

    _getApiKeyForChain(chainId) {
        // Basic mapping
        if (chainId === 56 && process.env.REACT_APP_BSCSCAN_KEY) return process.env.REACT_APP_BSCSCAN_KEY;
        return ETHERSCAN_KEY;
    }

    // --- Cache Helpers ---
    _getFromCache(key) {
        const item = this.cache.get(key);
        if (item && Date.now() < item.expiry) return item.value;
        return null;
    }

    _setCache(key, value, ttl = CACHE_TTL) {
        this.cache.set(key, { value, expiry: Date.now() + ttl });
    }
}

export const intelligenceService = new LayerZeroIntelligenceService();
