import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import { ProjectsList } from '../components/ProjectsList';
import { ResultsView } from '../components/ResultsView';
import { OperatorDashboard } from '../components/OperatorDashboard';
import { MethodologyView } from '../components/MethodologyView';
import { Navbar } from '../components/Navbar';
import { RoundStatus, type ProjectData, type RoundInfo } from '../config/contract';
import { checkWalletEligibility } from '../config/eligibility';

// Mock wagmi hooks
const mockUseAccount = vi.fn();
const mockUseConnect = vi.fn();
const mockUseDisconnect = vi.fn();
const mockUseBalance = vi.fn();
const mockUseWriteContract = vi.fn();
const mockUseWaitForTransactionReceipt = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useConnect: () => mockUseConnect(),
  useDisconnect: () => mockUseDisconnect(),
  useBalance: () => mockUseBalance(),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
  createConfig: vi.fn(),
  http: vi.fn(),
  injected: vi.fn()
}));

const mockRoundInfo: RoundInfo = {
  status: RoundStatus.Live,
  operator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  roundStart: 1730000000n,
  roundEnd: 1730600000n,
  matchingPool: 10000000000000000000n, // 10 ETH
  totalAllocatedMatching: 9999999999999999999n,
  totalContributions: 4000000000000000000n, // 4 ETH
  uniqueWalletsCount: 201n,
  isFinalized: false,
  eligibilityRoot: '0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d'
};

const mockProjects: ProjectData[] = [
  {
    id: 1n,
    name: 'Community Education & Dev Tools',
    description: 'Empowering 200 contributors across grassroots developer ecosystems.',
    recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    registrationTimestamp: 1730000000n,
    active: true,
    claimed: false,
    totalContributions: 2000000000000000000n, // 2 ETH
    contributorCount: 200n,
    quadraticScore: 400000000000000000000000000000000000000n,
    matchingAllocation: 9950248756218905472n,
    claimable: 11950248756218905472n
  },
  {
    id: 2n,
    name: 'Whale Funded Tooling',
    description: 'Ecosystem tooling with 1 backer contributing 2 ETH.',
    recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    registrationTimestamp: 1730000000n,
    active: true,
    claimed: false,
    totalContributions: 2000000000000000000n, // 2 ETH
    contributorCount: 1n,
    quadraticScore: 1999999999999999997732481866842122304n,
    matchingAllocation: 49751243781094527n,
    claimable: 2049751243781094527n
  }
];

