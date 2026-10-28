import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  isAddress,
  type Address,
  type Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

interface ProjectConfig {
  id: bigint;
  name: string;
  description: string;
  recipient: Address;
}

async function main() {
  const isConfirmed = process.argv.includes('--confirm-broadcast');

  console.log('================================================================');
  console.log('   DEPLOYMENT & SEQUENTIAL REGISTRATION ORCHESTRATOR');
  console.log('   Project: Two Hundred Small Backers Should Beat One Whale');
  console.log('   Network: Ethereum Sepolia (Chain ID: 11155111)');
  console.log('================================================================\n');

  if (!isConfirmed) {
    console.log('⚠️  DRY-RUN / SIMULATION MODE ACTIVE');
    console.log('    No onchain transactions will be broadcast.');
    console.log('    To execute actual deployment, pass flag: --confirm-broadcast\n');
  } else {
    console.log('🚨 LIVE BROADCAST MODE: TRANSACTIONS WILL BE SENT TO SEPOLIA!\n');
  }

  // 1. Validate Environment & Private Key
  const rawKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!rawKey || rawKey.trim() === '') {
    throw new Error('DEPLOYER_PRIVATE_KEY is missing or empty in .env');
  }
  const formattedKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hash;
  const account = privateKeyToAccount(formattedKey);
  const deployerAddress = account.address;

  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl)
  });

  // 2. Pre-flight Checks
  const [chainId, balance, latestBlock] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBalance({ address: deployerAddress }),
    publicClient.getBlock({ blockTag: 'latest' })
  ]);

  if (chainId !== 11155111) {
    throw new Error(`Invalid Chain ID: ${chainId}. Expected 11155111 (Sepolia).`);
  }

  console.log('Pre-flight Network Status:');
  console.log(`  Deployer Address:   ${deployerAddress}`);
  console.log(`  Deployer Balance:   ${formatEther(balance)} ETH`);
  console.log(`  Latest Block:       ${latestBlock.number}`);
  console.log(`  Block Gas Limit:    ${latestBlock.gasLimit.toString()}`);
  console.log(`  Current Timestamp:  ${latestBlock.timestamp} (${new Date(Number(latestBlock.timestamp) * 1000).toISOString()})\n`);

  if (balance < parseEther('0.05')) {
    throw new Error(`Insufficient deployer balance: ${formatEther(balance)} ETH. Minimum 0.05 ETH required.`);
  }

  // 3. Timing Configuration
  const operatorAddress = (process.env.OPERATOR_ADDRESS as Address) || deployerAddress;
  const bufferSeconds = 7200n; // 2 hours
  const durationSeconds = 604800n; // 7 days

  const roundStart = process.env.ROUND_START
    ? BigInt(process.env.ROUND_START)
    : latestBlock.timestamp + bufferSeconds;

  const roundEnd = process.env.ROUND_END
    ? BigInt(process.env.ROUND_END)
    : roundStart + durationSeconds;

  if (roundStart <= latestBlock.timestamp + 3600n) {
    throw new Error(
      `Proposed roundStart (${roundStart}) provides less than 1 hour buffer from current block timestamp (${latestBlock.timestamp}).`
    );
  }
  if (roundEnd <= roundStart) {
    throw new Error(`Proposed roundEnd (${roundEnd}) must be greater than roundStart (${roundStart}).`);
  }

  const eligibilityRoot = (process.env.ELIGIBILITY_ROOT as Hash) ||
    '0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d';

  console.log('Round Configuration:');
  console.log(`  Operator Address:   ${operatorAddress}`);
  console.log(`  Round Start:        ${roundStart} (${new Date(Number(roundStart) * 1000).toISOString()})`);
  console.log(`  Round End:          ${roundEnd} (${new Date(Number(roundEnd) * 1000).toISOString()})`);
  console.log(`  Registration Window: ${Number(roundStart - latestBlock.timestamp) / 3600} hours remaining`);
  console.log(`  Eligibility Root:   ${eligibilityRoot}`);
  console.log(`  Initial Matching:   0 ETH (strictly unfunded initially)\n`);

  // 4. Recipient Configuration
  const allowDemo = process.env.ALLOW_DEMO_RECIPIENTS === 'true';
  const rec1 = process.env.PROJECT_1_RECIPIENT as Address | undefined;
  const rec2 = process.env.PROJECT_2_RECIPIENT as Address | undefined;
  const rec3 = process.env.PROJECT_3_RECIPIENT as Address | undefined;
  const rec4 = process.env.PROJECT_4_RECIPIENT as Address | undefined;

  const projects: ProjectConfig[] = [
    {
      id: 1n,
      name: 'Community Education & Dev Tools',
      description: 'Grassroots educational workshops, regional meetups, and developer tooling across India',
      recipient: rec1 || (allowDemo ? operatorAddress : ('0x0' as Address))
    },
    {
      id: 2n,
      name: 'Whale Funded Tooling',
      description: 'Ethereum infrastructure tooling backed by concentrated capital',
      recipient: rec2 || (allowDemo ? operatorAddress : ('0x0' as Address))
    },
    {
      id: 3n,
      name: 'ZK Privacy Tools',
      description: 'Open-source zero-knowledge circuits for private identity and voting',
      recipient: rec3 || (allowDemo ? operatorAddress : ('0x0' as Address))
    },
    {
      id: 4n,
      name: 'Decentralized RPC Gateway',
      description: 'Peer-to-peer resilient fallback network for censorship-resistant RPC access',
      recipient: rec4 || (allowDemo ? operatorAddress : ('0x0' as Address))
    }
  ];

  console.log('Draft Project Recipients:');
  const recipientSet = new Set<string>();

  for (const p of projects) {
    if (!p.recipient || !isAddress(p.recipient) || p.recipient.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      throw new Error(
        `Project ${p.id} (${p.name}) recipient is invalid, malformed, or unconfigured! Set valid 42-character PROJECT_${p.id}_RECIPIENT or ALLOW_DEMO_RECIPIENTS=true.`
      );
    }

    const isOperator = p.recipient.toLowerCase() === operatorAddress.toLowerCase();
    if (!allowDemo) {
      if (isOperator) {
        throw new Error(
          `Project ${p.id} (${p.name}) recipient cannot be the operator address in production mode. Provide a distinct team recipient address or set ALLOW_DEMO_RECIPIENTS=true.`
        );
      }
      const lower = p.recipient.toLowerCase();
      if (recipientSet.has(lower)) {
        throw new Error(
          `Duplicate recipient address detected: ${p.recipient} assigned to multiple projects! In production mode, each project must have a distinct recipient.`
        );
      }
      recipientSet.add(lower);
    }

    console.log(`  [Project ${p.id}] "${p.name}"`);
    console.log(`    Recipient: ${p.recipient} ${isOperator ? '(DEMO-ONLY: Operator Staging Wallet)' : '(Distinct Team Address)'}`);
  }
  console.log('');

  // 5. Load Compiled Contract Artifact
  const artifactPath = path.resolve(process.cwd(), 'out', 'QuadraticFundingRound.sol', 'QuadraticFundingRound.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Compiled artifact not found at ${artifactPath}. Run 'forge build' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode.object as `0x${string}`;
  const abi = artifact.abi;

  if (!isConfirmed) {
    console.log('✅ DRY-RUN PRE-FLIGHT CHECKS PASSED.');
    console.log('   All prerequisites, timing calculations, and recipient checks are valid.');
    console.log('   To broadcast this deployment, run:');
    console.log('   npx tsx scripts/deploy-and-register.ts --confirm-broadcast\n');
    return;
  }

  // --- EXECUTION PHASE (Only with --confirm-broadcast) ---

  console.log('🚀 Step 1: Deploying QuadraticFundingRound contract...');
  const deployTxHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [operatorAddress, roundStart, roundEnd, eligibilityRoot],
    gas: 15500000n // Safe gas limit with margin over measured 13.83M
  });
  console.log(`   Deployment Tx Hash: ${deployTxHash}`);
  console.log('   Waiting for transaction confirmation...');

  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  if (deployReceipt.status !== 'success' || !deployReceipt.contractAddress) {
    throw new Error(`Deployment transaction failed! Status: ${deployReceipt.status}`);
  }

  const contractAddress = deployReceipt.contractAddress;
  console.log(`✅ Contract deployed successfully at: ${contractAddress}`);
  console.log(`   Block: ${deployReceipt.blockNumber}, Gas Used: ${deployReceipt.gasUsed}\n`);

  // Verify onchain state before proceeding
  const deployedCode = await publicClient.getBytecode({ address: contractAddress });
  if (!deployedCode || deployedCode === '0x') {
    throw new Error('Verification failed: No bytecode at deployed contract address!');
  }

  const deployedOperator = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'operator'
  });
  if ((deployedOperator as string).toLowerCase() !== operatorAddress.toLowerCase()) {
    throw new Error(`Operator mismatch on deployed contract: ${deployedOperator} vs ${operatorAddress}`);
  }

  // Step 2: Sequential Project Registrations
  console.log('🚀 Step 2: Registering 4 projects sequentially...');
  for (const p of projects) {
    const curBlock = await publicClient.getBlock({ blockTag: 'latest' });
    if (curBlock.timestamp >= roundStart) {
      throw new Error(`Registration window elapsed! Current: ${curBlock.timestamp}, roundStart: ${roundStart}`);
    }

    console.log(`   Registering Project ${p.id}: "${p.name}" -> Recipient: ${p.recipient}...`);
    const regTxHash = await walletClient.writeContract({
      address: contractAddress,
      abi,
      functionName: 'registerProject',
      args: [p.id, p.name, p.description, p.recipient]
    });
    console.log(`     Tx Hash: ${regTxHash}`);

    const regReceipt = await publicClient.waitForTransactionReceipt({ hash: regTxHash });
    if (regReceipt.status !== 'success') {
      throw new Error(`Registration failed for Project ${p.id}! Halting deployment process.`);
    }

    // Fresh onchain read to confirm registration
    const registeredProject = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'getProject',
      args: [p.id]
    }) as any;

    if (registeredProject.name !== p.name || registeredProject.recipient.toLowerCase() !== p.recipient.toLowerCase()) {
      throw new Error(`Onchain verification failed for Project ${p.id}!`);
    }
    console.log(`     Verified onchain: Project ${p.id} active with recipient ${registeredProject.recipient}\n`);
  }

  const finalProjectCount = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectCount'
  });
  console.log(`✅ All 4 projects registered successfully! Total project count: ${finalProjectCount}\n`);

  // Step 3: Archive Existing Deployment & Update Records
  console.log('🚀 Step 3: Archiving previous deployment and writing new deployment record...');
  const deploymentsDir = path.resolve(process.cwd(), 'deployments');
  const activeRecordFile = path.join(deploymentsDir, 'sepolia.json');
  const archiveRecordFile = path.join(deploymentsDir, 'sepolia-v1-archive.json');

  if (fs.existsSync(activeRecordFile) && !fs.existsSync(archiveRecordFile)) {
    fs.copyFileSync(activeRecordFile, archiveRecordFile);
    console.log(`   Archived old deployment record to: ${archiveRecordFile}`);
  }

  const newDeploymentRecord = {
    network: 'sepolia',
    chainId: 11155111,
    contractAddress,
    deploymentTxHash,
    deploymentBlock: Number(deployReceipt.blockNumber),
    deployerAddress,
    operatorAddress,
    deploymentTimestamp: Number(deployReceipt.blockNumber),
    roundStart: Number(roundStart),
    roundEnd: Number(roundEnd),
    projectCount: 4,
    demoModeActive: allowDemo,
    sourceVerificationStatus: 'deployed',
    explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`
  };

  fs.writeFileSync(activeRecordFile, JSON.stringify(newDeploymentRecord, null, 2));
  console.log(`   Updated active deployment record: ${activeRecordFile}`);

  // Step 4: Update Frontend Configuration
  const frontendEnvFile = path.resolve(process.cwd(), 'frontend', '.env');
  if (fs.existsSync(frontendEnvFile)) {
    let fContent = fs.readFileSync(frontendEnvFile, 'utf8');
    fContent = fContent.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${contractAddress}`);
    fs.writeFileSync(frontendEnvFile, fContent);
    console.log(`   Updated frontend/.env with new contract address: ${contractAddress}`);
  }

  console.log('\n================================================================');
  console.log('   DEPLOYMENT & PROJECT REGISTRATION COMPLETED SUCCESSFULLY!');
  console.log(`   New Contract: ${contractAddress}`);
  console.log(`   Explorer:     https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Execution halted with error:', err.message || err);
  process.exit(1);
});
