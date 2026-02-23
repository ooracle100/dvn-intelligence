# DVN Intelligence - Architecture & Capabilities

**Date:** February 16, 2026
**Status:** VERIFIED & ACTIVE
**System State:** Production-Ready for Volume & Fee Analytics

---

## 1. The Realized Vision

We have successfully built a **DVN Intelligence Platform** that provides insights LayerZero Scan does not. By combining deep transaction auditing with on-chain sampling, we now deliver institutional-grade metrics without relying on private APIs.

### The "Impossible" Data is Now Live
| Metric | Previous Constraint | Current Solution | Status |
|--------|---------------------|------------------|--------|
| **Volume** | "API doesn't allow historical queries" | **Internal Audit:** 1.5M transactions (51%) have fully decoded payloads. We compute volume directly. | ✅ SOLVED |
| **Fees** | "Fees are not in the database" | **On-Chain Sampling:** We sample 150 txs/DVN via Alchemy to determine average costs. | ✅ SOLVED |
| **Stacks** | "No data on who works together" | **Co-Occurrence:** We compute stacks by analyzing shared transaction verification. | ✅ SOLVED |

---

## 2. Core Methodologies

### A. Verified Volume Pipeline
We do not guess volume. We strictly calculate it from standardized payloads.
- **Source:** `transactions` table (3M+ rows backfilled).
- **Logic:** `amount_tokens × price_usd` (via `verified_oapps.json`).
- **Trust:** Only `STANDARD_OFT` and `COMPOSE` payloads are counted.
- **Result:** Precise volume attribution per DVN, Route, and Stack.

### B. DVN Fee Sampling
LayerZero fees are complex (ETH base + DVN fee + Executor fee). We isolate the DVN portion.
- **Mechanism:** `enrich_fees.js` daemon.
- **Process:** 
  1. Select 150 recent transactions per DVN.
  2. Fetch receipt via Alchemy (`eth_getTransactionReceipt`).
  3. Parse `DVNFeePaid(required[], optional[], fees[])`.
  4. Attribute precise fee to the specific DVN.
- **Output:** A rolling average fee (e.g., "$0.12") displayed in the UI.

### C. Stack Analytics
We identify "Security Stacks" (groups of DVNs verifying the same message).
- **Method:** SQL self-join on `dvn_attribution`.
- **Insight:** Reveals preferred partners (e.g., "Nethermind often pairs with Google Cloud").
- **Metrics:** Volume and Success Rate per Stack.

---

## 3. Unique Value Proposition

We are no longer "building a better explorer." We are building a **Verification Intelligence Market**.

**For Institutions & Developers:**
- **Provenance:** "Is this volume real?" (Yes, verified against payload types).
- **Performance:** "What is the actual success rate?" (Computed from 3M txs).
- **Cost Transparency:** "What does this DVN charge?" (Sampled on-chain).

---

## 4. Current Architecture

### Backend (`/server`)
- **Database:** SQLite (`dvn_intelligence.db`) in WAL mode.
- **Ingestion:** Continuous backfill via `backfill.js`.
- **Analytics:** 
  - `compute_dvn_analytics.js`: Pre-computes routes/stacks (~15 min run).
  - `enrich_fees.js`: Samples on-chain fees (~30 min run).
- **API:** Serves rich profiles including `avg_dvn_fee_usd`.

### Frontend (`/src`)
- **DVN Profile:** Displays verified metrics.
- **Fee Card:** explicitly labels data as "Sampled" vs "Live".
- **Volume:** Shows "Verified Volume" (excluding unparsed garbage).

---

## 5. Roadmap

1. **Expand Fee Sampling:** Add support for more chains (BSC, Polygon, etc.) via additional RPCs.
2. **Alerts:** Notify users when a DVN's fee changes significantly.
3. **Compare Tool:** Side-by-side DVN comparison for stack selection.