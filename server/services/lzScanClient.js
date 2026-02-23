// server/services/lzScanClient.js
// LayerZero Scan API client with full pagination support for historical data
// Uses REST API with nextToken for deep historical queries

const axios = require('axios');
const { lookupDvnByAddress, getAllAddressesForDvn, DVN_ADDRESS_MAP } = require('./dvnAddressMap');

const LZSCAN_API = 'https://scan.layerzero-api.com/v1';

class LayerZeroScanClient {
    constructor() {
        this.baseURL = LZSCAN_API;
        this.rateLimitMs = parseInt(process.env.BACKFILL_RATE_LIMIT_MS) || 200;
        this.lastRequestTime = 0;
    }

    /**
     * Rate limiting helper
     */
    async rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.rateLimitMs) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - elapsed));
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Fetch messages with pagination support
     * @param {object} options - { limit, nextToken }
     * @returns {Promise<{messages: Array, nextToken: string|null}>}
     */
    async fetchMessages(options = {}, retryCount = 0) {
        const MAX_RETRIES = 3;
        await this.rateLimit();

        const { limit = 1000, nextToken = null } = options;

        // Debug first request
        if (!nextToken && retryCount === 0) {
            console.log('   Fetching first page...');
        }

        try {
            let url = `${this.baseURL}/messages/latest?limit=${limit}`;

            // Append other options as query params (e.g., address, sender, etc.)
            for (const [key, value] of Object.entries(options)) {
                if (key !== 'limit' && key !== 'nextToken') {
                    url += `&${key}=${encodeURIComponent(value)}`;
                }
            }

            if (nextToken) {
                url += `&nextToken=${encodeURIComponent(nextToken)}`;
            }

            const response = await axios.get(url, {
                timeout: 120000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DVN-Intelligence/1.0'
                }
            });

            return {
                messages: response.data?.data || [],
                nextToken: response.data?.nextToken || null
            };
        } catch (error) {
            const MAX_RETRIES = 10;

            // Rate limit retry
            if (error.response?.status === 429) {
                console.warn('⚠️  Rate limited, waiting 10s...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                return this.fetchMessages(options, retryCount);
            }

            // Retry on network errors
            const isNetworkError =
                error.message?.includes('SSL') ||
                error.message?.includes('stream') ||
                error.message?.includes('aborted') ||
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT';

            if (isNetworkError && retryCount < MAX_RETRIES) {
                const waitTime = (retryCount + 1) * 5000;
                console.warn(`⚠️  Connection error ("${error.message}"), retry ${retryCount + 1}/${MAX_RETRIES} in ${waitTime / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.fetchMessages(options, retryCount + 1);
            }

            throw new Error(`LayerZero Scan API error: ${error.message}`);
        }
    }

    /**
     * Fetch ALL historical messages up to a target date
     * Uses pagination to go back in time
     * @param {number} targetTimestamp - Stop when we reach this timestamp (unix seconds)
     * @param {function} onProgress - Callback for progress updates
     * @returns {Promise<Array>} - All messages
     */
    async fetchHistoricalMessages(targetTimestamp, options = {}, onProgress = null) {
        const allMessages = [];
        let nextToken = null;
        let page = 0;
        let oldestTimestamp = Infinity;
        let reachedTarget = false;

        console.log(`📡 Starting historical fetch back to ${new Date(targetTimestamp * 1000).toISOString()} (Filter: ${JSON.stringify(options)})`);

        while (!reachedTarget) {
            page++;
            const { messages, nextToken: newToken } = await this.fetchMessages({
                ...options,
                limit: 1000,
                nextToken
            });

            if (messages.length === 0) {
                console.log('   No more messages available');
                break;
            }

            // Track oldest message
            for (const msg of messages) {
                const ts = msg.source?.tx?.blockTimestamp || 0;
                if (ts > 0 && ts < oldestTimestamp) {
                    oldestTimestamp = ts;
                }

                // Check if we've reached our target
                if (ts > 0 && ts <= targetTimestamp) {
                    reachedTarget = true;
                }
            }

            allMessages.push(...messages);
            nextToken = newToken;

            // Progress update
            if (onProgress) {
                onProgress({
                    page,
                    totalMessages: allMessages.length,
                    oldestDate: new Date(oldestTimestamp * 1000),
                    reachedTarget
                });
            }

            if (page % 10 === 0) {
                const oldestDate = new Date(oldestTimestamp * 1000);
                console.log(`   Page ${page}: ${allMessages.length} messages, oldest: ${oldestDate.toISOString()}`);
            }

            if (!nextToken) {
                console.log('   End of available data');
                break;
            }

            // Safety limit
            if (page > 10000) {
                console.warn('⚠️  Reached 10,000 page limit');
                break;
            }
        }

        console.log(`✓ Fetched ${allMessages.length} total messages across ${page} pages`);
        return allMessages;
    }

    /**
     * Parse message and identify which DVNs verified it
     * Uses multi-chain DVN address lookup
     */
    parseMessageWithDvnAttribution(message) {
        try {
            const src = message.source?.tx || {};
            const dst = message.destination?.tx || {};
            const pathway = message.pathway || {};
            const config = message.config?.outboundConfig || message.config || {};

            // Get DVN addresses from config
            const requiredDvns = config.requiredDVNs || [];
            const optionalDvns = config.optionalDVNs || [];

            // Resolve DVN identities using multi-chain lookup
            const resolvedRequired = requiredDvns.map(addr => {
                const dvnInfo = lookupDvnByAddress(addr);
                return {
                    address: addr.toLowerCase(),
                    dvnId: dvnInfo?.dvnId || null,
                    name: dvnInfo?.canonicalName || 'Unknown',
                    isRequired: true
                };
            });

            const resolvedOptional = optionalDvns.map(addr => {
                const dvnInfo = lookupDvnByAddress(addr);
                return {
                    address: addr.toLowerCase(),
                    dvnId: dvnInfo?.dvnId || null,
                    name: dvnInfo?.canonicalName || 'Unknown',
                    isRequired: false
                };
            });

            // Determine status
            let status = 'PENDING';
            if (dst.txHash) status = 'DELIVERED';
            else if (message.status === 'FAILED' || message.status?.name === 'FAILED') status = 'FAILED';
            else if (message.status === 'INFLIGHT' || message.status?.name === 'INFLIGHT') status = 'INFLIGHT';

            const srcEid = pathway.srcEid || pathway.sender?.eid;
            const dstEid = pathway.dstEid || pathway.receiver?.eid;

            return {
                guid: message.guid,
                tx_hash: dst.txHash || src.txHash,
                source_tx_hash: src.txHash,
                payload: src.payload, // Capture raw payload for enrichment
                timestamp: src.blockTimestamp || Math.floor(new Date(message.created).getTime() / 1000),
                source_chain_eid: srcEid,
                source_chain_name: pathway.sender?.chain || `Chain ${srcEid}`,
                destination_chain_eid: dstEid,
                destination_chain_name: pathway.receiver?.chain || `Chain ${dstEid}`,
                oapp_address: pathway.sender?.address?.toLowerCase(),
                amount_tokens: null,
                amount_usd: null,
                token_symbol: null,
                dvns: [...resolvedRequired, ...resolvedOptional],
                delivery_status: status,
                latency_seconds: (dst.blockTimestamp && src.blockTimestamp)
                    ? dst.blockTimestamp - src.blockTimestamp
                    : null
            };
        } catch (error) {
            console.error('Failed to parse message:', error.message);
            return null;
        }
    }

    /**
     * Filter messages for a specific DVN (using all chain addresses)
     * @param {Array} messages - Raw messages from API
     * @param {string} dvnId - DVN identifier (e.g., 'deutsche-telekom')
     * @returns {Array} - Filtered and parsed messages
     */
    filterMessagesForDvn(messages, dvnId) {
        // Get all addresses for this DVN across all chains
        const dvnAddresses = getAllAddressesForDvn(dvnId);
        const addressSet = new Set(dvnAddresses.map(a => a.address.toLowerCase()));

        if (addressSet.size === 0) {
            console.warn(`⚠️  No addresses found for DVN: ${dvnId}`);
            return [];
        }

        console.log(`   🔍 Filtering for ${dvnId} (${addressSet.size} addresses across chains)`);

        const filtered = [];
        for (const msg of messages) {
            const config = msg.config?.outboundConfig || msg.config || {};
            const required = (config.requiredDVNs || []).map(a => a.toLowerCase());
            const optional = (config.optionalDVNs || []).map(a => a.toLowerCase());

            // Check if any of this DVN's addresses are in the message config
            const hasRequired = required.some(addr => addressSet.has(addr));
            const hasOptional = optional.some(addr => addressSet.has(addr));

            if (hasRequired || hasOptional) {
                const parsed = this.parseMessageWithDvnAttribution(msg);
                if (parsed) {
                    parsed.matchedAsDvn = dvnId;
                    parsed.wasRequired = hasRequired;
                    filtered.push(parsed);
                }
            }
        }

        return filtered;
    }
}

module.exports = { LayerZeroScanClient };
