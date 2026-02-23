# DVN Intelligence Tool — Fix Checklist

## Phase 1: Quick Wins → Deploy as v1.1

### 1A. Add Latency to Stacks
- [x] Add `avg_latency` column to `dvn_top_stacks` table
- [x] Update `compute_dvn_stacks.js` with latency computation
- [x] Update `server.js` analytics endpoint to return `avg_latency` for stacks
- [x] Re-run `compute_dvn_stacks.js` — 278 stacks, 275 with latency (99%)
- [x] Fixed frontend `avgLatency: null` → `s.avg_latency` in `DVNProfile.jsx`
- [ ] **User verify:** DVN profile → Stacks → Avg Latency shows real values

### 1B. Fix Volume Label
- [x] Change "Verified Lifetime Volume" → "Verified Historical Volume" in `DVNProfile.jsx`
- [x] Change label in `OAppDashboard.jsx` — "Top Corridors (Historical)"
- [x] **Verify:** No more 'Lifetime' references in codebase

### 1C. Deploy v1.1
- [ ] Commit Phase 1 changes
- [ ] Push to Vercel as stable v1.1

---

## Phase 2: Critical Institutional Features

### 2A. Expand Search Backend
- [x] Load `stargate-ecosystem-assets.json` in `server.js`
- [x] Search by `Asset Symbol`, `Asset Name`, `Issuer`
- [x] Group results by issuer/symbol
- [x] **Verify:** Search "USDY" → returns Ondo USDY on 4 chains; "PayPal" → returns PYUSD on 3 chains; "BlackRock" → returns BUIDL; "FRNT" → returns Wyoming FRNT on 7 chains

### 2B. Add Token Pricing to `verified_oapps.json`
- [ ] Extract OFT addresses for USDY, PYUSD, USDG, USDe, THbill from `stargate-ecosystem-assets.json`
- [ ] Add pricing entries to `verified_oapps.json`
- [ ] Re-run `compute_dvn_analytics.js` and `compute_dvn_stacks.js`
- [ ] **Verify:** Stacks/Routes show volume for new tokens

### 2C. Asset → DVN Discovery (Moat Feature)
- [ ] New endpoint: `/api/asset/:address/verifiers`
- [ ] Query `dvn_attribution` + `transactions` for asset OApp
- [ ] Return: DVN list, routes, volumes, security stacks
- [ ] Frontend search results link to asset detail view

---

## Phase 3: Polish

### 3A. Data Freshness
- [ ] Show "Data coverage: Oct 2025 – Feb 2026" on dashboard

### 3B. Performance
- [ ] Cache expensive DB queries

---

## Key Files Reference
| File | Purpose |
|------|---------|
| `server/server.js` | Backend API |
| `server/scripts/compute_dvn_stacks.js` | Stack computation (needs latency) |
| `server/scripts/compute_dvn_analytics.js` | Routes computation (has latency) |
| `src/components/DVNProfile.jsx` | Frontend profile |
| `server/data/verified_oapps.json` | Token pricing (15 tokens) |
| `public/stargate-ecosystem-assets.json` | 18,530 token entries |
| `src/utils/manualRegistry.js` | 4 curated tokens |
| `docs/FIX_PLAN_2026-02-18.md` | This plan (copied to project) |
