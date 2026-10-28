import React, { useState } from 'react';
import { formatEther } from 'viem';
import { type ProjectData, RoundStatus, getEtherscanAddressUrl } from '../config/contract';
import { Award, Users, Coins, ExternalLink, ChevronDown, ChevronUp, HeartHandshake, CheckCircle2, Lock } from 'lucide-react';

interface ProjectsListProps {
  projects: ProjectData[];
  roundStatus: RoundStatus;
  onSelectProjectForContribution: (project: ProjectData) => void;
  onSelectProjectForClaim: (project: ProjectData) => void;
  userAddress?: string;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  roundStatus,
  onSelectProjectForContribution,
  onSelectProjectForClaim,
  userAddress
}) => {
  const [expandedProjectId, setExpandedProjectId] = useState<bigint | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (id: bigint) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registered Projects</h2>
          <p className="text-sm text-slate-500">Discover and support grassroots public goods in the Road to Devcon round</p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search projects or recipients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No Projects Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'No projects matched your search criteria.' : 'No projects have been registered for this round yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const isRecipient = userAddress && project.recipient.toLowerCase() === userAddress.toLowerCase();
            const canContribute = roundStatus === RoundStatus.Live;

            return (
              <div
                key={project.id.toString()}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
              >
                {/* Project Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          #{project.id.toString()}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        Recipient:{' '}
                        <a
                          href={getEtherscanAddressUrl(project.recipient)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-indigo-600 hover:underline inline-flex items-center space-x-1"
                        >
                          <span>{shortenAddress(project.recipient)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>

                    {project.claimed && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Direct Backing</span>
                    <p className="font-bold text-slate-900 font-mono mt-0.5">
                      {formatEther(project.totalContributions)} ETH
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Contributors</span>
                    <p className="font-bold text-slate-900 font-mono mt-0.5">
                      {project.contributorCount.toString()}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-medium">Matching Payout</span>
                    <p className="font-bold text-indigo-600 font-mono mt-0.5">
                      {project.matchingAllocation > 0n
                        ? `${Number(formatEther(project.matchingAllocation)).toFixed(4)} ETH`
                        : roundStatus === RoundStatus.Finalized
                        ? '0 ETH'
                        : 'Pending Finalization'}
                    </p>
                  </div>
                </div>

                {/* Expandable Breakdown */}
                {isExpanded && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Quadratic Score:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {project.quadraticScore > 0n ? project.quadraticScore.toString() : 'Calculated at finalization'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Total Claimable:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatEther(project.claimable)} ETH
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Withdrawal Status:</span>
                      <span className={`font-semibold ${project.claimed ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {project.claimed ? 'Claimed onchain' : roundStatus === RoundStatus.Finalized ? 'Available to claim' : 'Locked until round end'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => toggleExpand(project.id)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <span>{isExpanded ? 'Less Details' : 'View Formula Details'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Recipient Claim Action */}
                    {isRecipient && roundStatus === RoundStatus.Finalized && !project.claimed && (
                      <button
                        onClick={() => onSelectProjectForClaim(project)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        Claim Funds
                      </button>
                    )}

                    {/* Community Contribute Action */}
                    <button
                      onClick={() => onSelectProjectForContribution(project)}
                      disabled={!canContribute}
                      className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                        canContribute
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      {canContribute ? (
                        <>
                          <HeartHandshake className="w-4 h-4" />
                          <span>Contribute</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{roundStatus === RoundStatus.Upcoming ? 'Round Not Started' : 'Round Closed'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
