# Two Hundred Small Backers Should Beat One Whale
### Devcon India Quadratic Funding Round (`devcon-india-quadratic-round`)

A production-grade, mathematically verified quadratic funding platform deployed for the **Road to Devcon XI** challenge on **Ethereum Sepolia (Chain ID 11155111)**.

---

## 1. Project Overview & Thesis

Quadratic Funding (QF) is an optimal public goods allocation mechanism designed to amplify community breadth over individual wealth. Under standard proportional matching, a wealthy "whale" donating 2.0 ETH exerts massive influence over matching outcomes. In Quadratic Funding, matching funds are distributed proportionally to the **square of the sum of square roots** of individual contributions:

$$Q_p = \left( \sum_{i} \sqrt{c_{i,p}} \right)^2$$

### The Core Challenge Result: 200 Small Backers vs. 1 Whale
When comparing:
1. **Community Project (200 small backers)** contributing $0.01\text{ ETH}$ each ($2.0\text{ ETH}$ total)
2. **Whale Project (1 backer)** contributing $2.00\text{ ETH}$ ($2.0\text{ ETH}$ total)

Both projects collect the **identical raw capital ($2.0\text{ ETH}$)**. Under standard matching, they would receive equal payouts. Under Quadratic Funding:
- Project 1 Score: $(200 \times \sqrt{0.01 \times 10^{18}})^2 = (200 \times 10^{17})^2 = \mathbf{4.0 \times 10^{38}}$
- Project 2 Score: $(\sqrt{2.0 \times 10^{18}})^2 = \mathbf{1.999999999999999997732481866842122304 \times 10^{36}}$
- **Score Ratio:** $4.0 \times 10^{38} / 2.0 \times 10^{36} \approx \mathbf{200 : 1}$!

From a $10.0\text{ ETH}$ matching pool:
- **Community Project receives:** $\mathbf{9.950248756218905472\text{ ETH}}$ ($99.502\%$)
- **Whale Project receives:** $\mathbf{0.049751243781094527\text{ ETH}}$ ($0.498\%$)

The community project beats the single whale by **200x matching advantage**, proving that grassroots consensus defeats concentrated capital.

---

## 2. Architecture & Smart Contract Design

```
devcon-india-quadratic-round/
├── src/
│   ├── QuadraticFundingRound.sol     # Core QF contract with Merkle gating, anti-split & CEI claims
│   └── libraries/
│       └── IntegerSqrt.sol           # O(log n) Babylonian fixed-point integer square root
├── test/
│   ├── QuadraticFundingRound.t.sol   # 15 tests covering invariants, access control & edge cases
│   ├── IntegerSqrt.t.sol             # 7 fuzz & unit tests comparing against OpenZeppelin math
│   ├── GasScalability.t.sol          # Scalability gas benchmarks (50+ contributors)
│   └── TwoHundredBackers.t.sol       # Full simulation of 200 small backers vs 1 whale
├── scripts/
│   ├── generate-eligibility.ts       # Generates 200-member Merkle tree and proofs
│   ├── verify-results.ts             # Independent offchain math verification engine
│   ├── verify-deployment.ts          # Onchain deployment verification script
│   └── export-results.ts             # Exports finalized results to CSV and JSON
├── script/
│   ├── Deploy.s.sol                  # Foundry deployment script
│   ├── ConfigureRound.s.sol          # Project registration and initial setup script
│   └── FinalizeRound.s.sol           # Round finalization script
├── data/
│   └── eligibility-tree.json         # Committed 200-member Merkle tree & proof database
├── reports/
│   ├── results.json                  # Audited finalized allocation report
│   └── results.csv                   # CSV export of project ranks and payouts
└── frontend/                         # Vite + React + Tailwind + Wagmi/Viem Dashboard
    ├── src/
    │   ├── components/               # Navbar, Dashboard, Projects, Results, Operator, Methodology
    │   ├── config/                   # Contract ABI, Sepolia config, Merkle proof loader
    │   ├── hooks/                    # useRoundData hook with live/simulated state
    │   └── test/                     # 11 Vitest frontend component & integration tests
```

