import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  SEPOLIA_RPC_URL,
  QUADRATIC_ROUND_ABI,
  RoundStatus,
  type ProjectData,
  type RoundInfo
} from '../config/contract';

// Verified default sample projects for offline demonstration and testing
export const SAMPLE_PROJECTS: ProjectData[] = [
  {
    id: 1n,
    name: 'Community Education & Dev Tools',
    description: 'Workshops, regional meetups, and developer tooling across India onboarded by 200 small contributors.',
    recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
    registrationTimestamp: 1730000000n,
    active: true,
    claimed: false,
    totalContributions: 2000000000000000000n, // 2.0 ETH
    contributorCount: 200n,
    quadraticScore: 400000000000000000000000000000000000000n, // 4.0e38
    matchingAllocation: 9950248756218905472n, // ~9.9502 ETH
    claimable: 11950248756218905472n // 2.0 ETH + ~9.9502 ETH
  },
  {
    id: 2n,
    name: 'Whale Funded Tooling',
    description: 'Ecosystem tooling supported entirely by a single high-net-worth backer providing 2.0 ETH capital.',
    recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
    registrationTimestamp: 1730000000n,
    active: true,
    claimed: false,
    totalContributions: 2000000000000000000n, // 2.0 ETH
    contributorCount: 1n,
    quadraticScore: 1999999999999999997732481866842122304n, // ~2.0e36
    matchingAllocation: 49751243781094527n, // ~0.0498 ETH
    claimable: 2049751243781094527n // 2.0 ETH + ~0.0498 ETH
  }
];

export const SAMPLE_ROUND_INFO: RoundInfo = {
  status: RoundStatus.Live,
  operator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address,
  roundStart: 1730000000n,
  roundEnd: 1730604800n,
  matchingPool: 10000000000000000000n, // 10 ETH
  totalAllocatedMatching: 9999999999999999999n,
  totalContributions: 4000000000000000000n, // 4 ETH
  uniqueWalletsCount: 201n,
  isFinalized: false,
  eligibilityRoot: '0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d'
};

export function useRoundData() {
  const [roundInfo, setRoundInfo] = useState<RoundInfo>(SAMPLE_ROUND_INFO);
  const [projects, setProjects] = useState<ProjectData[]>(SAMPLE_PROJECTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveOnchain, setIsLiveOnchain] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnchainData = useCallback(async () => {
    if (!IS_CONTRACT_CONFIGURED) {
      setIsLiveOnchain(false);
      setRoundInfo(SAMPLE_ROUND_INFO);
      setProjects(SAMPLE_PROJECTS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = createPublicClient({
        chain: sepolia,
        transport: http(SEPOLIA_RPC_URL)
      });

      const [
        statusRaw,
        operator,
        roundStart,
        roundEnd,
        matchingPool,
        totalAllocatedMatching,
        totalContributions,
        uniqueWalletsCount,
        isFinalized,
        eligibilityRoot,
        projectIds
      ] = await Promise.all([
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'getRoundStatus' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'operator' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'roundStart' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'roundEnd' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'matchingPool' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'totalAllocatedMatching' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'totalContributionsCollected' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'uniqueWalletsCount' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'isFinalized' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'eligibilityRoot' }),
        client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'getAllProjectIds' })
      ]);

      setRoundInfo({
        status: statusRaw as RoundStatus,
        operator,
        roundStart,
        roundEnd,
        matchingPool,
        totalAllocatedMatching,
        totalContributions,
        uniqueWalletsCount,
        isFinalized,
        eligibilityRoot: eligibilityRoot as string
      });

      const loadedProjects: ProjectData[] = [];
      for (const pid of projectIds) {
        const [project, claimable] = await Promise.all([
          client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'getProject', args: [pid] }),
          client.readContract({ address: CONTRACT_ADDRESS, abi: QUADRATIC_ROUND_ABI, functionName: 'getProjectClaimable', args: [pid] })
        ]);

        loadedProjects.push({
          id: project.id,
          name: project.name,
          description: project.description,
          recipient: project.recipient,
          registrationTimestamp: project.registrationTimestamp,
          active: project.active,
          claimed: project.claimed,
          totalContributions: project.totalContributions,
          contributorCount: project.contributorCount,
          quadraticScore: project.quadraticScore,
          matchingAllocation: project.matchingAllocation,
          claimable
        });
      }

      setProjects(loadedProjects);
      setIsLiveOnchain(true);
    } catch (err: unknown) {
      console.warn('Failed to load live onchain round data, falling back to verified sample data:', err);
      setError((err as Error)?.message || 'RPC communication error');
      setIsLiveOnchain(false);
      setRoundInfo(SAMPLE_ROUND_INFO);
      setProjects(SAMPLE_PROJECTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnchainData();
  }, [fetchOnchainData]);

  return {
    roundInfo,
    projects,
    isLoading,
    isLiveOnchain,
    error,
    refetch: fetchOnchainData
  };
}
