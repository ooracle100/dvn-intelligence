// src/utils/lzscanApi.js
// BRIDGE: Forwarding legacy calls to the new robust IntelligenceService

import { intelligenceService } from '../services/IntelligenceService';

// Re-export constants if needed (though components should ideally use service)
export const LZSCAN_API = "https://scan.layerzero-api.com/v1";

/**
 * BRIDGE: fetchPendingMessages
 * Delegates to IntelligenceService.getLiveFeed
 */
export async function fetchPendingMessages(limit = 100) {
  return await intelligenceService.getLiveFeed(limit);
}

/**
 * BRIDGE: searchTransaction
 * Delegates to IntelligenceService.search
 */
export async function searchTransaction(query) {
  return await intelligenceService.search(query);
}

/**
 * BRIDGE: fetchByTxHash
 * Delegates to IntelligenceService.getTransaction
 */
export async function fetchByTxHash(txHash) {
  return await intelligenceService.getTransaction(txHash);
}

/**
 * BRIDGE: fetchByAddress
 * Delegates to IntelligenceService.getAddressProfile
 */
export async function fetchByAddress(address) {
  return await intelligenceService.getAddressProfile(address);
}

/**
 * BRIDGE: fetchDvnPulse
 * Delegates to IntelligenceService.getDvnPulse
 */
export async function fetchDvnPulse(dvnAddress) {
  return await intelligenceService.getDvnPulse(dvnAddress);
}