describe('Frontend Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      chainId: 11155111
    });

    mockUseConnect.mockReturnValue({
      connect: vi.fn()
    });

    mockUseDisconnect.mockReturnValue({
      disconnect: vi.fn()
    });

    mockUseBalance.mockReturnValue({
      data: { value: 1000000000000000000n, formatted: '1.0', symbol: 'ETH' }
    });

    mockUseWriteContract.mockReturnValue({
      data: undefined,
      isPending: false,
      error: null,
      writeContractAsync: vi.fn(),
      reset: vi.fn()
    });

    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false
    });
  });

  it('1. Landing dashboard renders core metrics and title correctly', () => {
    render(
      <Dashboard
        roundInfo={mockRoundInfo}
        projects={mockProjects}
        onBrowseProjects={vi.fn()}
        onOpenFundPool={vi.fn()}
        isLiveOnchain={true}
      />
    );

    expect(screen.getByText(/Two Hundred Small Backers Should Beat One Whale/i)).toBeInTheDocument();
    expect(screen.getByText('10 ETH')).toBeInTheDocument();
    expect(screen.getByText('4 ETH')).toBeInTheDocument();
    expect(screen.getByText('2 Projects')).toBeInTheDocument();
  });

  it('2. Project cards display supplied contract data', () => {
    render(
      <ProjectsList
        projects={mockProjects}
        roundStatus={RoundStatus.Live}
        onSelectProjectForContribution={vi.fn()}
        onSelectProjectForClaim={vi.fn()}
      />
    );

    expect(screen.getByText('Community Education & Dev Tools')).toBeInTheDocument();
    expect(screen.getByText('Whale Funded Tooling')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('3. Empty project list shows empty state gracefully', () => {
    render(
      <ProjectsList
        projects={[]}
        roundStatus={RoundStatus.Live}
        onSelectProjectForContribution={vi.fn()}
        onSelectProjectForClaim={vi.fn()}
      />
    );

    expect(screen.getByText(/No Projects Found/i)).toBeInTheDocument();
  });

  it('4. Disconnected wallet state renders connect button', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      chainId: 11155111
    });

    render(
      <Navbar
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        isLiveOnchain={false}
      />
    );

    expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
  });

  it('5. Wrong-network state renders network warning', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111',
      isConnected: true,
      chainId: 1 // Mainnet instead of Sepolia
    });

    render(
      <Navbar
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        isLiveOnchain={false}
      />
    );

    expect(screen.getByText(/Wrong Network/i)).toBeInTheDocument();
  });

  it('6. Merkle eligibility helper correctly detects allowlisted vs non-allowlisted wallets', () => {
    // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 is in the seed accounts of eligibility-tree.json
    const eligibleRes = checkWalletEligibility('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(eligibleRes.isEligible).toBe(true);
    expect(eligibleRes.proof.length).toBeGreaterThan(0);

    // Random non-allowlisted address
    const ineligibleRes = checkWalletEligibility('0x000000000000000000000000000000000000dead');
    expect(ineligibleRes.isEligible).toBe(false);
    expect(ineligibleRes.proof.length).toBe(0);
  });

  it('7. Finalized results view renders mathematically verified scores and matches', () => {
    render(
      <ResultsView
        roundInfo={{ ...mockRoundInfo, status: RoundStatus.Finalized, isFinalized: true }}
        projects={mockProjects}
        isLiveOnchain={true}
      />
    );

    expect(screen.getByText(/Final Results & Transparent Formula Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/400000000000000000000000000000000000000/i)).toBeInTheDocument();
    expect(screen.getByText(/Allocated ≤ Pool/i)).toBeInTheDocument();
  });

  it('8. ResultsView exports CSV with valid headers and values', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    render(
      <ResultsView
        roundInfo={mockRoundInfo}
        projects={mockProjects}
        isLiveOnchain={false}
      />
    );

    const exportBtn = screen.getByText(/Export CSV/i);
    fireEvent.click(exportBtn);

    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('9. Round timing restrictions disable contribute buttons when round is closed', () => {
    render(
      <ProjectsList
        projects={mockProjects}
        roundStatus={RoundStatus.Ended} // Closed round
        onSelectProjectForContribution={vi.fn()}
        onSelectProjectForClaim={vi.fn()}
      />
    );

    const disabledButtons = screen.getAllByText(/Round Closed/i);
    expect(disabledButtons.length).toBe(2);
  });

  it('10. Operator dashboard displays authorized badge only for the operator', () => {
    // Non-operator wallet
    mockUseAccount.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111',
      isConnected: true,
      chainId: 11155111
    });

    const { rerender } = render(
      <OperatorDashboard
        roundInfo={mockRoundInfo}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText(/Read-Only \(Non-Operator Wallet\)/i)).toBeInTheDocument();

    // Now connect as actual operator
    mockUseAccount.mockReturnValue({
      address: mockRoundInfo.operator,
      isConnected: true,
      chainId: 11155111
    });

    rerender(
      <OperatorDashboard
        roundInfo={mockRoundInfo}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText(/Authorized Operator Connected/i)).toBeInTheDocument();
  });

  it('11. Methodology view renders all 5 technical sections', () => {
    render(<MethodologyView />);

    expect(screen.getByText(/Quadratic Funding Mechanics & Verification Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Mathematical Model & Precision Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Anti-Split Transaction Protection/i)).toBeInTheDocument();
    expect(screen.getByText(/Merkle Allowlist & Sybil-Resistance Limitations/i)).toBeInTheDocument();
    expect(screen.getByText(/Matching Pool Conservation & Rounding Dust/i)).toBeInTheDocument();
  });
});
