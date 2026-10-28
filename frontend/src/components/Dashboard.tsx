import React from 'react';
import { formatEther } from 'viem';
import { RoundStatus, type RoundInfo, type ProjectData, CONTRACT_ADDRESS } from '../config/contract';
import { getTotalEligibleWallets } from '../config/eligibility';
import { Users, Coins, Award, Timer, ArrowRight, ShieldAlert, Sparkles, PlusCircle } from 'lucide-react';

interface DashboardProps {
  roundInfo: RoundInfo;
  projects: ProjectData[];
  onBrowseProjects: () => void;
  onOpenFundPool: () => void;
  isLiveOnchain: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  roundInfo,
  projects,
  onBrowseProjects,
  onOpenFundPool,
  isLiveOnchain
}) => {
  const getStatusBadge = (status: RoundStatus) => {
    switch (status) {
      case RoundStatus.Upcoming:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Upcoming</span>;
      case RoundStatus.Live:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">Round Live</span>;
      case RoundStatus.Ended:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Ended (Awaiting Finalization)</span>;
      case RoundStatus.Finalized:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">Finalized</span>;
    }
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === 0n) return 'N/A';
    return new Date(Number(timestamp) * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalEligible = getTotalEligibleWallets();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex items-center space-x-3">
            {getStatusBadge(roundInfo.status)}
            <span className="text-xs text-slate-500 font-medium">Road to Devcon XI Grant Round</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Two Hundred Small Backers Should Beat One Whale
          </h1>

          <p className="text-base text-slate-600 leading-relaxed">
            A production-ready quadratic funding round on Ethereum Sepolia. Quadratic funding weights
            the <strong>number of individual contributors</strong> quadratically higher than sheer capital amount:
            community consensus directs the matching pool, ensuring grassroots public goods win over concentrated wealth.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onBrowseProjects}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all focus:ring-2 focus:ring-indigo-500"
            >
              <span>Explore Registered Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenFundPool}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm border border-slate-200 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Sponsor Matching Pool</span>
            </button>
          </div>
        </div>

        {/* Background graphic decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Matching Pool</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatEther(roundInfo.matchingPool)} ETH
          </div>
          <p className="text-xs text-slate-500">Funded by community sponsors & organizers</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Direct Contributions</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatEther(roundInfo.totalContributions)} ETH
          </div>
          <p className="text-xs text-slate-500">Total contributed directly to projects</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Projects Registered</span>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {projects.length} Projects
          </div>
          <p className="text-xs text-slate-500">Grassroots Ethereum public goods</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Wallets</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {roundInfo.uniqueWalletsCount.toString()} / {totalEligible}
          </div>
          <p className="text-xs text-slate-500">Allowlisted community contributors</p>
        </div>
      </div>

      {/* Round Timeline & Mechanics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-lg">
            <Timer className="w-5 h-5 text-indigo-600" />
            <h2>Round Timeline & Operating Windows</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Round Starts</span>
              <p className="text-sm font-semibold text-slate-900 font-mono">{formatDate(roundInfo.roundStart)}</p>
              <p className="text-xs text-slate-500">Project registrations and eligibility tree lock</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Round Closes</span>
              <p className="text-sm font-semibold text-slate-900 font-mono">{formatDate(roundInfo.roundEnd)}</p>
              <p className="text-xs text-slate-500">Contribution window ends; finalization unlocks</p>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 space-y-1">
            <p>
              • <strong>Operator:</strong> <code className="font-mono text-slate-700">{roundInfo.operator}</code>
            </p>
            <p>
              • <strong>Eligibility Root:</strong> <code className="font-mono text-slate-700">{roundInfo.eligibilityRoot}</code>
            </p>
            <p>
              • <strong>Data Source:</strong> {isLiveOnchain ? 'Live onchain Sepolia contract state' : 'Verified local simulation baseline'}
            </p>
          </div>
        </div>

        {/* Sybil-Resistance & Limitations Callout */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3>Sybil-Resistance Limits</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The round employs an onchain <strong>Merkle tree allowlist</strong> representing 200 verified Road to Devcon attendees.
          </p>

          <p className="text-xs text-slate-600 leading-relaxed">
            While Merkle proofs verify that a contribution comes from an authorized wallet address, an allowlist alone cannot independently guarantee unique human identity without decentralized identity primitives (e.g. Gitcoin Passport or WorldID).
          </p>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Anti-Split Protection:</span>
            <p className="text-xs text-slate-500 mt-0.5">
              Repeated contributions from the same address to a project are automatically aggregated prior to computing square roots, preventing split-transaction gaming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
