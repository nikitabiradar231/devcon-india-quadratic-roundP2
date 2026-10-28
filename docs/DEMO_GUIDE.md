# Judge & Evaluator Demo Rehearsal Guide
### Project: Two Hundred Small Backers Should Beat One Whale (`devcon-india-quadratic-round`)

This guide explains how evaluators and judges can inspect, run, and verify the quadratic funding platform locally, review the onchain contract state on Ethereum Sepolia, and audit the mathematical scoring without requiring any live transaction broadcasts.

---

## 1. Prerequisites & Quickstart Setup

### Requirements
- **Node.js:** v18.0.0 or later
- **Foundry:** `forge` v0.2.0 or later
- **Git**

### Installation Commands
Run in the workspace root (`C:\Users\nikita\OneDrive\Desktop\d2`):
```bash
# 1. Install root dependencies (TypeScript, Viem, TSX)
npm install

# 2. Install frontend dependencies
npm run frontend:install

# 3. Build smart contracts
forge build
```

---

## 2. How to Launch the Application Locally

```bash
npm run frontend:dev
```
Open your browser at `http://localhost:5173`.

### Offline vs. Live Onchain Mode
- **Offline / Sample Mode:** If `VITE_CONTRACT_ADDRESS` is unset or points to an unconfigured address, the frontend loads the verified demonstration dataset (`SAMPLE_PROJECTS` and `SAMPLE_ROUND_INFO`), allowing judges to review the complete UI, 8-step mathematical breakdown, and project cards immediately.
- **Live Sepolia Mode:** When `VITE_CONTRACT_ADDRESS=0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC` is set, the frontend connects directly via Viem to Ethereum Sepolia RPC, reading contract state, round timestamps, and onchain balances.

---

## 3. How to Inspect the Quadratic Funding Calculation

Judges can inspect the exact mathematics through three independent layers:

### A. In the Frontend UI
Navigate to the **Results** page (`/results` or tab in UI):
- Displays the **8-Step Quadratic Formula Audit**:
  1. Input scaling ($c_{i,p} \times 10^{18}$)
  2. Fixed-point integer square root ($r_{i,p} = \text{floor}(\sqrt{c_{i,p} \times S^2})$)
  3. Pre-aggregation of repeat wallet contributions
  4. Summation of roots ($\sum r_{i,p}$)
  5. Project quadratic score ($Q_p = (\sum r_{i,p})^2$)
  6. Total round score summation ($Q_{\text{total}} = \sum Q_p$)
  7. Proportional matching calculation ($\text{Match}_p = \text{floor}(M \times Q_p / Q_{\text{total}})$)
  8. Dust retention in matching pool
- Click **Export JSON** or **Export CSV** to download the mathematical allocation audit report.

### B. In the Standalone Verification Script (CLI)
Run the read-only mathematical engine:
```bash
npm run verify-results
```
This script queries the Sepolia RPC, extracts live or simulation data, computes exact BigInt quadratic matches, and verifies that $\sum \text{Match}_p \le \text{MatchingPool}$.

