import { type Hex, type Address, getAddress } from 'viem';
import eligibilityTree from './eligibility-tree.json';

export interface EligibilityProof {
  isEligible: boolean;
  address: Address | null;
  leaf: Hex | null;
  proof: Hex[];
  root: Hex;
}

export function checkWalletEligibility(address?: string | null): EligibilityProof {
  const root = eligibilityTree.root as Hex;

  if (!address) {
    return {
      isEligible: false,
      address: null,
      leaf: null,
      proof: [],
      root
    };
  }

  try {
    const formatted = getAddress(address).toLowerCase();
    const members = eligibilityTree.members as Record<string, { address: string; leaf: string; proof: string[] }>;
    const entry = members[formatted];

    if (!entry) {
      return {
        isEligible: false,
        address: getAddress(address),
        leaf: null,
        proof: [],
        root
      };
    }

    return {
      isEligible: true,
      address: getAddress(entry.address),
      leaf: entry.leaf as Hex,
      proof: entry.proof as Hex[],
      root
    };
  } catch {
    return {
      isEligible: false,
      address: null,
      leaf: null,
      proof: [],
      root
    };
  }
}

export function getTotalEligibleWallets(): number {
  return (eligibilityTree as { totalEligible?: number }).totalEligible || 200;
}
