// server/services/dvnAddressMap.js
// Multi-chain DVN address lookup generated from dvns.txt
// Provides instant lookup: given any DVN address from any chain -> DVN ID

const fs = require('fs');
const path = require('path');

/**
 * Build a reverse lookup map: address -> { dvnId, chainName, canonicalName }
 * This allows us to identify a DVN from ANY of its chain addresses
 */
function buildDvnAddressMap() {
    const dvnsPath = path.join(__dirname, '../../dvns.txt');
    const addressToDvn = new Map();

    try {
        const raw = fs.readFileSync(dvnsPath, 'utf8');
        const data = JSON.parse(raw);

        // Iterate through each chain
        for (const [chainName, chainData] of Object.entries(data)) {
            if (!chainData.dvns) continue;

            // Iterate through each DVN on this chain
            for (const [address, dvnInfo] of Object.entries(chainData.dvns)) {
                // Skip deprecated DVNs
                if (dvnInfo.deprecated) continue;

                const normalizedAddr = address.toLowerCase();
                addressToDvn.set(normalizedAddr, {
                    dvnId: dvnInfo.id,
                    canonicalName: dvnInfo.canonicalName,
                    chainName: chainName,
                    version: dvnInfo.version
                });
            }
        }

        console.log(`📊 Loaded ${addressToDvn.size} DVN addresses across all chains`);
        return addressToDvn;

    } catch (error) {
        console.error('Failed to load DVN address map:', error.message);
        return new Map();
    }
}

/**
 * Get all addresses for a specific DVN ID
 * @param {string} dvnId - e.g., 'deutsche-telekom', 'nethermind'
 * @returns {Array<{address: string, chainName: string}>}
 */
function getAllAddressesForDvn(dvnId) {
    const dvnsPath = path.join(__dirname, '../../dvns.txt');
    const addresses = [];

    try {
        const raw = fs.readFileSync(dvnsPath, 'utf8');
        const data = JSON.parse(raw);

        for (const [chainName, chainData] of Object.entries(data)) {
            if (!chainData.dvns) continue;

            for (const [address, dvnInfo] of Object.entries(chainData.dvns)) {
                if (dvnInfo.id === dvnId && !dvnInfo.deprecated) {
                    addresses.push({
                        address: address.toLowerCase(),
                        chainName: chainName,
                        canonicalName: dvnInfo.canonicalName
                    });
                }
            }
        }

        return addresses;

    } catch (error) {
        console.error('Failed to get DVN addresses:', error.message);
        return [];
    }
}

/**
 * Get all unique DVN IDs from the registry
 */
function getAllDvnIds() {
    const dvnsPath = path.join(__dirname, '../../dvns.txt');
    const dvnIds = new Set();

    try {
        const raw = fs.readFileSync(dvnsPath, 'utf8');
        const data = JSON.parse(raw);

        for (const [chainName, chainData] of Object.entries(data)) {
            if (!chainData.dvns) continue;

            for (const [address, dvnInfo] of Object.entries(chainData.dvns)) {
                if (dvnInfo.id && !dvnInfo.deprecated) {
                    dvnIds.add(dvnInfo.id);
                }
            }
        }

        return Array.from(dvnIds).sort();

    } catch (error) {
        console.error('Failed to get DVN IDs:', error.message);
        return [];
    }
}

// Pre-build the map on module load
const DVN_ADDRESS_MAP = buildDvnAddressMap();

/**
 * Lookup DVN info by address
 * @param {string} address - DVN contract address from any chain
 * @returns {object|null} - { dvnId, canonicalName, chainName } or null
 */
function lookupDvnByAddress(address) {
    return DVN_ADDRESS_MAP.get(address?.toLowerCase()) || null;
}

module.exports = {
    DVN_ADDRESS_MAP,
    lookupDvnByAddress,
    getAllAddressesForDvn,
    getAllDvnIds,
    buildDvnAddressMap
};