### Key Contract Invariants & Features
1. **Scaled Integer Square Root:** Scales input by $S^2 = 10^{18}$ to preserve 9 fractional decimals without floating-point errors ($r_{i,p} = \text{floor}(\sqrt{c_{i,p} \times 10^{18}})$).
2. **Anti-Split Aggregation:** Repeated contributions from the same wallet to the same project are pre-aggregated before taking the square root (`contributions[projectId][msg.sender] += msg.value`). A single contributor splitting $1\text{ ETH}$ into ten $0.1\text{ ETH}$ transactions receives zero quadratic benefit.
3. **Sybil-Resistance via Merkle Proofs:** Only allowlisted wallets presenting valid 32-byte Merkle proofs can contribute.
4. **Matching Pool Conservation:** Allocations use OpenZeppelin `Math.mulDiv`. Integer truncation guarantees $\sum \text{Match}_p \le \text{MatchingPool}$. The 1-wei rounding dust is safely retained.
5. **Reentrancy Protection & One-Time Claims:** Claims follow Checks-Effects-Interactions (CEI) and `ReentrancyGuard`, allowing only the registered recipient address to claim funds once.

---

## 3. Environment Setup & Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the following parameters in `.env`:

```dotenv
# Ethereum Sepolia Testnet RPC Endpoint
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Deployer Private Key (Keep secret! Never commit private keys)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Etherscan API Key for contract verification (optional)
ETHERSCAN_API_KEY=your_etherscan_key_here

# Round Parameters
OPERATOR_ADDRESS=your_operator_address
ROUND_START=1730000000
ROUND_END=1730604800
ELIGIBILITY_ROOT=0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d
INITIAL_MATCHING_POOL=10000000000000000000

# Frontend Deployment Address
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
```

> **Security Note:** Vite exposes variables prefixed with `VITE_` to client browsers. Never place private keys or authenticated secrets in `VITE_` variables.

---

## 4. Testing & Verification

### Running All Tests (Foundry Contracts + Frontend Vitest)
```bash
npm test
```

### 1. Smart Contract Tests (Foundry)
```bash
forge test -vvv
```
**Current Result:** 24 passing tests across 4 test suites:
- `IntegerSqrtTest`: 7 passed (Fuzzing, OpenZeppelin equivalence, precision boundaries)
- `GasScalabilityTest`: 1 passed (50+ contributors across 5 projects under 630k gas)
- `QuadraticFundingRoundTest`: 15 passed (Invariants, Merkle gating, anti-split, CEI, timing)
- `TwoHundredBackersTest`: 1 passed (Onchain simulation of 200 backers beating 1 whale 200:1)

### 2. Code Formatting Check
```bash
forge fmt --check
```

### 3. Frontend Unit & Integration Tests (Vitest)
```bash
npm run frontend:test
```
**Current Result:** 11 passed tests verifying:
- Landing dashboard rendering and metrics
- Project cards and recipient links
- Empty project list state
- Disconnected wallet and Wrong-Network alerts
- Merkle allowlist vs non-allowlist detection
- Finalized results calculation and 8-step breakdown
- CSV and JSON export functionality
- Round timing restrictions
- Operator authorization badge
- Methodology documentation

### 4. Frontend Production Build
```bash
npm run frontend:build
```

### 5. Independent Mathematical Verification
Run the standalone offchain auditor:
```bash
npm run verify-results
```

To re-generate the Merkle tree and attendee proofs:
```bash
npm run generate-eligibility
```

To export finalized results to `reports/results.json` and `reports/results.csv`:
```bash
npm run export-results
```

---

## 5. Sepolia Testnet Deployment

