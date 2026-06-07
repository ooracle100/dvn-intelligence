# System Snapshot: Before Historical Integration
**Date:** 2026-02-03
**Purpose:** Document current logic state to ensure no "Live" features are broken during the "Historical" upgrade.

## 1. frontend/OAppDashboard.jsx
*   **Current Logic:**
    *   Fetches profile via `intelligenceService.getAddressProfile(address)`.
    *   Displays "Total Volume" based ONLY on the fetching ~100 transactions.
    *   Calculates "Success Rate" from that small sample.
    *   Filters: Client-side filtering of that small list.
*   **Do Not Touch:**
    *   The `filterTransactions` helper (it works for the list view).
    *   The "Live Status" pills (Inflight/Delivered) - these must stay accurate.

## 2. frontend/DVNProfile.jsx
*   **Current Logic:**
    *   Fetches snapshot via `intelligenceService.getAddressProfile`.
    *   Shows "Recent Claims" table.
*   **Do Not Touch:**
    *   The layout of the header (Icon + Name).

## 3. services/IntelligenceService.js
*   **Current Logic:**
    *   `getAddressProfile(address)`:
        *   Tries to guess chain ID.
        *   Calls `LZSCAN_API/messages/oapp/...` (limit=100).
        *   Decodes locally using Alchemy/Ethers.
    *   `getLiveFeed()`:
        *   Fetches latest 1000 msgs.
*   **Planned Modifications (Additive):**
    *   Add `getHistoricalMetrics(address)` -> Calls new local API.
    *   **CRITICAL:** Do NOT modify `_normalizeTransaction` or `_decodeTransactionWithEthers` as they are used by the live feed.

## 4. Database Schema (Current)
*   `transactions`: 3.02M rows.
*   `dvn_attribution`: Linked to transactions.
*   `dvn_metrics`: Exists but is empty.
*   **MISSING:** Tables for OApp/OFT aggregated metrics (e.g., `oapp_daily_metrics`).

## 5. Rollback Plan
If the new API fails, the frontend should catch the error and simply show "Historical Data Unavailable", leaving the Live Dashboard fully functional.
