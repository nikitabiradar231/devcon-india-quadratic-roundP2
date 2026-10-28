import { createPublicClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { QUADRATIC_ROUND_ABI } from './verify-results.js';

dotenv.config();

async function main() {
  console.log('--- Verifying QuadraticFundingRound Deployment ---');

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

  if (!contractAddress) {
    console.log('No contract address specified in VITE_CONTRACT_ADDRESS or deployments/sepolia.json.');
    console.log('Skipping remote RPC verification. (Deployment pending real Sepolia credentials).');
    return;
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  });

  console.log(`Checking bytecode at ${contractAddress}...`);
  const bytecode = await client.getBytecode({ address: contractAddress });

  if (!bytecode || bytecode === '0x') {
    throw new Error(`No contract deployed at address ${contractAddress}!`);
  }

  console.log('Bytecode confirmed on Sepolia network.');

  const [operator, start, end, isFinalized, projectCount] = await Promise.all([
    client.readContract({ address: contractAddress, abi: QUADRATIC_ROUND_ABI, functionName: 'operator' }),
    client.readContract({ address: contractAddress, abi: QUADRATIC_ROUND_ABI, functionName: 'roundStart' }),
    client.readContract({ address: contractAddress, abi: QUADRATIC_ROUND_ABI, functionName: 'roundEnd' }),
    client.readContract({ address: contractAddress, abi: QUADRATIC_ROUND_ABI, functionName: 'isFinalized' }),
    client.readContract({ address: contractAddress, abi: QUADRATIC_ROUND_ABI, functionName: 'getProjectCount' })
  ]);

  console.log('\nContract State:');
  console.log(`  Operator:       ${operator}`);
  console.log(`  Round Start:    ${new Date(Number(start) * 1000).toISOString()}`);
  console.log(`  Round End:      ${new Date(Number(end) * 1000).toISOString()}`);
  console.log(`  Is Finalized:   ${isFinalized}`);
  console.log(`  Projects Count: ${projectCount}`);
  console.log('\nDeployment verified successfully!');
}

main().catch((err) => {
  console.error('Deployment verification failed:', err);
  process.exit(1);
});
