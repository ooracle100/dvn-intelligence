// src/utils/unifiedSearch.js
// Unified local + live LayerZero + Etherscan enrichment search

import { getDVNAddresses, getDVNName } from './dvnRegistry';
import { getAssetDisplayName } from './assetRegistry';
import { searchTransaction, fetchDvnPulse } from './lzscanApi';
import { fetchEthPrice } from './priceOracle';

export async function unifiedSearch(query, localData) {
  const q = query.trim();

  if (!q) {
    return { error: "Please enter a transaction hash, address, or DVN name" };
  }

  // Step 1: Try local JSON first (already enriched, 38 columns)
  const localResult = searchLocalData(q, localData);
  if (localResult.found) {
    return {
      source: 'local',
      ...localResult
    };
  }

  // Step 2: DVN name lookup
  const dvnInfo = getDVNAddresses(q.toLowerCase());
  if (dvnInfo) {
    for (const addr of Object.values(dvnInfo.addresses)) {
      const dvnLocal = searchLocalForDVN(addr, localData);
      if (dvnLocal.found) {
        return {
          source: 'local',
          type: 'dvn',
          dvnName: dvnInfo.name,
          ...dvnLocal
        };
      }
    }

    return {
      source: 'local',
      type: 'dvn_name',
      name: dvnInfo.name,
      addresses: dvnInfo.addresses,
      message: `${dvnInfo.name} not found locally. Try address for live data.`
    };
  }

  // Step 3: Live LayerZero lookup (Transaction)
  // This now returns fully enriched data (including Etherscan fees) from lzscanApi
  const liveResult = await searchTransaction(q);

  if (!liveResult.error) {
    return {
      source: 'live',
      ...liveResult
    };
  }

  // Step 4 (New): Check if it's a DVN Address via Live Pulse
  // (Only if it looks like an EVM address)
  if (q.startsWith('0x') && q.length === 42) {
    console.log('🔍 Transaction not found, checking if DVN Address via Pulse...');
    const pulse = await fetchDvnPulse(q);

    if (pulse) {
      return {
        source: 'live_pulse',
        type: 'dvn',
        address: q,
        name: getDVNName(q) || 'Unknown DVN', // Try to resolve name if possible
        transactions: pulse.recentTxs // Attach the pulse txs so the view has data immediately
      };
    }

    // Detailed feedback for wallet/DVN addresses that show no activity
    return { error: `No recent activity found for this address. If this is a DVN, it may be inactive in the last 200 messages.` };
  }

  return { error: `Not found locally or on-chain.` };
}

/* =========================
   Local Search Helpers
   ========================= */

function searchLocalData(query, data) {
  const q = query.toLowerCase();

  if (!data?.transactions) {
    return { found: false };
  }

  // Transaction hash
  if (q.startsWith('0x') && q.length === 66) {
    const tx = data.transactions.find(t =>
      t.source_tx_hash?.toLowerCase() === q ||
      t.destination_tx_hash?.toLowerCase() === q
    );

    if (tx) {
      return {
        found: true,
        type: 'transaction',
        transaction: tx
      };
    }
  }

  // Address search
  if (q.startsWith('0x') && q.length === 42) {
    const oappTxs = data.transactions.filter(t =>
      t.oapp_address?.toLowerCase() === q
    );

    if (oappTxs.length > 0) {
      return {
        found: true,
        type: 'oapp',
        address: q,
        transactions: oappTxs,
        name: oappTxs[0].oapp_name || getAssetDisplayName(q)
      };
    }

    const dvnTxs = data.transactions.filter(t =>
      (t.required_dvn_addresses || []).some(a => a.toLowerCase() === q) ||
      (t.optional_dvn_addresses || []).some(a => a.toLowerCase() === q)
    );

    if (dvnTxs.length > 0) {
      return {
        found: true,
        type: 'dvn',
        address: q,
        transactions: dvnTxs,
        name: getDVNName(q, 30184)
      };
    }
  }

  return { found: false };
}

function searchLocalForDVN(address, data) {
  const addr = address.toLowerCase();

  if (!data?.transactions) {
    return { found: false };
  }

  const dvnTxs = data.transactions.filter(t =>
    (t.required_dvn_addresses || []).some(a => a.toLowerCase() === addr) ||
    (t.optional_dvn_addresses || []).some(a => a.toLowerCase() === addr)
  );

  if (dvnTxs.length > 0) {
    return {
      found: true,
      type: 'dvn',
      address: addr,
      transactions: dvnTxs
    };
  }

  return { found: false };
}

/* =========================
   Status Normalizer
   ========================= */

export function normalizeStatus(status) {
  if (!status) return { text: 'Unknown', color: 'gray' };

  const s = status.toString().toUpperCase();

  if (s === 'DELIVERED') {
    return { text: 'Delivered', color: 'emerald' };
  }

  if (s === 'SENT' || s === 'INFLIGHT') {
    return { text: 'In Transit', color: 'yellow' };
  }

  if (s === 'FAILED') {
    return { text: 'Failed', color: 'red' };
  }

  return { text: status, color: 'gray' };
}
