import { createPublicClient, http, formatEther, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { QUADRATIC_ROUND_ABI } from './verify-results.js';

dotenv.config();

async function main() {
  console.log('--- Exporting Finalized Results to CSV & JSON ---');

  let contractAddress = process.env.VITE_CONTRACT_ADDRESS as Address | undefined;
  const deploymentFile = path.resolve(process.cwd(), 'deployments', 'sepolia.json');

  if (!contractAddress && fs.existsSync(deploymentFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      if (data.contractAddress) {
        contractAddress = data.contractAddress as Address;
      }
    } catch {
      // Ignore
    }
  }

  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  if (!contractAddress) {
    console.log('No deployed contract found. Generating verified mathematical simulation report (200 backers vs 1 whale).');
    
    // Exact mathematical derivation matching onchain IntegerSqrt and QuadraticFundingRound:
    // Project 1: 200 small contributors giving 0.01 ETH each (2.0 ETH total)
    // Sqrt per contributor = floor(sqrt(0.01e18 * 1e18)) = 1e17
    // Sum of roots = 200 * 1e17 = 2e19
    // Q_1 = (2e19)^2 = 4e38
    const score1 = 400000000000000000000000000000000000000n; // 4.0e38

    // Project 2: 1 whale giving 2.0 ETH (2.0 ETH total)
    // Sqrt = floor(sqrt(2.0e18 * 1e18)) = 1414213562373095048
    // Q_2 = 1414213562373095048^2 = 1999999999999999997732481866842122304
    const score2 = 1999999999999999997732481866842122304n; // ~2.0e36

    const pool = 10000000000000000000n; // 10 ETH matching pool
    const totalScore = score1 + score2;
    const match1 = (pool * score1) / totalScore; // 9950248756218905472n wei (~9.9502487562 ETH)
    const match2 = (pool * score2) / totalScore; // 49751243781094527n wei (~0.0497512438 ETH)

    const sampleResults = [
      {
        rank: 1,
        projectId: 1,
        name: 'Community Education & Dev Tools',
        recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        contributors: 200,
        contributionsETH: '2.0',
        quadraticScore: score1.toString(),
        matchingAllocationETH: formatEther(match1),
        totalClaimableETH: formatEther(2000000000000000000n + match1),
        claimed: false
      },
      {
        rank: 2,
        projectId: 2,
        name: 'Whale Funded Tooling',
        recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        contributors: 1,
        contributionsETH: '2.0',
        quadraticScore: score2.toString(),
        matchingAllocationETH: formatEther(match2),
        totalClaimableETH: formatEther(2000000000000000000n + match2),
        claimed: false
      }
    ];

    fs.writeFileSync(path.join(reportsDir, 'results.json'), JSON.stringify(sampleResults, null, 2));

    const csvContent = [
      'Rank,ProjectID,Name,Recipient,Contributors,ContributionsETH,QuadraticScore,MatchingAllocationETH,TotalClaimableETH,Claimed',
      ...sampleResults.map(
        (r) =>
          `${r.rank},${r.projectId},"${r.name}",${r.recipient},${r.contributors},${r.contributionsETH},${r.quadraticScore},${r.matchingAllocationETH},${r.totalClaimableETH},${r.claimed}`
      )
    ].join('\n');

    fs.writeFileSync(path.join(reportsDir, 'results.csv'), csvContent);
    console.log(`Saved sample reports to ${reportsDir}/results.csv and ${reportsDir}/results.json`);
    return;
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  });

  const projectIds = await client.readContract({
    address: contractAddress,
    abi: QUADRATIC_ROUND_ABI,
    functionName: 'getAllProjectIds'
  });

  const rows = [];
  for (const pid of projectIds) {
    const p = await client.readContract({
      address: contractAddress,
      abi: QUADRATIC_ROUND_ABI,
      functionName: 'getProject',
      args: [pid]
    });

    const claimable = await client.readContract({
      address: contractAddress,
      abi: QUADRATIC_ROUND_ABI,
      functionName: 'getProjectClaimable',
      args: [pid]
    });

    rows.push({
      projectId: Number(p.id),
      name: p.name,
      recipient: p.recipient,
      contributors: Number(p.contributorCount),
      contributionsETH: formatEther(p.totalContributions),
      quadraticScore: p.quadraticScore.toString(),
      matchingAllocationETH: formatEther(p.matchingAllocation),
      totalClaimableETH: formatEther(claimable),
      claimed: p.claimed
    });
  }

  // Sort by matching allocation descending
  rows.sort((a, b) => Number(b.matchingAllocationETH) - Number(a.matchingAllocationETH));
  const ranked = rows.map((r, i) => ({ rank: i + 1, ...r }));

  fs.writeFileSync(path.join(reportsDir, 'results.json'), JSON.stringify(ranked, null, 2));

  const csvContent = [
    'Rank,ProjectID,Name,Recipient,Contributors,ContributionsETH,QuadraticScore,MatchingAllocationETH,TotalClaimableETH,Claimed',
    ...ranked.map(
      (r) =>
        `${r.rank},${r.projectId},"${r.name}",${r.recipient},${r.contributors},${r.contributionsETH},${r.quadraticScore},${r.matchingAllocationETH},${r.totalClaimableETH},${r.claimed}`
    )
  ].join('\n');

  fs.writeFileSync(path.join(reportsDir, 'results.csv'), csvContent);
  console.log(`Successfully exported results to ${reportsDir}/results.csv and ${reportsDir}/results.json`);
}

main().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});
