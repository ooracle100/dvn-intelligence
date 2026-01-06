# Implementation Plan - Token Amount Decoding

## Goal
Fix the "Amount $0.00" issue by correctly parsing the transferred token amount from `OFTSent` events and calculating a human-readable string.

## Technical Approach

### 1. OFTSent Event Parsing
The `OFTSent` event (Signature `0x854...`) typically contains the amount in the `data` field.
Structure (standard V2):
- `data` word 1: `dstEid` (or offset) - need to verify position.
- `data` word 2: `amountSentLD` (Local Decimals) - **Target**.
- `data` word 3: `amountReceivedLD`.

We will parse the **second 32-byte word** (bytes 32-64 of `data`) as the sent amount.

### 2. Decimals Normalization
To convert the raw BigInt amount to a readable number (e.g., `1000000` -> `1.0`), we need the token's decimals.
- We will add a helper `getTokenDecimals(contractAddress, chainId)` that performs an `eth_call` to the `decimals()` function (Sig: `0x313ce567`) using the Etherscan V2 API.
- Default to 18 if call fails.

### 3. File Changes: `src/utils/lzscanApi.js`
- **Add**: `ERC20_DECIMALS_SIG = '0x313ce567'`.
- **Add**: `getTokenDecimals` function.
- **Modify**: `enrichWithEtherscan` to decode `oftSentLogs`.
    - Extract raw hex amount.
    - Call `getTokenDecimals(log.address, chainId)`.
    - Set `enhanced.amount_tokens` (e.g., "5.234 USDC").
    - **Note on Price**: We will leave `amount_usd` as 0 unless it matches the native token, to avoid incorrect pricing (e.g., labelling USDC as ETH price).

### [NEW] Asset USD Valuation
*   **Problem**: Users see "1.5 ETH" or "1000 USDC" but no USD total, making it hard to gauge volume/risk.
*   **Solution**: Integration with DeFiLlama Price API.
    *   Endpoint: `https://coins.llama.fi/prices/current/{chain}:{address}`
    *   Map `srcChainEid` to DeFiLlama chain names (e.g., `ethereum`, `arbitrum`, `bsc`).
    *   Fetch price for the OAPP/Token address found in the log.
    *   Calculate `amount_usd = amount_tokens * price`.

## Etherscan V2 Fallback Strategy
*   Refactor `enrichWithEtherscan` to try `api.etherscan.io/v2` first.
*   If `V2` returns access error, lookup specific chain explorer in `CHAIN_INFO` and use the specific API key.
*   Gracefully handle failures by returning partial data (e.g., just amounts) instead of crashing.

### Proposed Changes
- Modify `enrichWithEtherscan` to use a helper `fetchWithFallback`.
- Add `getApiKeyForChain(chainId)` helper to check for specific env vars.
- Update `lzscanApi.js`.

## Etherscan V2 Fallback Strategy
Some chains (e.g., BSC) reject the generic Etherscan key on the Unified V2 endpoint with "Free API access is not supported".
To fix this, we will implement a fallback mechanism in `lzscanApi.js`:

1.  **Attempt V2 Unified**: Try the standard `api.etherscan.io/v2/api` call.
2.  **Catch Error**: If the response contains "Free API access is not supported" or "NOTOK", switch to fallback.
3.  **Fallback to Explorer**: Use the `explorer` URL from `CHAIN_INFO` (e.g., `api.bscscan.com`).
4.  **API Key Selection**:
    *   Check for chain-specific keys (e.g., `REACT_APP_BSCSCAN_KEY`).
    *   If not found, try the generic `REACT_APP_ETHERSCAN_KEY`.
    *   *Note: Using an Etherscan key on BscScan might fail, but it's the best effortless attempt.*

### Proposed Changes
- Modify `enrichWithEtherscan` to use a helper `fetchWithFallback`.
- Add `getApiKeyForChain(chainId)` helper to check for specific env vars.
- Update `lzscanApi.js`.

## Verification
- User checks the Transaction Details page again.
- "Amount" should show a formatted number (e.g., "0.032 ETH" or "500 ZRO").

# Implementation Plan - Refinement (Infinitys & Insights)

## Goal
Fix display bugs ("Infinitys") and upgrade the "Stack Recommender" from raw lists to meaningful "Intelligence" (Benchmarks & Recommendations).

## Technical Approach

### 1. Fix "Infinitys"
*   **Target**: `src/utils/format.js`
*   **Change**: Update `formatLatency` to check `Number.isFinite(v)`. Return "N/A" for Infinity.

### 2. Enhance Stack Recommender (`StackRecommender.jsx`)
*   **Current State**: Just lists top 3 stacks.
*   **Upgrade**:
    *   Identify the "Fastest" (lowest latency) and "Most Reliable" (highest success) in the top set.
    *   Add Badges/Tags to the cards: `⚡ Fastest`, `🛡️ Most Reliable`.

### 3. Upgrade Stack Comparison (`OappView.jsx`)
*   **Current State**: Two raw lists side-by-side.
*   **Upgrade**:
    *   Calculate **Performance Deltas**.
    *   Display: "Your Average Latency: 45s (Global Top: 30s) — ⚠️ 15s Slower".
    *   Actionable Insight: "Consider switching to [Top Stack Name] for 33% faster verification."

## Verification
*   Check Home > OApp search.
*   Verify "Infinitys" is gone.
*   Verify Recommender shows tags.
*   Verify Comparison shows useful benchmarks.

# Implementation Plan - Performance Intelligence (Efficiency Matrix)

## Goal
Transform raw transaction lists into actionable "Intelligence" for OApp builders. Show them which routes are performing well (Fast/Cheap/Safe) and which are not.

## Technical Approach

### 1. New Component: `EfficiencyMatrix.jsx`
*   **Input**: List of transactions (`viewData.transactions`).
*   **Logic**:
    *   Group transactions by `Source Chain` -> `Destination Chain`.
    *   For each route, calculate:
        *   **Total Volume**: Sum of `amount_usd`.
        *   **Avg Latency**: Average of `latency_seconds` (exclude missing/0).
        *   **Avg Cost**: Average of `total_fee_usd`.
        *   **Reliability**: (Delivered / Total) * 100%.
*   **UI**:
    *   A clean table/grid showing these metrics.
    *   Highlight "Slowest" or "Most Expensive" routes with color coding (e.g., Red for >10min latency).

### 2. Integration: `OappView.jsx`
*   Import `EfficiencyMatrix`.
*   Render it at the top of the view, before the transaction list.
*   Header: "Performance Intelligence (30D)".

## Verification
*   Search for an OApp Address.
*   Verify the Matrix appears.
*   Check if stats match the individual transactions below.
