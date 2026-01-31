// src/utils/manualRegistry.js
// Manually curated institutional assets not in Stargate data
// Last updated: 2026-01-11

/**
 * SOURCES:
 * - FRNT: content.govdelivery.com, blog.kraken.com, wyomingpublicmedia.org
 * - USDC: circle.com/en/usdc, developers.circle.com
 * - USDT0: tether.to/en/oft-now-live
 * - Ondo: ondo.finance
 */

export const MANUAL_REGISTRY = {
  // Wyoming Stable Token - FRNT
  'wyoming-frnt': {
    id: 'wyoming-frnt',
    name: 'FRNT',
    fullName: 'Frontier Stable Token',
    institution: 'Wyoming Stable Token Commission',
    type: 'State-Backed Stablecoin',
    description: 'Wyoming state-issued stablecoin backed by U.S. dollars and short-term Treasuries',
    website: 'https://wyst.gov',
    verified: true,
    addresses: {
      30110: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc', // Arbitrum
      30106: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc', // Avalanche
      30184: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc', // Base
      30101: '0x5e817f2abccb9095585d26c2a3ce234a440574fc', // Ethereum
      30111: '0x5E817F2AbCCB9095585D26c2a3ce234a440574Fc', // Optimism
      30109: '0x5e817f2abccb9095585d26c2a3ce234a440574fc', // Polygon
      30150: 'FRNTPi9V3Sw9b9U8d5Q3WY7tNANT6Q394d7dYtv7Jdog' // Solana
    }
  },

  // Circle USDC (Native - not OFT, but important to track)
  'circle-usdc': {
    id: 'circle-usdc',
    name: 'USDC',
    fullName: 'USD Coin',
    institution: 'Circle',
    type: 'Stablecoin',
    description: 'Fully reserved digital dollar stablecoin',
    website: 'https://circle.com/en/usdc',
    verified: true,
    addresses: {
      30101: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Ethereum
      30110: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum
      30184: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base
      30111: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Optimism
      30109: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // Polygon
      30106: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'  // Avalanche
    }
  },

  // Tether USDT0 (LayerZero OFT)
  'tether-usdt0': {
    id: 'tether-usdt0',
    name: 'USDT0',
    fullName: 'Tether USD (Omnichain)',
    institution: 'Tether',
    type: 'Stablecoin',
    description: 'Omnichain USDT using LayerZero OFT standard',
    website: 'https://tether.to',
    verified: true,
    addresses: {
      30101: '0xdac17f958d2ee523a2206206994597c13d831ec7', // Ethereum (Native)
      30260: '0x6de0d56e2d695db9e2b4fbeca3d81372c59848bb', // X Layer (OFT)
    }
  },

  // Ondo OUSG (Accredited only)
  'ondo-ousg': {
    id: 'ondo-ousg',
    name: 'OUSG',
    fullName: 'Ondo Short-Term US Government Treasuries',
    institution: 'Ondo Finance',
    type: 'RWA',
    description: 'Tokenized short-term US government bonds (accredited investors only)',
    website: 'https://ondo.finance',
    verified: true,
    addresses: {
      30101: '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92', // Ethereum
      30110: '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92', // Arbitrum
    }
  }
};

/**
 * Get asset from manual registry by address
 */
export function getManualAsset(address, chainEid) {
  if (!address) return null;
  const normalized = address.toLowerCase();
  
  for (const asset of Object.values(MANUAL_REGISTRY)) {
    const chainAddress = asset.addresses[chainEid]?.toLowerCase();
    if (chainAddress === normalized) {
      return asset;
    }
  }
  return null;
}

/**
 * Check if address exists in manual registry
 */
export function isManualAsset(address, chainEid) {
  return getManualAsset(address, chainEid) !== null;
}