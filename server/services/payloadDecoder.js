// server/services/payloadDecoder.js
// Updated with Nansen classification approach for LayerZero OFT payloads

/**
 * Classify payload type based on structure (from Nansen analysis)
 * @param {string} payload - Hex payload string
 * @returns {string} - Payload type classification
 */
function classifyPayload(payload) {
    if (!payload || payload === '0x') return 'NO_PAYLOAD';

    const hex = payload.startsWith('0x') ? payload.slice(2) : payload;
    const byteLength = hex.length / 2;

    // Check for version prefix (COMPOSE messages)
    const prefix = hex.substring(0, 4);
    if (prefix === '0001' || prefix === '0002' || prefix === '0003') {
        return 'COMPOSE';
    }

    // Classify by byte length
    if (byteLength === 40) return 'STANDARD_OFT';
    if (byteLength === 64) return 'LEGACY_OFT_V1';
    if (byteLength < 40) return 'SHORT';
    return 'EXTENDED';
}

/**
 * Decode STANDARD_OFT payload (40 bytes)
 * Structure: [recipient: 32 bytes][amountSD: 8 bytes]
 * Amount at bytes 32-39 (hex chars 64-79)
 */
function decodeStandardOFT(hex) {
    try {
        const amountHex = hex.substring(64, 80); // 16 hex chars = 8 bytes
        if (!amountHex || amountHex.length !== 16) return null;
        return BigInt('0x' + amountHex);
    } catch {
        return null;
    }
}

/**
 * Decode COMPOSE payload (variable length with version prefix)
 * Structure: [version: 2 bytes][recipient: 32 bytes][amountSD: 8 bytes][...]
 * Amount at bytes 34-41 (hex chars 68-83) - shifted by 2 bytes due to version prefix
 */
function decodeComposeOFT(hex) {
    try {
        const amountHex = hex.substring(68, 84); // 16 hex chars = 8 bytes
        if (!amountHex || amountHex.length !== 16) return null;
        return BigInt('0x' + amountHex);
    } catch {
        return null;
    }
}

/**
 * Decode LEGACY_OFT_V1 payload (64 bytes)
 * Structure: [recipient: 32 bytes][amountLD: 32 bytes] - 18 decimals
 * Amount at bytes 32-63, needs conversion from 18 to 6 decimals
 */
function decodeLegacyOFT(hex) {
    try {
        const amountHex = hex.substring(64, 128); // 64 hex chars = 32 bytes
        if (!amountHex || amountHex.length !== 64) return null;
        const rawAmount = BigInt('0x' + amountHex);
        // Convert from 18 decimals to 6 decimals (shared decimals)
        return rawAmount / BigInt(10 ** 12);
    } catch {
        return null;
    }
}

/**
 * Decode EXTENDED payload (>40 bytes)
 * User verified: amountSD is in LAST 8 bytes
 * Examples: Stargate OFT messages with extra metadata
 */
function decodeExtended(hex) {
    try {
        // amountSD is last 8 bytes (16 hex chars)
        const amountHex = hex.slice(-16);
        if (!amountHex || amountHex.length !== 16) return null;
        return BigInt('0x' + amountHex);
    } catch {
        return null;
    }
}

/**
 * Custom OApps that don't have token transfers
 * These should be skipped from volume calculation
 */
const CUSTOM_OAPPS = new Set([
    '0x4ad11f4d6b4626e426fbe88e8f1c78f469ca33be', // Acurast (Ethereum)
    '0x92db5a14a520eee59499261e83c27fa135f43bc8', // HeyElsa (Base)
    '0x21d7841a14f97577463663d8ac54fd725b531f0c', // Unknown
    '0x4c7e7371e40b3f8c74dda97e967a47eee6b0b38f', // Unknown
]);

/**
 * Main decode function - replaces the old heuristic approach
 * @param {string} payload - Hex payload string
 * @param {string} oappAddress - OApp address (optional, for custom OApp detection)
 * @returns {Object} - { amountSD, payloadType, success }
 */
function decodePayload(payload, oappAddress) {
    if (!payload || payload === '0x') {
        return { amountSD: null, payloadType: 'NO_PAYLOAD', success: false };
    }

    // Skip known custom OApps that don't have token transfers
    if (oappAddress && CUSTOM_OAPPS.has(oappAddress.toLowerCase())) {
        return { amountSD: null, payloadType: 'CUSTOM_OAPP', success: false };
    }

    const hex = payload.startsWith('0x') ? payload.slice(2) : payload;
    const payloadType = classifyPayload(payload);

    let amountSD = null;

    switch (payloadType) {
        case 'STANDARD_OFT':
            amountSD = decodeStandardOFT(hex);
            break;
        case 'COMPOSE':
            amountSD = decodeComposeOFT(hex);
            break;
        case 'LEGACY_OFT_V1':
            amountSD = decodeLegacyOFT(hex);
            break;
        case 'EXTENDED':
            // User verified: amountSD is last 8 bytes
            amountSD = decodeExtended(hex);
            break;
        case 'SHORT':
            // User verified: These are Stargate CreditsSent (pool rebalancing)
            // NOT token transfers - skip from volume calculation
            return { amountSD: null, payloadType: 'OPERATIONAL', success: false };
        case 'NO_PAYLOAD':
        default:
            amountSD = null;
    }

    // Validate amount (sanity check)
    if (amountSD !== null) {
        // Amount should be reasonable: > 0 and < 1 trillion (in 6 decimals)
        if (amountSD <= 0n || amountSD > BigInt(10 ** 18)) {
            amountSD = null;
        }
    }

    return {
        amountSD: amountSD ? amountSD.toString() : null,
        payloadType,
        success: amountSD !== null
    };
}

/**
 * Batch decode for efficiency
 * @param {Array} payloads - Array of { payload, oappAddress }
 * @returns {Array} - Array of decode results
 */
function batchDecode(payloads) {
    return payloads.map(({ payload, oappAddress }) => decodePayload(payload, oappAddress));
}

module.exports = {
    decodePayload,
    classifyPayload,
    batchDecode,
    CUSTOM_OAPPS
};
