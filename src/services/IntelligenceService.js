/* global BigInt */
// src/services/IntelligenceService.js
// FIX 2: ethers.js + ABI decoding for amounts and fees

import { ethers } from 'ethers';
import { CHAIN_INFO, getDVNAddresses, DVN_REGISTRY } from '../utils/dvnRegistry';
import { getAssetDisplayName, getAssetByAddress, INSTITUTIONAL_ASSETS } from '../utils/assetRegistry';
import { OFT_ABI, LAYERZERO_FEE_ABI } from '../utils/oftABI';

const LZSCAN_API = "https://scan.layerzero-api.com/v1";
const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || "demo";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

const ALCHEMY_ENDPOINTS = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    56: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    137: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    10: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    8453: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    43114: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
};

const CACHE_TTL = 1000 * 60 * 5;
const LIVE_TTL = 1000 * 30;
const FETCH_TIMEOUT = 10000;

class LayerZeroIntelligenceService {
    constructor() {
        this.cache = new Map();
        this.nativePrices = {};
        this.tokenPriceCache = new Map();
        this.oftInterface = new ethers.Interface(OFT_ABI);
        this.feeInterface = new ethers.Interface(LAYERZERO_FEE_ABI);
        this._initPrices();
    }

    async _initPrices() {
        try {
            const ids = 'ethereum,binancecoin,matic-network,avalanche-2,fantom';
            const res = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);
            const data = await res.json();

            this.nativePrices = {
                1: data.ethereum?.usd || 2000,
                56: data.binancecoin?.usd || 300,
                137: data['matic-network']?.usd || 0.5,
                43114: data['avalanche-2']?.usd || 20,
                250: data.fantom?.usd || 0.3,
                42161: data.ethereum?.usd || 2000,
                10: data.ethereum?.usd || 2000,
                8453: data.ethereum?.usd || 2000
            };
        } catch (e) {
            this.nativePrices = { 1: 2000, 56: 300, 137: 0.5, 42161: 2000, 10: 2000, 8453: 2000 };
        }
    }

    _getNativePriceForChain(chainId) {
        return this.nativePrices[chainId] || 0;
    }

    async search(query) {
        const q = query.trim().toLowerCase();

        // 1. Check DVN name match from local registry
        const dvnInfo = getDVNAddresses(query) || getDVNAddresses(q);
        if (dvnInfo) {
            return {
                type: "dvn_name",
                name: dvnInfo.name,
                addresses: dvnInfo.addresses,
                dvnId: this._getDVNIdFromName(dvnInfo.name),
                message: `Found ${dvnInfo.name}`
            };
        }

        // 2. Transaction hash → external API
        if (q.startsWith('0x') && q.length === 66) {
            const txResult = await this.getTransaction(q);
            if (!txResult.error) {
                return txResult;
            }
        }

        // 3. Address → Try local DB first, then external API
        if (q.startsWith('0x') && q.length === 42) {
            try {
                const localRes = await this._fetchWithTimeout(`/api/search/${q}`, 3000);
                if (localRes.ok) {
                    const localData = await localRes.json();
                    if (localData.type === 'oapp' && localData.source === 'local_db') {
                        return { type: 'oapp', address: q, localData };
                    }
                    if (localData.type === 'dvn') {
                        return { type: 'dvn_name', dvnId: localData.dvnId, address: q };
                    }
                }
            } catch (e) { /* fall through to external API */ }

            return await this.getAddressProfile(q);
        }

        // 4. Token name/symbol search → local API (searches verified registry + Stargate + manual)
        if (q.length >= 2) {
            try {
                const localRes = await this._fetchWithTimeout(`/api/search/${encodeURIComponent(q)}`, 3000);
                if (localRes.ok) {
                    const localData = await localRes.json();

                    // Verified OApps (priced tokens — highest quality)
                    if (localData.type === 'token_matches' && localData.results?.length > 0) {
                        const first = localData.results[0];
                        return { type: 'oapp', address: first.address, display_name: `${first.symbol} - ${first.name}` };
                    }

                    // Stargate Ecosystem (1,500+ tokens grouped by issuer)
                    if (localData.type === 'ecosystem_matches' && localData.results?.length > 0) {
                        const first = localData.results[0];
                        // Use the first OFT address from the first chain deployment
                        const firstAddr = first.addresses?.[0]?.oftAddress;
                        if (firstAddr) {
                            return {
                                type: 'oapp',
                                address: firstAddr,
                                display_name: `${first.symbol} - ${first.name} (${first.issuer})`,
                                ecosystem_data: first
                            };
                        }
                    }

                    // Manual Registry (institutional tokens: FRNT, OUSG, BUIDL)
                    if (localData.type === 'institutional_matches' && localData.results?.length > 0) {
                        const first = localData.results[0];
                        // Get the first address from the addresses object
                        const firstAddr = Object.values(first.addresses)?.[0];
                        if (firstAddr) {
                            return {
                                type: 'oapp',
                                address: firstAddr,
                                display_name: `${first.symbol} - ${first.name} (${first.issuer})`,
                                institutional_data: first
                            };
                        }
                    }

                    // DVN name matches
                    if (localData.type === 'dvn_matches' && localData.results?.length > 0) {
                        const first = localData.results[0];
                        return { type: 'dvn_name', dvnId: first.dvn_id, name: first.dvn_name };
                    }
                }
            } catch (e) { /* fall through */ }
        }

        return { error: "No results found. Try a contract address (0x...), DVN name, or token symbol." };
    }

    _getDVNIdFromName(name) {
        const normalized = name.toLowerCase();
        const { DVN_REGISTRY } = require('../utils/dvnRegistry');

        for (const [id, dvn] of Object.entries(DVN_REGISTRY)) {
            if (dvn.name.toLowerCase() === normalized) {
                return id;
            }
        }
        return null;
    }

    async getTransaction(txHash) {
        console.log(`🔍 DVN Intelligence: Fetching transaction ${txHash}...`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`🔍 [Production] Fetching DVN transaction data for ${txHash}`);
        }
        const cacheKey = `tx:${txHash}`;
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            const res = await this._fetchWithTimeout(
                `${LZSCAN_API}/messages/tx/${txHash}`,
                FETCH_TIMEOUT
            );

            if (!res.ok) {
                return { error: `Transaction not found (${res.status})` };
            }

            const json = await res.json();
            const rawMsg = json.data?.[0];

            if (!rawMsg) {
                return { error: "Transaction not found" };
            }

            let transaction = this._normalizeTransaction(rawMsg);

            // Decode with Alchemy + ethers.js
            if (transaction.source_tx_hash && transaction.source_chain_eid) {
                const chainId = CHAIN_INFO[transaction.source_chain_eid]?.chainId;

                if (chainId && ALCHEMY_ENDPOINTS[chainId]) {
                    const decoded = await this._decodeTransactionWithEthers(
                        transaction.source_tx_hash,
                        chainId,
                        transaction.source_chain_eid
                    );

                    transaction = { ...transaction, ...decoded };
                }
            }

            this._setCache(cacheKey, transaction);
            return transaction;

        } catch (e) {
            console.error('🚨 DVN Intelligence: Transaction error:', e);
            if (process.env.NODE_ENV === 'production') {
                console.error(`🚨 [Production] DVN Intelligence: Transaction error fetching ${txHash}:`, e.message);
            }
            return { error: "Failed to load transaction" };
        }
    }

    async _decodeTransactionWithEthers(txHash, chainId, eid) {
        const result = {
            amount_tokens: null,
            amount_usd: null,
            asset_symbol: null,
            asset_address: null,
            dvn_fee_usd: null,
            executor_fee_usd: null,
            chain_fee_usd: null,
            total_fee_usd: null
        };

        try {
            const endpoint = ALCHEMY_ENDPOINTS[chainId];
            if (!endpoint) return result;

            const receiptRes = await this._fetchWithTimeout(endpoint, FETCH_TIMEOUT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getTransactionReceipt',
                    params: [txHash]
                })
            });

            const receiptData = await receiptRes.json();
            const receipt = receiptData.result;

            if (!receipt) return result;

            const logs = receipt.logs || [];
            const nativePrice = this._getNativePriceForChain(chainId);

            console.log(`[Decoder] Chain ${chainId}, ${logs.length} logs found, native price: $${nativePrice}`);

            // Decode OFTSent with ethers.js
            for (const log of logs) {
                try {
                    const parsed = this.oftInterface.parseLog({ topics: log.topics, data: log.data });
                    console.log(`[Decoder] Parsed event: ${parsed?.name}`, parsed?.args);
                    if (parsed && parsed.name === 'OFTSent') {
                        // ethers v6: args[3] = amountSentLD (index-based access)
                        const amountSentLD = parsed.args[3];
                        const tokenAddress = log.address;
                        console.log(`[Decoder] OFTSent amount: ${amountSentLD}, token: ${tokenAddress}`);

                        result.asset_address = tokenAddress;

                        const tokenInfo = await this._getTokenInfo(tokenAddress, chainId);
                        console.log(`[Decoder] TokenInfo:`, tokenInfo);
                        result.asset_symbol = tokenInfo.symbol;

                        const decimals = tokenInfo.decimals || 18;
                        const amountTokens = Number(amountSentLD) / Math.pow(10, decimals);
                        console.log(`[Decoder] Decimals: ${decimals}, amountTokens: ${amountTokens}`);

                        if (amountTokens > 0 && amountTokens < 1e15) {
                            result.amount_tokens = amountTokens.toFixed(6);

                            if (tokenInfo.price > 0) {
                                result.amount_usd = (amountTokens * tokenInfo.price).toFixed(2);
                            }
                            console.log(`[Decoder] FINAL RESULT:`, result);
                        }
                        break;
                    }
                } catch (e) {
                    // Not OFTSent event, continue
                }
            }

            // If no OFTSent, try Transfer event
            if (!result.amount_tokens) {
                console.log('[Decoder] No OFTSent found, trying Transfer events...');
                for (const log of logs) {
                    try {
                        const parsed = this.oftInterface.parseLog({ topics: log.topics, data: log.data });
                        if (parsed && parsed.name === 'Transfer') {
                            // ethers v6: args[2] = value (index-based access)
                            const value = parsed.args[2];
                            const tokenAddress = log.address;
                            console.log(`[Decoder] Transfer amount: ${value}, token: ${tokenAddress}`);

                            result.asset_address = tokenAddress;

                            const tokenInfo = await this._getTokenInfo(tokenAddress, chainId);
                            result.asset_symbol = tokenInfo.symbol;

                            const decimals = tokenInfo.decimals || 18;
                            const amountTokens = Number(value) / Math.pow(10, decimals);

                            if (amountTokens > 0 && amountTokens < 1e15) {
                                result.amount_tokens = amountTokens.toFixed(6);

                                if (tokenInfo.price > 0) {
                                    result.amount_usd = (amountTokens * tokenInfo.price).toFixed(2);
                                }
                            }
                            break;
                        }
                    } catch (e) {
                        // Continue
                    }
                }
            }

            // Gas fee
            const gasUsed = BigInt(receipt.gasUsed);
            const gasPrice = BigInt(receipt.effectiveGasPrice || '0');
            const gasCostWei = gasUsed * gasPrice;
            const gasCostNative = Number(gasCostWei) / 1e18;
            result.chain_fee_usd = (gasCostNative * nativePrice).toFixed(2);

            // DVN fees (array decoding)
            for (const log of logs) {
                try {
                    const parsed = this.feeInterface.parseLog(log);
                    if (parsed && parsed.name === 'DVNFeePaid') {
                        const fees = parsed.args.fees;
                        let totalDVNFee = 0n;

                        for (const fee of fees) {
                            totalDVNFee += BigInt(fee.toString());
                        }

                        const dvnFeeNative = Number(totalDVNFee) / 1e18;
                        result.dvn_fee_usd = (dvnFeeNative * nativePrice).toFixed(4);
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Executor fee
            for (const log of logs) {
                try {
                    const parsed = this.feeInterface.parseLog(log);
                    if (parsed && parsed.name === 'ExecutorFeePaid') {
                        const fee = parsed.args.fee;
                        const execFeeNative = Number(fee) / 1e18;
                        result.executor_fee_usd = (execFeeNative * nativePrice).toFixed(2);
                        break;
                    }
                } catch (e) {
                    // Continue
                }
            }

            const totalFee = parseFloat(result.chain_fee_usd || 0) +
                parseFloat(result.dvn_fee_usd || 0) +
                parseFloat(result.executor_fee_usd || 0);
            result.total_fee_usd = totalFee.toFixed(2);

        } catch (e) {
            console.error('❌ Decode error:', e);
        }

        return result;
    }

    async _batchDecodeTransactions(transactions) {
        console.log(`[BatchDecoder] Starting decoding for ${transactions.length} transactions...`);
        const decodedTxs = [...transactions];

        // Process in chunks to avoid rate limits
        const CHUNK_SIZE = 5;
        const DELAY_MS = 100;

        for (let i = 0; i < decodedTxs.length; i += CHUNK_SIZE) {
            const chunk = decodedTxs.slice(i, i + CHUNK_SIZE);
            console.log(`[BatchDecoder] Processing chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(decodedTxs.length / CHUNK_SIZE)}`);

            await Promise.all(chunk.map(async (tx) => {
                // Skip if already decoded or missing improved compatibility
                if (tx.amount_usd || !tx.source_tx_hash || !tx.source_chain_eid) return;

                // Check if chain is supported
                const chainId = CHAIN_INFO[tx.source_chain_eid]?.chainId;
                if (!chainId || !ALCHEMY_ENDPOINTS[chainId]) return;

                try {
                    const decoded = await this._decodeTransactionWithEthers(
                        tx.source_tx_hash,
                        chainId,
                        tx.source_chain_eid
                    );

                    // Merge decoded fields into transaction object
                    if (decoded) {
                        if (decoded.amount_usd) tx.amount_usd = decoded.amount_usd;
                        if (decoded.amount_tokens) tx.amount_tokens = decoded.amount_tokens;
                        if (decoded.asset_symbol) tx.asset_symbol = decoded.asset_symbol;
                        if (decoded.asset_address) tx.asset_address = decoded.asset_address;
                        if (decoded.dvn_fee_usd) tx.dvn_fee_usd = decoded.dvn_fee_usd;
                        if (decoded.executor_fee_usd) tx.executor_fee_usd = decoded.executor_fee_usd;
                        if (decoded.chain_fee_usd) tx.chain_fee_usd = decoded.chain_fee_usd;
                        if (decoded.total_fee_usd) tx.total_fee_usd = decoded.total_fee_usd;
                    }
                } catch (e) {
                    console.warn(`[BatchDecoder] Failed to decode tx ${tx.source_tx_hash}:`, e);
                }
            }));

            // Rate limit delay between chunks
            if (i + CHUNK_SIZE < decodedTxs.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        console.log(`[BatchDecoder] Completed decoding.`);
        return decodedTxs;
    }

    async _getTokenInfo(tokenAddress, chainId) {
        const cacheKey = `token:${chainId}:${tokenAddress}`;
        const cached = this.tokenPriceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 1000 * 60 * 10) {
            return cached.data;
        }

        // Known tokens registry (decimals and prices for reliable decoding)
        const KNOWN_TOKENS = {
            // USDC on various chains (6 decimals, $1 stablecoin)
            '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, price: 1 }, // Base USDC
            '0x27a16dc786820b16e5c9028b75b99f6f604b5d26': { symbol: 'USDC', decimals: 6, price: 1 }, // Base USDC bridged
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, price: 1 }, // Ethereum
            '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, price: 1 }, // Arbitrum
            '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6, price: 1 }, // Optimism
            '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, price: 1 }, // Polygon
            '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18, price: 1 }, // BSC
            // USDT (6 decimals, $1 stablecoin)
            '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, price: 1 }, // Ethereum
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6, price: 1 }, // Arbitrum
            '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': { symbol: 'USDT', decimals: 6, price: 1 }, // Base
            // WETH (18 decimals, use native price from CoinGecko)
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 }, // Ethereum
            '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 }, // Base/OP
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18 }, // Arbitrum

            // FRNT (Wyoming Stable Token) - 18 decimals, $1 stable
            '0x5e817f2abccb9095585d26c2a3ce234a440574fc': { symbol: 'FRNT', decimals: 18, price: 1 }, // ETH, ARB, OP, BASE, POLY, AVAX (same addr)

            // OUSG (Ondo) - 18 decimals
            '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92': { symbol: 'OUSG', decimals: 18 }, // ETH, ARB (same addr)
        };

        const knownToken = KNOWN_TOKENS[tokenAddress.toLowerCase()];

        const info = {
            symbol: knownToken?.symbol || 'UNKNOWN',
            decimals: knownToken?.decimals || 18,
            price: knownToken?.price || 0
        };

        try {
            const endpoint = ALCHEMY_ENDPOINTS[chainId];

            // Only call Alchemy if token not in known registry
            if (!knownToken && endpoint) {
                const metadataRes = await this._fetchWithTimeout(endpoint, FETCH_TIMEOUT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'alchemy_getTokenMetadata',
                        params: [tokenAddress]
                    })
                });

                const metadata = await metadataRes.json();
                if (metadata.result) {
                    info.symbol = metadata.result.symbol || 'UNKNOWN';
                    info.decimals = metadata.result.decimals || 18;
                }
            }

            const chainMap = {
                1: 'ethereum', 56: 'bsc', 137: 'polygon',
                42161: 'arbitrum', 10: 'optimism', 8453: 'base'
            };
            const chainName = chainMap[chainId];

            if (chainName) {
                const priceRes = await fetch(
                    `https://coins.llama.fi/prices/current/${chainName}:${tokenAddress}`
                );
                const priceData = await priceRes.json();
                const coinData = priceData.coins?.[`${chainName}:${tokenAddress}`];

                if (coinData) {
                    // DefiLlama returns complete token info - use as authoritative source
                    if (coinData.price) info.price = coinData.price;
                    if (coinData.decimals) info.decimals = coinData.decimals;
                    if (coinData.symbol && info.symbol === 'UNKNOWN') {
                        info.symbol = coinData.symbol;
                    }
                    console.log(`[TokenInfo] DefiLlama data for ${tokenAddress}:`, coinData);
                }
            }

            this.tokenPriceCache.set(cacheKey, {
                data: info,
                timestamp: Date.now()
            });

        } catch (e) {
            // Continue with defaults
        }

        return info;
    }

    async getAddressProfile(address) {
        console.log(`🔍 DVN Intelligence: Fetching profile for address ${address}...`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`🔍 [Production] Fetching profile for ${address}`);
        }
        const cacheKey = `addr:${address}`;
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            // Priority 1: Check known chains for this address (Institutional assets often have multiple)
            const chainEids = this._findAllChainsForAddress(address);

            // If no specific chains found, fallback to default logic (returns [30101] or similar)
            if (chainEids.length === 0) {
                const defaultEid = this._findChainForAddress(address);
                if (defaultEid) chainEids.push(defaultEid);
            }

            // Try all candidate chains
            for (const eid of chainEids) {
                try {
                    const res = await this._fetchWithTimeout(
                        `${LZSCAN_API}/messages/oapp/${eid}/${address}?limit=100`,
                        FETCH_TIMEOUT
                    );

                    if (res.ok) {
                        const json = await res.json();
                        const rawTxs = json.data || [];

                        if (rawTxs.length > 0) {
                            // Found valid data!
                            let transactions = rawTxs.map(msg => this._normalizeTransaction(msg))
                                .sort((a, b) => new Date(b.source_timestamp) - new Date(a.source_timestamp));

                            // Decode amounts
                            transactions = await this._batchDecodeTransactions(transactions);

                            const stats = await this._calculateTraderMetrics(address, transactions);

                            const profile = {
                                type: 'oapp',
                                address,
                                display_name: getAssetDisplayName(address, eid) || null,
                                transactions,
                                stats
                            };

                            this._setCache(cacheKey, profile);
                            return profile;
                        }
                    }
                } catch (e) {
                    // Ignore errors for individual chain attempts, continue to next
                }
            }

            // Priority 2: Check as Wallet (if OApp lookup failed on all chains)

            const walletRes = await this._fetchWithTimeout(
                `${LZSCAN_API}/messages/wallet/${address}?limit=100`,
                FETCH_TIMEOUT
            );

            if (walletRes.ok) {
                const json = await walletRes.json();
                const rawTxs = json.data || [];

                if (rawTxs.length > 0) {
                    let transactions = rawTxs.map(msg => this._normalizeTransaction(msg))
                        .sort((a, b) => new Date(b.source_timestamp) - new Date(a.source_timestamp));

                    // Decode amounts
                    transactions = await this._batchDecodeTransactions(transactions);

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
                }
            }

            return await this._fallbackAddressScan(address);

        } catch (e) {
            console.error('🚨 DVN Intelligence: Address profile error:', e);
            if (process.env.NODE_ENV === 'production') {
                console.error(`🚨 [Production] DVN Intelligence: Error loading profile for ${address}:`, e.message);
            }
            return { error: "Failed to load address profile" };
        }
    }

    _findChainForAddress(address) {
        const chains = this._findAllChainsForAddress(address);
        return chains.length > 0 ? chains[0] : 30101;
    }

    _findAllChainsForAddress(address) {
        const addr = address.toLowerCase();
        const chains = new Set();

        // Use imported INSTITUTIONAL_ASSETS directly
        for (const asset of Object.values(INSTITUTIONAL_ASSETS)) {
            for (const [eid, assetAddr] of Object.entries(asset.addresses)) {
                if (assetAddr.toLowerCase() === addr) {
                    chains.add(parseInt(eid));
                }
            }
        }

        // Use imported DVN_REGISTRY directly
        for (const dvn of Object.values(DVN_REGISTRY)) {
            for (const [eid, dvnAddr] of Object.entries(dvn.addresses || {})) {
                if (dvnAddr.toLowerCase() === addr) {
                    chains.add(parseInt(eid));
                }
            }
        }

        return Array.from(chains);
    }

    async _fallbackAddressScan(address) {
        try {
            const res = await this._fetchWithTimeout(
                `${LZSCAN_API}/messages/latest?limit=1000`,
                15000
            );

            const json = await res.json();
            const allMsgs = json.data || [];

            const filtered = allMsgs.filter(msg => {
                const sender = msg.pathway?.sender?.address?.toLowerCase();
                const receiver = msg.pathway?.receiver?.address?.toLowerCase();
                const addr = address.toLowerCase();

                return sender === addr || receiver === addr;
            });

            if (filtered.length > 0) {
                let transactions = filtered.map(msg => this._normalizeTransaction(msg));

                // Decode amounts
                transactions = await this._batchDecodeTransactions(transactions);

                const stats = await this._calculateTraderMetrics(address, transactions);

                return {
                    type: 'oapp',
                    address,
                    transactions,
                    stats
                };
            }
        } catch (e) {
            // Fail silently
        }

        // Fallback: If all scans failed but address is in registry, return basic profile
        console.log(`[Profile] Fallback scan for ${address}`);

        // Find ANY valid chain ID for this address to look up metadata
        const knownEids = this._findAllChainsForAddress(address);
        const fallbackEid = knownEids.length > 0 ? knownEids[0] : 30101;

        const registryAsset = getAssetByAddress(address, fallbackEid);

        if (registryAsset) {
            return {
                type: 'oapp',
                address,
                display_name: getAssetDisplayName(address, fallbackEid) || registryAsset.name,
                transactions: [],
                stats: {
                    totalVolumeUsd: '0.00',
                    topRoute: 'No recent activity',
                    topRouteCount: 0,
                    topAsset: registryAsset.name,
                    totalTransactions: 0
                }
            };
        }

        return { error: "No activity found for this address" };
    }

    async getLiveFeed(limit = 1000) {
        console.log(`📡 DVN Intelligence: Fetching live feed...`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`📡 [Production] Fetching live feed`);
        }
        const cacheKey = `live_feed_${limit}`;
        if (this._getFromCache(cacheKey)) return this._getFromCache(cacheKey);

        try {
            const res = await this._fetchWithTimeout(
                `${LZSCAN_API}/messages/latest?limit=${limit}`,
                15000
            );

            if (!res.ok) {
                return { recent: [], inflight: [], failed: [], insights: {} };
            }

            const json = await res.json();
            const allMessages = json.data || [];

            const normalized = allMessages.map(m => this._normalizeTransaction(m));

            const results = {
                recent: normalized,
                inflight: normalized.filter(tx => tx.delivery_status === 'Inflight'),
                failed: normalized.filter(tx => tx.delivery_status === 'Failed'),
                insights: {}
            };

            this._setCache(cacheKey, results, LIVE_TTL);
            return results;

        } catch (e) {
            return { recent: [], inflight: [], failed: [], insights: {} };
        }
    }

    _normalizeTransaction(msg) {
        const src = msg.source?.tx || {};
        const dst = msg.destination?.tx || {};
        const pathway = msg.pathway || {};
        const config = msg.config?.outboundConfig || msg.config || {};

        let status = 'PENDING';
        if (dst.txHash) status = 'Delivered';
        else if (msg.status === 'FAILED' || msg.status?.name === 'FAILED') status = 'Failed';
        else if (msg.status === 'INFLIGHT' || msg.status?.name === 'INFLIGHT') status = 'Inflight';

        const srcEid = pathway.srcEid || pathway.sender?.eid;
        const dstEid = pathway.dstEid || pathway.receiver?.eid;

        // FIXED: Better chain name resolution
        const srcName = CHAIN_INFO[srcEid]?.name || pathway.sender?.chain || `Chain ${srcEid}`;
        const dstName = CHAIN_INFO[dstEid]?.name || pathway.receiver?.chain || `Chain ${dstEid}`;

        return {
            message_guid: msg.guid,
            source_tx_hash: src.txHash,
            destination_tx_hash: dst.txHash,
            source_chain_eid: srcEid,
            source_chain_name: srcName,
            source_chain: srcName,
            destination_chain_eid: dstEid,
            destination_chain_name: dstName,
            destination_chain: dstName,
            oapp_address: pathway.sender?.address,
            oapp_name: pathway.sender?.name || 'Unknown OApp',
            oapp_display_name: getAssetDisplayName(pathway.sender?.address, srcEid),
            required_dvn_addresses: config.requiredDVNs || [],
            optional_dvn_addresses: config.optionalDVNs || [],
            required_dvn_names: config.requiredDVNNames || [],
            dvn_stack_names: (config.requiredDVNNames || []).join(' + ') || 'Unknown Stack',
            delivery_status: status,
            source_timestamp: src.blockTimestamp ? new Date(src.blockTimestamp * 1000).toISOString() : new Date().toISOString(),
            latency_seconds: (dst.blockTimestamp && src.blockTimestamp) ? dst.blockTimestamp - src.blockTimestamp : null,
            amount_tokens: null,
            amount_usd: null,
            asset_symbol: null,
            asset_address: null,
            total_fee_usd: null,
            chain_fee_usd: null,
            dvn_fee_usd: null,
            executor_fee_usd: null
        };
    }

    async _calculateTraderMetrics(address, txs) {
        let totalVol = 0;
        const routeStats = {};
        const assets = {};

        txs.forEach(tx => {
            const r = `${tx.source_chain_name} → ${tx.destination_chain_name}`;

            if (!routeStats[r]) {
                routeStats[r] = { count: 0, volume: 0 };
            }
            routeStats[r].count++;

            const a = tx.oapp_display_name || tx.oapp_name || 'Unknown';
            assets[a] = (assets[a] || 0) + 1;

            if (tx.amount_usd) {
                const vol = parseFloat(tx.amount_usd);
                totalVol += vol;
                routeStats[r].volume += vol;
            }
        });

        // Convert routes to array and sort by volume (desc) then count
        const routes = Object.entries(routeStats)
            .map(([route, stats]) => ({
                route,
                count: stats.count,
                volume: stats.volume.toFixed(2)
            }))
            .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume) || b.count - a.count);

        const topAsset = Object.entries(assets).sort((a, b) => b[1] - a[1])[0];

        return {
            totalVolumeUsd: totalVol > 0 ? totalVol.toFixed(2) : '0.00',
            topRoute: routes[0]?.route || 'N/A',
            topRouteCount: routes[0]?.count || 0,
            routes, // Full breakdown
            topAsset: topAsset?.[0] || 'Unknown',
            totalTransactions: txs.length
        };
    }

    // --- HISTORICAL DATA INTEGRATION (NEW) ---

    async getHistoricalDVNStats(dvnIdOrAddress) {
        try {
            // Resolve DVN ID to address if needed
            let address = dvnIdOrAddress;
            if (dvnIdOrAddress && !dvnIdOrAddress.startsWith('0x')) {
                // It's a DVN ID like "nethermind", resolve to address
                const dvnData = DVN_REGISTRY[dvnIdOrAddress];
                if (dvnData?.addresses) {
                    // addresses is an object { chainId: address }, get first one
                    const addrs = Object.values(dvnData.addresses);
                    if (addrs.length > 0) {
                        address = addrs[0];
                    } else {
                        console.warn(`[getHistoricalDVNStats] No addresses for DVN: ${dvnIdOrAddress}`);
                        return null;
                    }
                } else {
                    console.warn(`[getHistoricalDVNStats] DVN not found in registry: ${dvnIdOrAddress}`);
                    return null;
                }
            }

            const res = await this._fetchWithTimeout(`/api/dvn/${address}/history`, 5000);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn('⚠️ Failed to fetch historical DVN stats (is backend running?):', e);
            return null;
        }
    }

    async getHistoricalOAppStats(address) {
        try {
            const res = await this._fetchWithTimeout(`/api/oapp/${address}/history`, 5000);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn('⚠️ Failed to fetch historical OApp stats (is backend running?):', e);
            return null;
        }
    }

    async getHistoricalWhales(address) {
        try {
            const res = await this._fetchWithTimeout(`/api/oapp/${address}/whales`, 5000);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.warn('⚠️ Failed to fetch whales:', e);
            return [];
        }
    }

    async _fetchWithTimeout(url, timeout, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

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
export { LayerZeroIntelligenceService };