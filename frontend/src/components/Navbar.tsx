import React from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { formatEther } from 'viem';
import { SEPOLIA_CHAIN_ID, CONTRACT_ADDRESS, IS_CONTRACT_CONFIGURED, getEtherscanAddressUrl } from '../config/contract';
import { checkWalletEligibility } from '../config/eligibility';
import { ShieldCheck, ShieldAlert, Wallet, ExternalLink, AlertTriangle, Layers } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLiveOnchain: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isLiveOnchain }) => {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;
  const eligibility = checkWalletEligibility(address);

  const shortenAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">Road to Devcon</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  QF Round
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">200 Small Backers Beat One Whale</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'projects', label: 'Projects' },
              { id: 'results', label: 'Final Results & Audit' },
              { id: 'operator', label: 'Operator' },
              { id: 'methodology', label: 'Methodology' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Header: Badges & Wallet */}
          <div className="flex items-center space-x-3">
            {/* Network / Onchain Status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-50 border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isLiveOnchain ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isLiveOnchain ? 'Sepolia Live' : 'Simulated Baseline'}</span>
            </div>

            {/* Wallet Connect */}
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {isWrongNetwork ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Wrong Network (Switch to Sepolia)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-3">
                    {/* Eligibility Badge */}
                    {eligibility.isEligible ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Eligible</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Non-Allowlist</span>
                      </span>
                    )}

                    {/* Address & Balance */}
                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-slate-900">
                        {shortenAddress(address)}
                      </div>
                      {balanceData && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {Number(formatEther(balanceData.value)).toFixed(3)} ETH
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => disconnect()}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                      title="Disconnect Wallet"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-100">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'projects', label: 'Projects' },
            { id: 'results', label: 'Results' },
            { id: 'operator', label: 'Operator' },
            { id: 'methodology', label: 'Methodology' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contract Notification Banner if unconfigured */}
      {!IS_CONTRACT_CONFIGURED && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800">
          <span className="font-semibold">Notice:</span> Running with verified local/simulated testnet data. To bind to a live deployment, set{' '}
          <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">VITE_CONTRACT_ADDRESS</code> in your environment.
        </div>
      )}
    </header>
  );
};
