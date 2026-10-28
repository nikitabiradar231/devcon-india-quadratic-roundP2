import {
  createPublicClient,
  http,
  formatEther,
  type Address
} from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

// Contract ABI containing the read methods needed for independent auditing
export const QUADRATIC_ROUND_ABI = [
  {
    type: 'function',
    name: 'roundStart',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'roundEnd',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'operator',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isFinalized',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'matchingPool',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'totalAllocatedMatching',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'totalQuadraticScore',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getTotalContributions',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getProjectCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getAllProjectIds',
    inputs: [],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getProject',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'recipient', type: 'address' },
          { name: 'registrationTimestamp', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'claimed', type: 'bool' },
          { name: 'totalContributions', type: 'uint256' },
          { name: 'contributorCount', type: 'uint256' },
          { name: 'quadraticScore', type: 'uint256' },
          { name: 'matchingAllocation', type: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getProjectContributors',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getContribution',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'contributor', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getProjectClaimable',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

// Pure BigInt integer square root implementing floor(sqrt(x))
export function integerSqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('Square root of negative number');
  if (n === 0n || n === 1n) return n;

  let x0 = n / 2n;
  if (x0 !== 0n) {
    let x1 = (x0 + n / x0) / 2n;
    while (x1 < x0) {
      x0 = x1;
      x1 = (x0 + n / x0) / 2n;
    }
    return x0;
  }
  return 1n;
}

// Precision model: r_{i,p} = floor(sqrt(c_{i,p} * S^2)) where S^2 = 1e18
export const SCALE_SQUARED = 1000000000000000000n; // 1e18

export function computeScaledSqrt(contributionWei: bigint): bigint {
  if (contributionWei === 0n) return 0n;
  return integerSqrt(contributionWei * SCALE_SQUARED);
}

// Full precision mulDiv: floor((a * b) / c)
export function mulDiv(a: bigint, b: bigint, c: bigint): bigint {
  if (c === 0n) return 0n;
  return (a * b) / c;
}

export async function verifyContractResults(contractAddress: Address, rpcUrl?: string) {
  console.log('================================================================');
  console.log('   INDEPENDENT QUADRATIC FUNDING RESULTS AUDITOR');
  console.log('   Challenge: Two Hundred Small Backers Should Beat One Whale');
  console.log('================================================================\n');

  console.log(`Connecting to network with contract: ${contractAddress}`);
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl || process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
  });

  const isFinalized = await client.readContract({
    address: contractAddress,
    abi: QUADRATIC_ROUND_ABI,
    functionName: 'isFinalized'
  });

  console.log(`Round Finalized Status: ${isFinalized ? 'FINALIZED' : 'ACTIVE / UNFINALIZED'}`);
  if (!isFinalized) {
    console.log('Notice: The round is not yet finalized onchain. Verifying current contributions & pre-finalization state.');
  }

  const matchingPool = await client.readContract({
    address: contractAddress,
    abi: QUADRATIC_ROUND_ABI,
    functionName: 'matchingPool'
  });

  const totalContributions = await client.readContract({
    address: contractAddress,
    abi: QUADRATIC_ROUND_ABI,
    functionName: 'getTotalContributions'
  });

  const projectIds = await client.readContract({
    address: contractAddress,
    abi: QUADRATIC_ROUND_ABI,
    functionName: 'getAllProjectIds'
  });

  console.log(`Matching Pool: ${formatEther(matchingPool)} ETH`);
  console.log(`Total Direct Contributions: ${formatEther(totalContributions)} ETH`);
  console.log(`Registered Projects: ${projectIds.length}\n`);

  let recomputedTotalScore = 0n;
  const projectAudits: Array<{
    id: bigint;
    name: string;
    contributorCount: number;
    contributions: bigint;
    onchainScore: bigint;
    recomputedScore: bigint;
    onchainMatch: bigint;
    recomputedMatch: bigint;
    claimable: bigint;
    claimed: boolean;
  }> = [];

  // Step 1: Independently compute scores from contributor aggregates
  for (const pid of projectIds) {
    const project = await client.readContract({
      address: contractAddress,
      abi: QUADRATIC_ROUND_ABI,
      functionName: 'getProject',
      args: [pid]
    });

    const contributors = await client.readContract({
      address: contractAddress,
      abi: QUADRATIC_ROUND_ABI,
      functionName: 'getProjectContributors',
      args: [pid]
    });

    let sumOfRoots = 0n;
    let sumContributions = 0n;

    for (const contributor of contributors) {
      const c = await client.readContract({
        address: contractAddress,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'getContribution',
        args: [pid, contributor]
      });

      sumContributions += c;
      const root = computeScaledSqrt(c);
      sumOfRoots += root;
    }

    const recomputedScore = sumOfRoots * sumOfRoots;
    recomputedTotalScore += recomputedScore;

    projectAudits.push({
      id: pid,
      name: project.name,
      contributorCount: contributors.length,
      contributions: project.totalContributions,
      onchainScore: project.quadraticScore,
      recomputedScore,
      onchainMatch: project.matchingAllocation,
      recomputedMatch: 0n, // calculated in Step 2
      claimable: 0n,
      claimed: project.claimed
    });

    // Invariant: sum of individual contributions must equal project total
    if (sumContributions !== project.totalContributions) {
      throw new Error(
        `Invariant Failed: Project ${pid} sum of contributor amounts (${sumContributions}) != tracked total (${project.totalContributions})`
      );
    }
  }

  // Step 2: Proportional match allocation
  let recomputedTotalMatch = 0n;
  for (const audit of projectAudits) {
    if (recomputedTotalScore > 0n && matchingPool > 0n) {
      audit.recomputedMatch = mulDiv(matchingPool, audit.recomputedScore, recomputedTotalScore);
      recomputedTotalMatch += audit.recomputedMatch;
    }
  }

  // Step 3: Verification & Invariant Checks
  console.log('----------------------------------------------------------------');
  console.log('PROJECT AUDIT BREAKDOWN');
  console.log('----------------------------------------------------------------');

  let allChecksPassed = true;

  for (const audit of projectAudits) {
    console.log(`\nProject #${audit.id}: "${audit.name}"`);
    console.log(`  Contributors: ${audit.contributorCount}`);
    console.log(`  Total Contributions: ${formatEther(audit.contributions)} ETH`);
    console.log(`  Onchain Score:     ${audit.onchainScore}`);
    console.log(`  Recomputed Score:  ${audit.recomputedScore}`);

    if (isFinalized) {
      console.log(`  Onchain Match:     ${formatEther(audit.onchainMatch)} ETH`);
      console.log(`  Recomputed Match:  ${formatEther(audit.recomputedMatch)} ETH`);

      if (audit.onchainScore !== audit.recomputedScore) {
        console.error(`  [FAIL] Score mismatch on project ${audit.id}!`);
        allChecksPassed = false;
      }
      if (audit.onchainMatch !== audit.recomputedMatch) {
        console.error(`  [FAIL] Match allocation mismatch on project ${audit.id}!`);
        allChecksPassed = false;
      }

      const claimable = await client.readContract({
        address: contractAddress,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'getProjectClaimable',
        args: [audit.id]
      });

      const expectedClaimable = audit.claimed ? 0n : audit.contributions + audit.onchainMatch;
      if (claimable !== expectedClaimable) {
        console.error(`  [FAIL] Claimable amount mismatch for project ${audit.id}!`);
        allChecksPassed = false;
      }
      console.log(`  Status: ${audit.claimed ? 'CLAIMED' : 'UNCLAIMED'} (Claimable: ${formatEther(claimable)} ETH)`);
    } else {
      console.log(`  Projected Score:   ${audit.recomputedScore}`);
      console.log(`  Projected Match:   ${formatEther(audit.recomputedMatch)} ETH`);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log('GLOBAL INVARIANT AUDIT');
  console.log('----------------------------------------------------------------');

  console.log(`Total Recomputed Match: ${formatEther(recomputedTotalMatch)} ETH`);
  console.log(`Matching Pool Cap:      ${formatEther(matchingPool)} ETH`);

  if (recomputedTotalMatch > matchingPool) {
    console.error(`[FAIL] INVARIANT VIOLATED: Total match (${recomputedTotalMatch}) exceeds matching pool (${matchingPool})!`);
    allChecksPassed = false;
  } else {
    console.log(`[PASS] Invariant Verified: Total match <= matching pool`);
  }

  const contractBalance = await client.getBalance({ address: contractAddress });
  console.log(`Contract ETH Balance:   ${formatEther(contractBalance)} ETH`);

  if (!allChecksPassed) {
    console.error('\nVerification FAILED! Discrepancies detected between independent computation and contract state.');
    process.exit(1);
  }

  console.log('\nAll mathematical invariants and onchain calculations VERIFIED successfully!');
}

async function main() {
  let contractAddress = process.env.VITE_CONTRACT_ADDRESS as Address | undefined;

  // Try reading from deployments/sepolia.json if available
  const deploymentFile = path.resolve(process.cwd(), 'deployments', 'sepolia.json');
  if (!contractAddress && fs.existsSync(deploymentFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      if (data.contractAddress) {
        contractAddress = data.contractAddress as Address;
      }
    } catch {
      // Ignore parse error
    }
  }

  if (!contractAddress) {
    console.log('No contract address configured in VITE_CONTRACT_ADDRESS or deployments/sepolia.json.');
    console.log('Running independent self-test of the quadratic funding mathematical engine...');
    runMathSelfTest();
    return;
  }

  await verifyContractResults(contractAddress);
}

// Math engine self-test to verify mathematical correctness offline
export function runMathSelfTest() {
  console.log('\nRunning Mathematical Engine Verification:');
  console.log('--- Test Scenario A: 4 Small Backers (0.25 ETH each) vs 1 Whale (1.00 ETH) ---');

  const smallBackerWei = 250000000000000000n; // 0.25 ETH
  const whaleWei = 1000000000000000000n; // 1.00 ETH

  const rootSmall = computeScaledSqrt(smallBackerWei);
  const rootWhale = computeScaledSqrt(whaleWei);

  // 4 small backers
  const sumRootsProject1 = rootSmall * 4n;
  const scoreProject1 = sumRootsProject1 * sumRootsProject1;

  // 1 whale
  const sumRootsProject2 = rootWhale * 1n;
  const scoreProject2 = sumRootsProject2 * sumRootsProject2;

  console.log(`Project 1 (4 small backers, 1 ETH total) Score: ${scoreProject1}`);
  console.log(`Project 2 (1 whale, 1 ETH total) Score:        ${scoreProject2}`);
  console.log(`Ratio: ${Number(scoreProject1) / Number(scoreProject2)}x`);

  if (scoreProject1 !== 4n * scoreProject2) {
    throw new Error('Self-test failed: small backers did not beat whale by 4x');
  }

  // Allocate 10 ETH pool
  const pool = 10000000000000000000n; // 10 ETH
  const totalScoreA = scoreProject1 + scoreProject2;
  const match1A = mulDiv(pool, scoreProject1, totalScoreA);
  const match2A = mulDiv(pool, scoreProject2, totalScoreA);

  console.log(`Project 1 Match: ${formatEther(match1A)} ETH (80%)`);
  console.log(`Project 2 Match: ${formatEther(match2A)} ETH (20%)`);
  console.log(`Sum of matches: ${formatEther(match1A + match2A)} ETH <= ${formatEther(pool)} ETH pool`);

  if (match1A + match2A > pool) {
    throw new Error('Self-test failed: matches exceed pool');
  }

  console.log('\n--- Test Scenario B: 200 Small Backers (0.01 ETH each) vs 1 Whale (2.00 ETH) ---');
  const backer200Wei = 10000000000000000n; // 0.01 ETH
  const whale2Wei = 2000000000000000000n; // 2.00 ETH

  const root200 = computeScaledSqrt(backer200Wei); // 1e17
  const rootWhale2 = computeScaledSqrt(whale2Wei); // 1414213562373095048

  const sumRootsP1_200 = root200 * 200n; // 2e19
  const scoreP1_200 = sumRootsP1_200 * sumRootsP1_200; // 4e38
  const scoreP2_Whale = rootWhale2 * rootWhale2; // 1999999999999999997732481866842122304

  console.log(`Project 1 (200 small backers, 2 ETH total) Score: ${scoreP1_200}`);
  console.log(`Project 2 (1 whale, 2 ETH total) Score:          ${scoreP2_Whale}`);
  console.log(`Ratio: ${Number(scoreP1_200 / (scoreP2_Whale / 1000000000n)) / 1000000000}x (~200x)`);

  const totalScoreB = scoreP1_200 + scoreP2_Whale;
  const match1B = mulDiv(pool, scoreP1_200, totalScoreB);
  const match2B = mulDiv(pool, scoreP2_Whale, totalScoreB);

  console.log(`Project 1 Match: ${formatEther(match1B)} ETH (~99.50%)`);
  console.log(`Project 2 Match: ${formatEther(match2B)} ETH (~0.50%)`);
  console.log(`Sum of matches: ${formatEther(match1B + match2B)} ETH <= ${formatEther(pool)} ETH pool`);

  if (match1B + match2B > pool) {
    throw new Error('Self-test failed: matches exceed pool');
  }

  console.log('\nMathematical engine self-test PASSED successfully for all scenarios!\n');
}

if (process.argv[1] && process.argv[1].endsWith('verify-results.ts')) {
  main().catch((err) => {
    console.error('Audit script error:', err);
    process.exit(1);
  });
}
