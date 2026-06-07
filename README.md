# DVN Intelligence Platform

The first analytics tool for LayerZero's Decentralized Verifier Networks. No direct competitor exists.

**Live:** [dvn-intelligence.vercel.app](https://dvn-intelligence.vercel.app)

---

## What It Does

Institutional teams (Ondo, PayPal, BitGo, Wyoming) deploying cross-chain assets on LayerZero must choose which DVNs verify their transactions. There is no public data on DVN performance. This tool fills that gap.

- **DVN Marketplace** — Compare 68 DVNs by volume secured, transaction count, latency, and jurisdiction
- **Transaction Decoder** — Paste any LayerZero tx hash → get decoded amounts, fees (DVN/executor/gas), and route details
- **OApp Dashboards** — Per-token analytics for USDC, USDT0, FRNT, OUSG, and 1,500+ ecosystem assets
- **Search** — Find any asset by name, symbol, issuer, or address across verified OApps + Stargate ecosystem

## Data Scale

| Metric | Value |
|--------|-------|
| Transactions processed | 3,029,343 |
| DVNs tracked | 68 |
| Blockchains covered | 20+ |
| Ecosystem assets searchable | 1,544 |
| Verified OApps with pricing | 20 |

## Architecture

```
React Frontend (localhost:3000)
  ├── IntelligenceService.js → LayerZero Scan API + Alchemy (live decoding)
  ├── DVN Registry (68 DVNs, all chains)
  └── Asset Registry (institutional tokens)

Express Backend (localhost:3001)
  ├── SQLite DB (3M transactions, WAL mode)
  ├── Search: verified_oapps.json + stargate-ecosystem-assets.json + manual registry
  ├── DVN aggregate metrics
  └── OApp history endpoints
```

## Tech Stack

**Frontend:** React 18, vanilla CSS
**Backend:** Node.js, Express, better-sqlite3
**Data Sources:** LayerZero Scan API, Alchemy (receipt decoding), DeFiLlama (prices), CoinGecko
**Deployment:** Vercel (frontend), local server (backend)

## Quick Start

```bash
# Install
npm install

# Frontend (port 3000)
npm start

# Backend (port 3001) — separate terminal
node server/server.js
```

Requires `.env` with `REACT_APP_ALCHEMY_KEY`.

## Key Technical Decisions

1. **Hybrid data model** — Live API calls for transaction decoding, pre-computed snapshots for aggregate metrics. Pure-live is too slow for 3M rows.
2. **Payload classification** — 4 types (STANDARD_OFT, COMPOSE, LEGACY, EXTENDED). EXTENDED payloads caused $6T phantom volume until filtered.
3. **Volume attribution** — `amount_tokens × price_usd`, filtered by trusted payload types only. Every dollar traceable to a verified price source.
4. **Gas-based fees** — `gasUsed × effectiveGasPrice`, not Transfer logs. Transfer logs include routed liquidity, inflating fees by 1000x+.

## Debugging in Production

This project now includes a built-in Error Boundary and clear logging so issues are easy to spot even when the app is live on Vercel.

**If something breaks:**
1. Go to the live site → right-click → Inspect → Console tab (copy any red errors).
2. Check Vercel dashboard → Logs tab (shows every request and error).
3. For backend issues, check the terminal where `node server/server.js` is running.

When reporting an issue, just send me (or your AI) the exact error message + steps to reproduce. The Error Boundary will catch most frontend crashes gracefully.

This setup lets me debug like a pro even though I build with English + AI.

## Documentation

| Doc | Purpose |
|-----|---------|
| [Product Manual](docs/MANUAL.md) | Feature guide and project context |
| [Architecture](docs/ARCHITECTURE.md) | Design decisions and pivots |
| [Data Pipeline](docs/DATA_PIPELINE.md) | How snapshot generation works |

## Related Work

- [Nansen DVN Analysis](https://github.com/ooracle100/nansen-dvn-analysis) — $18.2B verified volume forensic analysis
- [Tempo Fee Analysis](https://github.com/ooracle100/tempo-fee-analysis) — FeeManager routing bug discovery on Tempo testnet

---

Built by [Marvin Ohanwe](https://github.com/ooracle100)
