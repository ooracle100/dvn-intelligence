# Task: Implement Token Amount Decoding

- [x] Analyze `OFTSent` event data structure <!-- id: 8 -->
- [x] Implement `getGenericTokenDecimals` using Etherscan V2 `eth_call` <!-- id: 9 -->
- [x] Update `lzscanApi.js` to decode `OFTSent` logs <!-- id: 10 -->
    - [x] Extract raw amount from `data` <!-- id: 11 -->
    - [x] Fetch decimals for the OFT contract <!-- id: 12 -->
    - [x] Format human-readable amount <!-- id: 13 -->
- [x] Verify with user <!-- id: 14 -->

# Task: Implement "Performance Intelligence" (OApp Efficiency Matrix)
- [x] Create `EfficiencyMatrix` component <!-- id: 15 -->
    - [x] Aggregation logic (Group by Route) <!-- id: 16 -->
    - [x] Calculate Avg Latency, Cost, Reliability <!-- id: 17 -->
- [x] Integrate into `OappView.jsx` <!-- id: 18 -->
- [x] Verify with OApp search (e.g. "Ondo") <!-- id: 19 -->

# Task: Debugging & Data Integrity (Post-Feedback)
- [x] Fix "No chain info" error for Legacy EIDs (Arbitrum 110) <!-- id: 20 -->
- [x] Fix "0 DVNs" / Fee Precision (Switch to BigInt) <!-- id: 21 -->
- [x] Fix "0 USDT0" (Decimal Heuristic for USD tokens) <!-- id: 22 -->

# Task: Refining Insights & UX
- [x] Fix "Infinitys" in `format.js` <!-- id: 23 -->
- [x] Enhance `StackRecommender.jsx` (Add Badges: Fastest/Safest) <!-- id: 24 -->
- [x] Upgrade `OappView.jsx` Comparison (Add Benchmarks/Deltas) <!-- id: 25 -->

# Task: Critical Bug Fixes & Institutional Metadata
- [x] Fix case-sensitive delivery_status in `EnhancedDvnView.jsx` <!-- id: 26 -->
- [x] Add DVN jurisdiction/type/compliance metadata to `dvnRegistry.js` <!-- id: 27 -->
- [x] Normalize stack names in `dvn.js` (A+B = B+A) <!-- id: 28 -->
- [x] Add jurisdiction/GDPR/SOC2 badges to DVN view <!-- id: 29 -->
