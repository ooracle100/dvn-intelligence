# 6-Month DVN Backfill - Implementation Plan

## Objective
Collect 6 months of historical transaction data for all 21 DVNs shown on the frontend.

---

## API Limitation

> [!IMPORTANT]
> The LayerZero Scan REST API only returns the **latest 1000 messages**. There is no date-range query parameter. This means we cannot directly fetch historical data.

---

## Strategy: Continuous Polling + Database Accumulation

Since we can't query historical data directly, we will:

1. **Start collecting NOW** - Every poll adds new unique transactions
2. **Run frequently** - Every 5-15 minutes to capture all activity
3. **Deduplicate** - Database uses `tx_hash` as unique key
4. **Accumulate over time** - 6 months from now we'll have 6 months of data

This is actually **better than backfill** because:
- We get real-time data going forward
- No gaps in coverage
- Continuous monitoring becomes our moat

---

## All 21 DVNs to Track

| # | DVN ID | Name | Ethereum Address |
|---|--------|------|------------------|
| 1 | google-cloud | Google Cloud | 0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc |
| 2 | animoca-blockdaemon | Animoca-Blockdaemon | 0x7e65bdd15c8db8995f80abf0d6593b57dc8be437 |
| 3 | chainlink | Chainlink CCIP | 0x771d10d0c86e26ea8d3b778ad4d31b30533b9cbf |
| 4 | axelar | Axelar | 0xce5b47fa5139fc5f3c8c5f4c278ad5f56a7b2016 |
| 5 | wormhole | Wormhole | (no addresses) |
| 6 | eigenzero | EigenZero | 0x4184dd22692c8b50d8d7ee0d7b6028e45dbf8108 |
| 7 | nodit | Nodit | 0x0cea5a94f8cd3330c4f84944bf4500f8dacc440c |
| 8 | deutsche-telekom | Deutsche Telekom | 0x373a6e5c0c4e89e24819f00aa37ea370917aaff4 |
| 9 | nethermind | Nethermind | 0xa59ba433ac34d2927232918ef5b2eaafcf130ba5 |
| 10 | polyhedra-network | Polyhedra | 0x8ddf05f9a5c488b4973897e278b58895bf87cb24 |
| 11 | layerzero-labs | LayerZero Labs | 0xdb979d0a36af0525afa60fc265b1525505c55d79 |
| 12 | horizen-labs | Horizen | 0x380275805876ff19055ea900cdb2b46a94ecf20d |
| 13 | bitgo | BitGo | 0xc9ca319f6da263910fd9b037ec3d817a814ef3d8 |
| 14 | stargate | Stargate | 0x8fafae7dd957044088b3d0f67359c327c6200d18 |
| 15 | p2p | P2P.org | (Base only: 0x5b6735c66d97479ccd18294fc96b3084ecb2fa3f) |
| 16 | canary | Canary | 0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd |
| 17 | bcw | BCW Group | (Base only: 0xb3ce0a5d132cd9bf965aba435e650c55edce0062) |
| 18 | frax | Frax | 0x38654142f5e672ae86a1b21523aafc765e6a1e08 |
| 19 | paxos | Paxos | 0xb0b2ef168f52f6d1e42f461e11117295ef992daf |
| 20 | curve | Curve | 0xcc35923c43893cc31f2815e216afd7efb60f1fb0 |
| 21 | usdt0 | Tether | (X Layer only: 0x6de0d56e2d695db9e2b4fbeca3d81372c59848bb) |

---

## Implementation Phases

### Phase 1: Immediate (Today)
- [x] REST API client working
- [x] Database schema ready
- [x] DVN filtering logic working
- [ ] **Run initial collection** for all 21 DVNs
- [ ] Set up cron job (every 15 min)

### Phase 2: This Week
- [ ] Add price oracle (USD values)
- [ ] Multi-chain address matching
- [ ] Frontend integration

### Phase 3: Ongoing
- Data accumulates automatically
- After 30 days: 1 month of data
- After 180 days: 6 months of data

---

## Decision Required

> [!WARNING]
> **Options:**
> 1. **Start collecting now** - Build dataset going forward (recommended)
> 2. **Contact LayerZero** - Request historical data export
> 3. **On-chain indexing** - Build custom indexer (complex)

**Recommend Option 1** - start now, data compounds over time.
