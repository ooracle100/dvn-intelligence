# DVN Intelligence — Implementation Plan
**Date:** 2026-02-15 01:56 UTC+1
**Status:** ACTIVE — This is the current plan

---

## Context

The DVN Intelligence Tool has 5 bugs preventing accurate institutional-grade reporting.
This plan was created after a full forensic trace of the data pipeline.

## Forensic Findings

### How `amount_tokens` Was Populated

```
payloadDecoder.js → decodePayload() → returns amountSD (raw BigInt in shared decimals)
  ↓
redecode_payloads.js (line 95) → amountTokens = amountSD / 1,000,000
  ↓
DB: amount_tokens = token count (already divided by shared decimals 10^6)
```

**Volume formula:** `amount_tokens × price_usd = volume_usd`

> [!IMPORTANT]
> `amount_tokens` is the TOKEN COUNT (e.g., 2,001,053 USDT). NOT the raw payload value.
> No further division is needed. Just multiply by price.

### EXTENDED Payload Bug (XAUt0 Case Study)

The `decodeExtended()` function in `payloadDecoder.js` blindly takes the last 8 bytes as amount.
For XAUt0, this produces garbage:

| Payload Type | Tx Count | SUM(amount_tokens) | Correct? |
|---|---|---|---|
| STANDARD_OFT | 2,425 | **23,210** | ✅ matches Nansen 24,208 |
| EXTENDED | 231 | **6,004,438,992,180** | ❌ 6 TRILLION garbage |

**Solution:** Each verified OApp specifies `trusted_payload_types` in the registry.

### Nansen Analysis Corrections

The original Nansen analysis ($18.23B) had one error:
- **NAV:** Assumed $1.00/token, actual CoinGecko price is **$0.001324**
  - Original: 216M tokens × $1.00 = $216M
  - Corrected: 216M tokens × $0.001324 = **$286K**
- **Impact:** Total drops from $18.23B to **~$18.01B** (NAV was only 1.19%)
- All other token volumes were correct (USDT0, UsdtOFT, XAUt0, REKT, ALLO, ACU)

---

## Verified Token Registry

File: `server/data/verified_oapps.json`

| Token | Address | Price | Source | Trusted Payloads |
|-------|---------|-------|--------|-----------------|
| USDT0 | 0x6c96...1dee | $1.00 | Stablecoin peg | STANDARD_OFT, COMPOSE |
| UsdtOFT | 0x1f74...5dfb0 | $1.00 | Stablecoin peg | STANDARD_OFT, COMPOSE |
| NAV | 0xa15d...05af7 | $0.001324 | CoinGecko | STANDARD_OFT |
| REKT | 0x7130...0d96 | $0.001 | Estimate | STANDARD_OFT |
| XAUt0 | 0xb9c2...696c | $2,900 | Gold spot | STANDARD_OFT only |
| ALLO | 0x032d...82d | $0 (not listed) | N/A | STANDARD_OFT |
| ACU (BSC) | 0x6ef2...eaf | $0.1139 | CoinGecko | STANDARD_OFT |
| ACU (Base) | 0xc5fe...f0b | $0.1139 | CoinGecko | STANDARD_OFT |

---

## Bug Fixes

### Fix 1: Strict Volume Calculation (DONE)
**File:** `server/scripts/compute_dvn_analytics.js` (rewritten)

- Uses `amount_tokens` from transactions (1.5M rows populated)
- JOINs `verified_oapps.json` for price data
- Filters by `payload_type IN trusted_payload_types`
- Formula: `amount_tokens × price_usd`
- Fixes both Routes and Stacks volume to be non-zero

### Fix 2: Success Rate >100% (DONE)
**File:** `server/scripts/compute_dvn_analytics.js`

- Now uses `SUM(CASE WHEN delivered THEN 1 END) * 100.0 / COUNT(*)`
- Properly groups by source/dest pair or stack

### Fix 3: DVN Fee Display (IN PROGRESS)
**File:** `server/scripts/enrich_fees.js`

- **Sampling Approach:**
  - For each DVN, sample ~150 recent transactions on supported chains (ETH, Base, Arb, Opt, Poly, Avax)
  - Fetch receipt via Alchemy: `eth_getTransactionReceipt`
  - Parse `DVNFeePaid` event from logs
  - Handle `required` vs `optional` attribution
  - Compute average fee spread
  - Store `avg_dvn_fee_usd` in `dvn_aggregate` table
- **Frontend:** Will display "Avg Fee: $X.XX (sampled)"

### Fix 4: Volume Formatting
**File:** `src/components/DVNProfile.jsx`

Replace hardcoded `/ 1e9 + 'B'` with magnitude-aware formatting:
- ≥ $1B → "$X.XXB"
- ≥ $1M → "$X.XXM"  
- ≥ $1K → "$X.XXK"
- < $1K → "$X.XX"

### Fix 5: Unknown DVNs
**File:** `server/scripts/identify_unknown_dvns.js`

Run script, get addresses, provide to user for block explorer lookup.

---

## Files Protected (DO NOT MODIFY)

| File | Reason |
|------|--------|
| `src/services/IntelligenceService.js` | TX-level decoding works correctly |
| `server/services/payloadDecoder.js` | Payload classification is accurate |
| `server/server.js` | API endpoint structure is correct |
| `src/utils/dvnRegistry.js` | Registry entries verified |
| `server/scripts/redecode_payloads.js` | Already ran, DB is populated correctly |
| `server/scripts/run-full-backfill.js` | Backfill pipeline is stable |

---

## Execution Order

1. ✏️ Rewrite `aggregate_metrics.js` (strict + payload_type filter)
2. ▶️ Run aggregation (~20-30 min)
3. ▶️ Run `build_dvn_mapping.js` (DVN ID consolidation)
4. ✏️ Fix `DVNProfile.jsx` (formatting + fees)
5. ▶️ Run `identify_unknown_dvns.js`
6. 🧪 Start server + frontend, verify profiles

## Verification Checklist

- [ ] No DVN success rate > 100%
- [ ] Nansen volume ~$18B (USDT0 dominates)
- [ ] XAUt0 volume ~$67M (not trillions)
- [ ] Small DVNs show "$X.XXM" not "$0.00B"
- [ ] Fee card shows contextual message when fees unavailable
- [ ] ALLO volume = $0 (price unavailable)
- [ ] NAV volume = ~$286K (not $216M)

---

## What "PROJECT COMPLETE" Looks Like

When all fixes are deployed, the DVN Intelligence Tool should:

1. **Dashboard:** Show accurate DVN rankings by verified volume. Stargate, Nethermind, LayerZero Labs at the top with billion-dollar volumes.
2. **DVN Profiles:** Each DVN shows:
   - Verified volume (only from whitelisted tokens with confirmed prices)
   - Success rate ≤ 100% (count distinct delivered txs)
   - Average latency
   - DVN fee card with contextual message about data availability
   - Volume formatted by magnitude ($B / $M / $K)
   - Top routes and enhanced stack metrics
3. **OApp Dashboard:** OApp profiles show verified volumes where available.
4. **Transaction Lookup:** Individual tx search shows full decoded details including DVN fees, executor fees, and token amounts (this already works).
5. **Data Integrity:** Every dollar of reported volume is traceable to:
   - A verified OApp in `verified_oapps.json`
   - A confirmed price source (CoinGecko, peg, gold spot)
   - A trusted payload type (STANDARD_OFT or COMPOSE only)
6. **Unknown DVNs:** Either identified and mapped, or clearly labeled as "Unknown" with their addresses visible for investigation.
7. **Search:** Supports DVN names, OApp addresses, and transaction hashes.
