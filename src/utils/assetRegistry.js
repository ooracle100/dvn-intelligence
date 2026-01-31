// src/utils/assetRegistry.js
// ENHANCED: 3-Tier data architecture
// Tier 1: Manual (priority) → Tier 2: Stargate → Tier 3: API fallback

import { MANUAL_REGISTRY, getManualAsset } from './manualRegistry';
import { STARGATE_REGISTRY, getOFTByAddress as getStargateAsset } from './stargateRegistry';

/**
 * Combined institutional assets for display
 * Merges manual registry with top Stargate institutional assets
 */
export const INSTITUTIONAL_ASSETS = {
  // Manual registry assets (highest priority)
  ...MANUAL_REGISTRY,
  
  // Top institutional assets from Stargate will be added here
  // Parser already generated these in stargateRegistry.js
};

/**
 * 3-TIER ASSET LOOKUP
 * Priority: Manual → Stargate → Cache
 */
export function getAssetByAddress(address, chainEid) {
  if (!address) return null;
  
  // Tier 1: Check manual registry first (FRNT, USDC, etc.)
  const manualAsset = getManualAsset(address, chainEid);
  if (manualAsset) {
    return { ...manualAsset, source: 'manual' };
  }
  
  // Tier 2: Check Stargate registry
  const stargateAsset = getStargateAsset(address, chainEid);
  if (stargateAsset) {
    return {
      id: `${stargateAsset.issuer}-${stargateAsset.symbol}`.toLowerCase().replace(/\s+/g, '-'),
      name: stargateAsset.symbol,
      fullName: stargateAsset.fullName,
      institution: stargateAsset.issuer,
      type: stargateAsset.type === 'StargateOFT' ? 'OFT' : stargateAsset.type,
      addresses: stargateAsset.addresses,
      source: 'stargate',
      verified: false
    };
  }
  
  // Tier 3: Return null, will trigger API fallback in IntelligenceService
  return null;
}

/**
 * Get display name (tries all tiers)
 */
export function getAssetDisplayName(address, chainEid) {
  const asset = getAssetByAddress(address, chainEid);
  return asset ? asset.name : null;
}

/**
 * Get all verified institutional assets for homepage
 */
export function getFeaturedInstitutions() {
  return Object.values(MANUAL_REGISTRY).filter(asset => asset.verified);
}

/**
 * Search across all registries
 */
export function searchAssets(query) {
  if (!query) return getFeaturedInstitutions();
  
  const q = query.toLowerCase();
  const results = [];
  
  // Search manual registry
  Object.values(MANUAL_REGISTRY).forEach(asset => {
    if (asset.name.toLowerCase().includes(q) ||
        asset.institution.toLowerCase().includes(q) ||
        asset.fullName.toLowerCase().includes(q)) {
      results.push({ ...asset, source: 'manual' });
    }
  });
  
  // Search Stargate registry
  STARGATE_REGISTRY.forEach(asset => {
    if (asset.symbol.toLowerCase().includes(q) ||
        asset.issuer.toLowerCase().includes(q)) {
      results.push({
        id: `${asset.issuer}-${asset.symbol}`.toLowerCase().replace(/\s+/g, '-'),
        name: asset.symbol,
        fullName: asset.fullName,
        institution: asset.issuer,
        type: asset.type,
        addresses: asset.addresses,
        source: 'stargate'
      });
    }
  });
  
  return results;
}

/**
 * Get all unique institutions
 */
export function getAllInstitutions() {
  const institutions = new Set();
  
  Object.values(MANUAL_REGISTRY).forEach(asset => {
    institutions.add(asset.institution);
  });
  
  STARGATE_REGISTRY.forEach(asset => {
    institutions.add(asset.issuer);
  });
  
  return Array.from(institutions).sort();
}

/**
 * Get assets by institution
 */
export function getAssetsByInstitution(institutionName) {
  const q = institutionName.toLowerCase();
  const results = [];
  
  // Manual registry
  Object.values(MANUAL_REGISTRY).forEach(asset => {
    if (asset.institution.toLowerCase().includes(q)) {
      results.push(asset);
    }
  });
  
  // Stargate registry
  STARGATE_REGISTRY.forEach(asset => {
    if (asset.issuer.toLowerCase().includes(q)) {
      results.push({
        id: `${asset.issuer}-${asset.symbol}`.toLowerCase().replace(/\s+/g, '-'),
        name: asset.symbol,
        fullName: asset.fullName,
        institution: asset.issuer,
        type: asset.type,
        addresses: asset.addresses,
        source: 'stargate'
      });
    }
  });
  
  return results;
}

/**
 * Get primary address (Ethereum priority)
 */
export function getPrimaryAddress(assetId) {
  const asset = MANUAL_REGISTRY[assetId];
  if (!asset) return null;
  
  const priorities = [30101, 30184, 30110]; // Ethereum, Base, Arbitrum
  
  for (const eid of priorities) {
    if (asset.addresses[eid]) return asset.addresses[eid];
  }
  
  const addresses = Object.values(asset.addresses);
  return addresses.length > 0 ? addresses[0] : null;
}

/**
 * Check if institutional OApp
 */
export function isInstitutionalOApp(address) {
  if (!address) return false;
  const normalized = address.toLowerCase();
  
  // Check manual registry
  for (const asset of Object.values(MANUAL_REGISTRY)) {
    const addresses = Object.values(asset.addresses).map(a => a.toLowerCase());
    if (addresses.includes(normalized)) return true;
  }
  
  // Check Stargate for institutional issuers
  const institutionalIssuers = ['Ondo', 'PayPal', 'Paxos', 'Circle', 'Tether', 'Ethena', 'Usual', 'Wyoming'];
  
  for (const asset of STARGATE_REGISTRY) {
    if (institutionalIssuers.some(inst => asset.issuer.includes(inst))) {
      const addresses = Object.values(asset.addresses).map(a => a.toLowerCase());
      if (addresses.includes(normalized)) return true;
    }
  }
  
  return false;
}