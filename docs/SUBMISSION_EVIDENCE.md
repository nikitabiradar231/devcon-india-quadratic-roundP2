# Judge Submission Evidence Index
### Project: Two Hundred Small Backers Should Beat One Whale (`devcon-india-quadratic-round`)

This document aggregates verified test results, build outputs, onchain deployment receipts, and mathematical evidence for hackathon evaluation.

---

## 1. Repository & Commit Information

- **Repository:** [`https://github.com/nikitabiradar231/devcon-india-quadratic-roundP2.git`](https://github.com/nikitabiradar231/devcon-india-quadratic-roundP2.git)
- **Branch:** `main`
- **Current Git Commit:** `ea4524f` (`docs: add explicit statement on test scenario scope in README`)
- **Remote Synchronization:** Up to date with `origin/main`
- **Security Audit:** Zero credentials, private keys, or `.env` files tracked or committed.

---

## 2. Test & Build Reproducibility Results

All tests have been freshly executed and verified in the local workspace:

### A. Smart Contract Test Suite (Foundry)
- **Command:** `forge test -vvv`
- **Result:** **29 passed, 0 failed, 0 skipped** across 5 test suites (execution time: 508ms)
  - `test/IntegerSqrt.t.sol`: 7 passed (Babylonian integer square root floor invariants, boundary fuzzing, OpenZeppelin equivalence)
  - `test/GasScalability.t.sol`: 1 passed (50 contributors across 5 projects finalized at 627,454 gas)
  - `test/DeploymentWorkflow.t.sol`: 5 passed (Dynamic round timing, registration window cutoffs, operator authorization, zero/malformed parameter rejection)
  - `test/QuadraticFundingRound.t.sol`: 15 passed (Accounting invariants, Merkle gating, anti-split contributor aggregation, CEI claims, matching pool cap)
  - `test/TwoHundredBackers.t.sol`: 1 passed (Automated simulation of 200 small contributors beating 1 whale 200:1 mathematically)

### B. Frontend Test Suite (Vitest)
- **Command:** `npm run frontend:test`
- **Result:** **11 passed, 0 failed** in 9.47s
  - Dashboard metrics rendering
  - Project cards and recipient links
  - Empty project list state
  - Disconnected wallet and Wrong-Network alerts
  - Merkle allowlist vs. non-allowlist detection
  - Finalized results calculation and 8-step breakdown
  - CSV and JSON export functionality
  - Round timing restrictions
  - Operator authorization badge
  - Methodology documentation

### C. Frontend Production Build
- **Command:** `npm run frontend:build`
- **Result:** **Build succeeded** in 23.49s (`tsc -b && vite build`)
  - 6,895 modules transformed
  - Assets generated in `frontend/dist/` (`index.html`, `index.css`, `index.js`)

### D. Independent Quadratic Funding Auditor
- **Command:** `npm run verify-results`
- **Result:** **All invariants verified** against Sepolia RPC:
  - $\text{Total match} \le \text{Matching pool}$ ($0\text{ ETH} \le 0\text{ ETH}$)
  - Pre-finalization invariant verified.

### E. Onchain Deployment Auditor
- **Command:** `npm run verify-deployment`
- **Result:** **Confirmed on Sepolia network**
  - Contract address: `0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC`
  - Bytecode: 8,665 bytes confirmed active onchain
  - Operator: `0x31e9117D0BfceA67088aA96e356473c52CF9f9fF`
  - Status: Active / Unfinalized (`projectCount: 0`)

---

## 3. Onchain Deployment Evidence

### Canonical Deployment Record (Sepolia Testnet)
- **Contract Address:** [`0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC`](https://sepolia.etherscan.io/address/0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC)
- **Deployment Transaction Hash:** [`0x1834ef9d96daec11f03317c6e48b4ce934dfe94745802542e8797811867c7a33`](https://sepolia.etherscan.io/tx/0x1834ef9d96daec11f03317c6e48b4ce934dfe94745802542e8797811867c7a33)
- **Block Number:** `12012407`
- **Chain ID:** `11155111`
- **Gas Used for Deployment:** `13,831,365 gas`
- **Effective Gas Price:** `3,000,015 wei` ($\approx 0.003$ Gwei)
- **Actual Transaction Fee Paid:** `0.00004149 ETH`
- **Deployer / Operator Address:** `0x31e9117D0BfceA67088aA96e356473c52CF9f9fF`
- **Eligibility Merkle Root:** `0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d`
- **Initial Matching Pool:** 0 wei (unfunded)

---

## 4. Mathematical Scenario Evidence & Scope

### 200 Small Backers vs. 1 Whale Test Scenario
- **Project 1 (Community Project):**
  - Contributor Count: 200 unique wallets
  - Contribution per Wallet: $0.01\text{ ETH}$ ($10^{16}\text{ wei}$)
  - Total Raw Capital: $2.00\text{ ETH}$
  - Scaled Root per Contributor: $\text{floor}(\sqrt{0.01 \times 10^{36}}) = 0.1 \times 10^{18}$
  - Sum of Roots: $200 \times 0.1 \times 10^{18} = 20.0 \times 10^{18}$
  - Quadratic Score $Q_1$: $(20.0 \times 10^{18})^2 = \mathbf{4.0 \times 10^{38}}$
- **Project 2 (Whale Project):**
  - Contributor Count: 1 whale wallet
  - Contribution: $2.00\text{ ETH}$ ($2 \times 10^{18}\text{ wei}$)
  - Total Raw Capital: $2.00\text{ ETH}$
  - Scaled Root: $\text{floor}(\sqrt{2.0 \times 10^{36}}) \approx 1.414213562 \times 10^{18}$
  - Quadratic Score $Q_2$: $(\approx 1.414213562 \times 10^{18})^2 \approx \mathbf{2.0 \times 10^{36}}$
- **Ratio Comparison:**
  - Raw Contributions: $1 : 1$ ($2.0\text{ ETH} : 2.0\text{ ETH}$)
  - Quadratic Score Ratio: $4.0 \times 10^{38} / 2.0 \times 10^{36} = \mathbf{200 : 1}$
  - Under a 10 ETH pool with these two projects: Project 1 receives $9.9502\text{ ETH}$ ($99.50\%$), Project 2 receives $0.0498\text{ ETH}$ ($0.50\%$).

### Scope & Limitations
- **Test Scenario Scope:** This scenario is an automated mathematical proof executed in [`test/TwoHundredBackers.t.sol`](file:///c:/Users/nikita/OneDrive/Desktop/d2/test/TwoHundredBackers.t.sol). The 200 contributors are simulated accounts to verify algorithmic resilience against capital concentration under sybil-resistant conditions; they are not real-world community users.
- **Payout Nuance:** The 200:1 ratio is specific to the two-project distribution. In rounds with multiple competing projects, matching percentages depend on total participating project scores.

---

## 5. Status: Verified vs. Unverified

### What Is Independently Verified:
- [x] Runtime bytecode deployed and active on Ethereum Sepolia at `0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC`.
- [x] Deployment transaction `0x1834...` confirmed in Sepolia block `12012407`.
- [x] 200-member Sybil-resistant Merkle tree root matches across all source and test files.
- [x] Anti-split transaction aggregation mathematically and onchain unit-tested.
- [x] Babylonian fixed-point integer square root verified against OpenZeppelin math.
- [x] One-time claim with CEI and reentrancy protection verified.
- [x] 29 Foundry contract tests passing locally.
- [x] 11 Vitest frontend tests passing locally.
- [x] Frontend production bundle builds cleanly.
- [x] Independent auditor confirms zero matching liabilities when pool is 0 ETH.

### What Remains Unverified / Future Dependent:
- [ ] Live onchain registered projects on Sepolia: The existing contract `0x95e1...` currently has 0 registered projects because the 5-minute `roundStart` window elapsed prior to registration. (A fresh deployment script with a 2-hour pre-round buffer is prepared in `scripts/deploy-and-register.ts` awaiting owner approval).
- [ ] Matching pool funding: The live contract currently holds 0 ETH in its matching pool (by design, until funding is separately approved).
- [ ] Real-world human Sybil resistance: The system verifies address inclusion in the attendee Merkle allowlist; human uniqueness requires external identity layers (e.g. World ID or Gitcoin Passport).
