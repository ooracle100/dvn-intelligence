# DVN Profile — Corrected Audit

## Correction: Your 3M Dataset HAS Volume Data

I was wrong. Your `transactions` table has **1,564,572 rows** with `amount_tokens` populated (decoded from payloads by `redecode_payloads.js`). The working pipeline is:

```
payloadDecoder.js → amountSD (raw BigInt)
redecode_payloads.js → amount_tokens = amountSD / 1,000,000
aggregate_metrics.js → volume_usd = amount_tokens × price_usd ✅ (this works — dvn_metrics has $49B)
```

The problem is NOT missing data. It's that `compute_dvn_analytics.js` (the script that populates routes and stacks) **uses the wrong column**.

---

## Problem 1: Top Routes Volume = $0

### Root Cause
[compute_dvn_analytics.js](file:///Users/orcl/Documents/DVNV2/dvn-intelligence/server/scripts/compute_dvn_analytics.js) line 79:
```javascript
COALESCE(SUM(t.amount_usd), 0) as volume_usd  // ← WRONG COLUMN
```
`amount_usd` in the `transactions` table is always NULL. The correct approach (used by `aggregate_metrics.js`) is:
```sql
SUM(CAST(t.amount_tokens AS REAL) * v.price_usd) as volume_usd
```
with a LEFT JOIN to `verified_oapps.json` data and a `payload_type` filter.

### Fix
Update `compute_dvn_analytics.js` to use the same volume formula as `aggregate_metrics.js`:
- JOIN `verified_tokens` temp table
- Filter by `payload_type IN trusted_payload_types`
- `volume_usd = amount_tokens × price_usd`

Same fix for stacks query (line 110).

---

## Problem 2: Common DVN Stacks — Low Counts

### Root Cause
The stacks query groups by `required_dvn_addresses` (raw JSON string). Two transactions with the **same DVNs** but different JSON formatting (e.g., different address casing or ordering) would be counted as separate stacks.

The tx counts (49, 45) are suspiciously low for Nethermind (1.2M+ txs). Likely cause: the `dvn_attribution` JOIN only returns transactions where the DVN address case-matches exactly in the `IN` clause.

### Fix
- Normalize DVN addresses to lowercase before comparison
- The name resolution step (line 148-162) already runs but only resolves stacks it can parse as JSON. Stacks that weren't valid JSON remain as raw address arrays.
- Re-running the fixed `compute_dvn_analytics.js` with normalized addresses and the volume formula will fix both count and volume.

---

## Problem 3: AVG DVN Fee = N/A

### How It Works Today (Individual Tx)
```
IntelligenceService._decodeTransactionWithEthers() (line 300-312)
  → Alchemy eth_getTransactionReceipt(source_tx_hash)
  → Parse DVNFeePaid event from logs
  → fee_in_native × native_price = dvn_fee_usd ✅
```

### Why It Fails at Profile Level
- `calculateDVNMetrics()` (DVNProfile.jsx line 654) checks `tx.dvn_fee_usd` on each tx
- Those txs come from LayerZero Scan API live feed — which does NOT include fee data
- Fee data only comes from Alchemy receipt parsing, which isn't run at scale
- `dvn_attribution.estimated_fee_usd` is ALL zeros (5.8M rows, never populated)

### Can We Backfill All 3M?
No. As you correctly noted, Alchemy covers ~6 chains. Your transactions span 20+ chains.

### Feasible Approach: Sampling
As described in your own [IMPLEMENTATION_PLAN_2026-02-15.md](file:///Users/orcl/Documents/DVNV2/dvn-intelligence/docs/IMPLEMENTATION_PLAN_2026-02-15.md) (lines 92-102):

1. For each DVN, sample **100-200 recent transactions** on Alchemy-covered chains (ETH, Base, Arbitrum, etc.)
2. Fetch `eth_getTransactionReceipt` → parse `DVNFeePaid` event
3. Compute average fee per DVN
4. Store in `dvn_aggregate.avg_dvn_fee_usd`
5. Label: "Avg Fee: $0.08 (sampled from ETH, Base, Arbitrum)"

LayerZero docs confirm `DVNFeePaid` is the only reliable source for granular DVN fees — there is no API endpoint for this.

**Time estimate:** 200 txs × 21 DVNs ÷ 5/sec = ~14 minutes

---

## Summary: What Needs To Happen

| Fix | Effort | External API? | Fixes |
|-----|--------|---------------|-------|
| Update `compute_dvn_analytics.js` to use `amount_tokens × price` | 30 min code + ~20 min re-run | No | Routes volume, Stacks volume |
| Fix address normalization in stacks/routes queries | Same script | No | Stacks tx counts |
| Create `enrich_fees.js` sampling script | 1-2 hours | Alchemy (existing key) | AVG DVN Fee |

### Priority Recommendation
Fix 1+2 (routes & stacks) are the same script change — one shot. Fix 3 (fees) is separate. I'd do routes+stacks first since they unlock two of your three broken features with zero external API calls.

---

## Your Question About DVNFeePaid

The LayerZero doc AI confirmed exactly what your code already does: the `DVNFeePaid` event is the only granular source. The sampling approach is the right path — it gives you a statistically valid average without needing to process all 3M transactions.

---

## Awaiting Your Go-Ahead

1. Should I fix `compute_dvn_analytics.js` and re-run it now? (Routes + Stacks, no external APIs)
2. Should I then build `enrich_fees.js` for the DVN fee sampling? (Alchemy API calls)
3. Any other files you want me to read before proceeding?
