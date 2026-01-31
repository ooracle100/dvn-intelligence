# DVN Intelligence Platform

An institutional-grade analytics marketplace for LayerZero's Decentralized Verifier Networks (DVNs).

**Current Version:** MVP (85% Complete)  
**Status:** Functional Core + Real-time Transaction Decoding

---

##  The Mission
Institutional builders (Ondo, PayPal, BitGo) need to select secure DVN stacks for billion-dollar assets. **DVN Intelligence** is the "CoinGecko for DVNs"—providing the first comparative marketplace and performance analytics stack for the LayerZero ecosystem.

[Read the Product Manual](docs/MANUAL.md) | [See Architecture Decisions](docs/ARCHITECTURE.md)

---

##  Key Features

*   **DVN Marketplace:** Compare 40+ DVNs by volume, latency, and jurisdiction (US/EU/APAC).
*   **Transaction Intelligence:** Decode *any* LayerZero transaction hash to see the exact fees (DVN vs Executor) and amount transferred. 
    *   *Powered by Alchemy + ethers.js*
*   **OApp Dashboards:** Monitor performance for specific OApps (like FRNT or Merlin).
*   **Institutional Metrics:** "Total Volume Secured" calculated via snapshot engine.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, Tailwind CSS
*   **Data:** LayerZero Scan API + Alchemy (for decoding) + DeFiLlama (Prices)
*   **Data Strategy:** Hybrid.
    *   **Live:** Transaction details & OApp lookups.
    *   **Snapshots:** Historical volume aggregation (generated weekly).

[View Data Pipeline Details](docs/DATA_PIPELINE.md)

---

## 🚦 Quick Start

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Create `.env`:
    ```bash
    REACT_APP_ALCHEMY_KEY=your_alchemy_key_here
    ```

3.  **Run Development Server:**
    ```bash
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000)

4.  **Update Data Snapshots (Optional):**
    ```bash
    node scripts/generateDVNSnapshots.js
    ```

---

## 📚 Documentation

*   **[Product Manual](docs/MANUAL.md):** Complete feature guide and project context.
*   **[Architecture Check](docs/ARCHITECTURE.md):** Why we pivoted from "Real-time Volume" to "DVN Marketplace".
*   **[DVN Selection Guide](docs/DVN_Selection_Guide.md):** User guide for institutional DVN selection.
*   **[Data Pipeline](docs/DATA_PIPELINE.md):** How the snapshot generator works.

*Looking for old docs? Check `docs/archive/`.*
 