### Live Deployed Contract
- **Contract Address:** [`0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC`](https://sepolia.etherscan.io/address/0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC)
- **Deployment Transaction:** [`0x1834ef9d96daec11f03317c6e48b4ce934dfe94745802542e8797811867c7a33`](https://sepolia.etherscan.io/tx/0x1834ef9d96daec11f03317c6e48b4ce934dfe94745802542e8797811867c7a33)
- **Deployment Block:** `12012407`
- **Network:** Ethereum Sepolia (`chainId: 11155111`)
- **Deployer / Operator:** `0x31e9117D0BfceA67088aA96e356473c52CF9f9fF`
- **Eligibility Merkle Root:** `0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d`
- **Initial Matching Pool:** 0 wei

### Verify Deployment Onchain
To verify bytecode, operator, Merkle root, and timestamps directly against Sepolia RPC:
```bash
npm run verify-deployment
```

---

## 6. How a Reviewer Can Independently Verify the Math

You do not need to trust the frontend to audit this round:

1. **Inspect Contract Logic:**
   - Review [QuadraticFundingRound.sol](file:///c:/Users/nikita/OneDrive/Desktop/d2/src/QuadraticFundingRound.sol#L283-L322) for the exact finalization loop.
   - Review [IntegerSqrt.sol](file:///c:/Users/nikita/OneDrive/Desktop/d2/src/libraries/IntegerSqrt.sol) for the Babylonian integer square root implementation.
2. **Execute Onchain 200-Backer Test:**
   ```bash
   forge test --match-contract TwoHundredBackersTest -vvvv
   ```
   Inspect the execution traces showing 200 contributors each depositing $0.01\text{ ETH}$ and 1 whale depositing $2.00\text{ ETH}$, yielding a 200:1 score ratio.
3. **Run the Independent Auditor:**
   ```bash
   npm run verify-results
   ```
   This script queries the contract state (or runs the offline mathematical engine) using BigInt exact arithmetic and validates all invariants.

---

## 7. Known Limitations & Trust Assumptions

1. **Allowlist vs. Human Identity:** An onchain Merkle allowlist guarantees that each contributor holds an address from the attendee database. However, it cannot prevent a single human from accumulating multiple allowlisted private keys without biometric or decentralized identity layers (such as WorldID or Gitcoin Passport).
2. **Block Gas Limit at Scale:** The contract limits registered projects to 100 and contributors per project to 1,000. In our benchmarks, finalization of 50 contributors consumed 627,454 gas (well within Ethereum's 30,000,000 block limit). For 10,000+ contributors, offchain score computation with optimistic ZK proofs would be recommended.
3. **Integer Truncation:** Division truncation naturally produces rounding dust (typically 1 to 5 wei out of $10^{19}$ wei). This dust is safely retained in the contract matching pool.
4. **Test Scenario Scope:** The 200-contributor versus one-whale demonstration is an architectural and mathematical verification test scenario designed to prove algorithmic resilience against capital concentration under sybil-resistant conditions; it is not a claim or proof of real-world community adoption.

---

## 8. Challenge Acceptance Checklist

- [x] Fixed-point scaled integer square root implementation ($S = 10^9, S^2 = 10^{18}$)
- [x] Anti-split contributor aggregation prior to square root evaluation
- [x] Merkle tree proof eligibility for 200 unique community members
- [x] Complete Foundry test suites passing (24 / 24 tests across 4 test suites)
- [x] Mathematical audit correcting sample reporting to exact values ($200:1$ ratio)
- [x] Complete frontend implemented (Dashboard, Projects, Results, Operator, Methodology)
- [x] Disconnected, Wrong-Network, Ineligible, and Empty UI states handled
- [x] 8-step formula audit breakdown rendered on Results page
- [x] CSV and JSON export working in both CLI and frontend
- [x] 11 Vitest frontend tests passing and production build passing
- [x] Credential safety scan: Confirmed zero secrets tracked, `.env` gitignored
- [x] GitHub synchronization: Repository pushed to `origin/main` at [devcon-india-quadratic-roundP2](https://github.com/nikitabiradar231/devcon-india-quadratic-roundP2)
- [x] Live Sepolia deployment broadcast and verified onchain: [`0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC`](https://sepolia.etherscan.io/address/0x95e1075FB72eb6b0C3b1DB308C0d8f99B0a16BDC)


