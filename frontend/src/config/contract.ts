import { type Address } from 'viem';

export const SEPOLIA_CHAIN_ID = 11155111;

// Authorized Contract Address: fallback to environment or leave empty for unconfigured state
export const CONTRACT_ADDRESS: Address = (import.meta.env.VITE_CONTRACT_ADDRESS as Address) ||
  '0x0000000000000000000000000000000000000000';

export const IS_CONTRACT_CONFIGURED =
  CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
  CONTRACT_ADDRESS.length === 42;

export const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

export const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io';

export function getEtherscanTxUrl(txHash: string): string {
  return `${ETHERSCAN_BASE_URL}/tx/${txHash}`;
}

export function getEtherscanAddressUrl(address: string): string {
  return `${ETHERSCAN_BASE_URL}/address/${address}`;
}

export enum RoundStatus {
  Upcoming = 0,
  Live = 1,
  Ended = 2,
  Finalized = 3
}

export interface ProjectData {
  id: bigint;
  name: string;
  description: string;
  recipient: Address;
  registrationTimestamp: bigint;
  active: boolean;
  claimed: boolean;
  totalContributions: bigint;
  contributorCount: bigint;
  quadraticScore: bigint;
  matchingAllocation: bigint;
  claimable: bigint;
}

export interface RoundInfo {
  status: RoundStatus;
  operator: Address;
  roundStart: bigint;
  roundEnd: bigint;
  matchingPool: bigint;
  totalAllocatedMatching: bigint;
  totalContributions: bigint;
  uniqueWalletsCount: bigint;
  isFinalized: boolean;
  eligibilityRoot: string;
}

export const QUADRATIC_ROUND_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_operator', type: 'address' },
      { name: '_roundStart', type: 'uint256' },
      { name: '_roundEnd', type: 'uint256' },
      { name: '_eligibilityRoot', type: 'bytes32' }
    ],
    stateMutability: 'payable'
  },
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
    name: 'eligibilityRoot',
    inputs: [],
    outputs: [{ type: 'bytes32' }],
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
    name: 'totalContributionsCollected',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'uniqueWalletsCount',
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
    name: 'getRoundStatus',
    inputs: [],
    outputs: [{ type: 'uint8' }],
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
    name: 'getProjectClaimable',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
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
    name: 'isEligible',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'proof', type: 'bytes32[]' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'contribute',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'merkleProof', type: 'bytes32[]' }
    ],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'fundMatchingPool',
    inputs: [],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'registerProject',
    inputs: [
      { name: 'projectId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'recipient', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setEligibilityRoot',
    inputs: [{ name: 'newRoot', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'finalize',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'claimProjectFunds',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;