### C. In the Smart Contract Source
Inspect [`src/QuadraticFundingRound.sol`](file:///c:/Users/nikita/OneDrive/Desktop/d2/src/QuadraticFundingRound.sol#L275-L314) for the onchain implementation of the scaling and allocation loop.

---

## 4. Wallet Connection & Contributor Eligibility Inspection

### Connecting a Wallet
1. In the frontend header, click **Connect Wallet**.
2. Select MetaMask or any Injected browser wallet.
3. Ensure your wallet is connected to **Ethereum Sepolia (Chain ID: 11155111)**.
   - If connected to Mainnet or another network, the UI automatically displays a **Wrong Network Banner** with a one-click network switch button.

### Merkle Eligibility Verification
The platform enforces Sybil-resistant contributor gating using a 200-member Merkle tree:
- Tree Root: `0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d`
- When a wallet connects, the UI checks [`frontend/src/config/eligibility-tree.json`](file:///c:/Users/nikita/OneDrive/Desktop/d2/frontend/src/config/eligibility-tree.json):
  - **If Eligible:** Displays a green **Verified Contributor** badge and automatically attaches the 8-node Merkle proof to the transaction payload.
  - **If Ineligible:** Displays an **Ineligible Address** badge, explaining that only allowlisted attendee accounts can contribute.

---

## 5. End-to-End Contract Workflow & State Transitions

The smart contract lifecycle enforces strict, sequential phases:

```
[Upcoming] ──(roundStart)──> [Live] ──(roundEnd)──> [Ended] ──(finalize)──> [Finalized]
    │                          │                      │                         │
    ├─ Register Projects       ├─ Submit Merkle       └─ Trigger finalization   └─ Claim Funds
    └─ Update Merkle Root         Contributions          (any caller)              (recipients)
```

### Steps That Require Live Onchain State:
1. **Contributing (`contribute`):** *(Requires signing a transaction)*
   Allowed only while `roundStart <= block.timestamp < roundEnd` on a contract with registered projects.
2. **Finalizing (`finalize`):** *(Requires signing a transaction)*
   Allowed only after `block.timestamp >= roundEnd`. Anyone can trigger it; it iterates through all registered projects and computes onchain quadratic allocations.
3. **Claiming Funds (`claimProjectFunds`):** *(Requires signing a transaction)*
   Allowed only after finalization. The registered recipient claims total direct contributions plus proportional matching allocation.

---

## 6. How to Demonstrate the 200:1 Result Locally (Automated Tests)

Judges can reproduce the 200-small-backers-vs-1-whale outcome on their local machine without spending any gas or making any onchain transactions:

```bash
forge test --match-contract TwoHundredBackersTest -vvvv
```

### What This Test Proves:
- Mints 200 individual contributor addresses.
- Each contributor deposits $0.01\text{ ETH}$ to Project 1 (total $2.0\text{ ETH}$).
- 1 whale deposits $2.00\text{ ETH}$ to Project 2 (total $2.0\text{ ETH}$).
- Asserts that Project 1 receives score $4.0 \times 10^{38}$ while Project 2 receives score $2.0 \times 10^{36}$.
- Asserts score ratio is **200:1**.
- In a 10 ETH pool, Project 1 receives $9.9502\text{ ETH}$ ($99.50\%$) while Project 2 receives $0.0498\text{ ETH}$ ($0.50\%$).

---

## 7. Troubleshooting & Common Scenarios

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Wrong Network" Warning** | Wallet connected to chain other than Sepolia | Switch wallet network to Ethereum Sepolia (`chainId: 11155111`). |
| **"Ineligible Contributor"** | Connected wallet is not in the 200-member attendee list | Switch to an allowlisted test account from `data/eligibility-tree.json` (e.g. `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`). |
| **"Registration Closed" Revert** | `block.timestamp >= roundStart` | Project registration is strictly locked once the round start timestamp arrives. |
| **Empty Project List on Live Contract** | Existing contract `0x95e1...` deployed with 0 projects | Normal state for existing deployment; offline sample data or a proposed fresh deployment displays all 4 draft projects. |
| **"Round Not Ended" Revert** | Attempting to call `finalize()` before `roundEnd` | Finalization cannot be called until the active round duration has fully elapsed. |
| **Matching Pool Shows 0 ETH** | Pool has not received sponsor deposits | Initial pool defaults to 0 ETH for security; sponsors or operator can fund via `fundMatchingPool()`. |

---

## 8. Summary of Read-Only Audit Commands

```bash
# 1. Run all 29 Solidity unit, invariant, and integration tests
forge test -vvv

# 2. Run all 11 frontend component and state tests
npm run frontend:test

# 3. Verify production bundle builds cleanly
npm run frontend:build

# 4. Run independent offchain QF auditor against Sepolia RPC
npm run verify-results

# 5. Check live bytecode and state of canonical deployed contract
npm run verify-deployment
```
*(All commands above are 100% read-only and safe to run.)*
