// src/utils/lzscanApi.js
// Canonical LayerZero + Etherscan V2 reconciliation (MVP-safe)

import { CHAIN_INFO, getDVNAddresses } from './dvnRegistry';
import { getAssetDisplayName, isKnownOFT } from './assetRegistry';

const LZSCAN_API = "https://scan.layerzero-api.com/v1";
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
const ETHERSCAN_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || "VTDG6VHKP4CJHK4G5CDDQYWF5CWUHVKGM4";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

const CACHE_KEY = 'dvn_realtime_cache';
const CACHE_TTL = 1000 * 60 * 30; // 30 mins

/* -------------------- cache helpers -------------------- */
function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function setCache(key, value) {
  const cache = getCache();
  cache[key] = { value, expiry: Date.now() + CACHE_TTL };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
function getCached(key) {
  const cache = getCache();
  const item = cache[key];
  if (!item || Date.now() > item.expiry) return null;
  return item.value;
}

/* -------------------- public search -------------------- */
export async function searchTransaction(query) {
  const raw = query.trim();
  const q = raw.toLowerCase();

  const dvnInfo = getDVNAddresses(raw) || getDVNAddresses(q);
  if (dvnInfo) {
    return {
      type: "dvn_name",
      name: dvnInfo.name,
      addresses: dvnInfo.addresses,
      message: `Found ${dvnInfo.name}. Search using its address.`
    };
  }

  if (q.startsWith('0x') && q.length === 66) {
    return await fetchByTxHash(q);
  }

  if (q.startsWith('0x') && q.length === 42) {
    return { type: "address", address: q };
  }

  return { error: "Invalid input" };
}

/* -------------------- core reconciliation -------------------- */
async function fetchByTxHash(txHash) {
  const cacheKey = `tx:${txHash}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    let res = await fetch(`${LZSCAN_API}/messages/tx/${txHash}`);
    if (!res.ok) res = await fetch(`${LZSCAN_API}/messages/${txHash}`);
    const json = await res.json();

    if (!Array.isArray(json?.data) || json.data.length === 0) {
      return { error: "Not a LayerZero transaction" };
    }

    const msg = json.data[0];
    const base = parseLZ(msg);

    const enriched = await enrichWithEtherscan(base, msg);
    const result = { type: "tx", ...base, ...enriched };

    setCache(cacheKey, result);
    return result;

  } catch (e) {
    console.error(e);
    return { error: "Failed to fetch transaction" };
  }
}

/* -------------------- parse LayerZero -------------------- */
function parseLZ(msg) {
  const src = msg.source?.tx || {};
  const dst = msg.destination?.tx || {};
  const pathway = msg.pathway || {};
  const cfg = msg.config?.outboundConfig || {};

  return {
    source_tx_hash: src.txHash,
    destination_tx_hash: dst.txHash,
    source_chain: pathway.sender?.chain,
    destination_chain: pathway.receiver?.chain,
    source_chain_eid: pathway.srcEid,
    destination_chain_eid: pathway.dstEid,
    source_timestamp: src.blockTimestamp,
    destination_timestamp: dst.blockTimestamp,
    latency_seconds:
      src.blockTimestamp && dst.blockTimestamp
        ? dst.blockTimestamp - src.blockTimestamp
        : null,
    delivery_status: dst.txHash ? "Delivered" : "Sent",

    oapp_address: pathway.sender?.address,
    oapp_name: pathway.sender?.name,
    recipient_address: pathway.receiver?.address,

    message_guid: msg.guid,

    required_dvn_addresses: cfg.requiredDVNs || [],
    optional_dvn_addresses: cfg.optionalDVNs || [],
    required_dvn_names: cfg.requiredDVNNames || [],
    optional_dvn_names: cfg.optionalDVNNames || [],
    dvn_stack_names: [
        ...(cfg.requiredDVNNames || []).map(n => `${n} (Required)`),
        ...(cfg.optionalDVNNames || []).map(n => `${n} (Optional)`)
    ].join(' + '),

    oapp_display_name:
      getAssetDisplayName(pathway.sender?.address) || pathway.sender?.name,
    is_known_oft: isKnownOFT(pathway.sender?.address)
  };
}

/* -------------------- etherscan reconciliation -------------------- */
async function enrichWithEtherscan(tx, msg) {
  if (!ETHERSCAN_KEY) return {};

  const chainId = mapEid(tx.source_chain_eid);
  const ethPrice = await getEthPrice();

  const receipt = await etherscanProxy(
    chainId,
    'eth_getTransactionReceipt',
    tx.source_tx_hash
  );
  // eslint-disable-next-line no-undef
  const gasUsed = BigInt(receipt.gasUsed || '0x0');
  // eslint-disable-next-line no-undef
  const gasPrice = BigInt(receipt.effectiveGasPrice || '0x0');
  const feeWei = gasUsed * gasPrice;
  const feeEth = Number(feeWei) / 1e18;

  const perDvn = [];
  const dvns = msg.verification?.dvn?.dvns || {};

  for (const [addr, d] of Object.entries(dvns)) {
    const r = await etherscanProxy(chainId, 'eth_getTransactionReceipt', d.txHash);
    // eslint-disable-next-line no-undef
    const g = BigInt(r.gasUsed || '0x0');
    // eslint-disable-next-line no-undef
    const p = BigInt(r.effectiveGasPrice || '0x0');
    const w = g * p;
    const e = Number(w) / 1e18;
    perDvn.push({
      address: addr,
      fee_eth: e,
      fee_usd: ethPrice ? e * ethPrice : null
    });
  }

  return {
    chain_fee_eth: feeEth,
    chain_fee_usd: ethPrice ? feeEth * ethPrice : null,
    per_dvn_fees: perDvn
  };
}

/* -------------------- helpers -------------------- */
async function etherscanProxy(chainId, action, txhash) {
  const url =
    `${ETHERSCAN_V2}?chainid=${chainId}` +
    `&module=proxy&action=${action}` +
    `&txhash=${txhash}&apikey=${ETHERSCAN_KEY}`;

  const r = await fetch(url);
  const j = await r.json();
  return j.result;
}

function mapEid(eid) {
  return {
    30101: 1,
    30110: 42161,
    30184: 8453
  }[eid] || 1;
}

async function getEthPrice() {
  try {
    const r = await fetch(COINGECKO_API);
    const j = await r.json();
    return j.ethereum?.usd || null;
  } catch {
    return null;
  }
}
