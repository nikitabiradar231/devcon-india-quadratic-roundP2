import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ProjectsList } from './components/ProjectsList';
import { ResultsView } from './components/ResultsView';
import { OperatorDashboard } from './components/OperatorDashboard';
import { MethodologyView } from './components/MethodologyView';
import { ContributeModal } from './components/ContributeModal';
import { MatchingPoolModal } from './components/MatchingPoolModal';
import { ClaimModal } from './components/ClaimModal';
import { useRoundData } from './hooks/useRoundData';
import { type ProjectData } from './config/contract';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContributeProject, setSelectedContributeProject] = useState<ProjectData | null>(null);
  const [selectedClaimProject, setSelectedClaimProject] = useState<ProjectData | null>(null);
  const [isFundPoolOpen, setIsFundPoolOpen] = useState<boolean>(false);

  const { address } = useAccount();
  const { roundInfo, projects, isLoading, isLiveOnchain, refetch } = useRoundData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLiveOnchain={isLiveOnchain}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading round status and projects...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                roundInfo={roundInfo}
                projects={projects}
                onBrowseProjects={() => setActiveTab('projects')}
                onOpenFundPool={() => setIsFundPoolOpen(true)}
                isLiveOnchain={isLiveOnchain}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsList
                projects={projects}
                roundStatus={roundInfo.status}
                onSelectProjectForContribution={(proj) => setSelectedContributeProject(proj)}
                onSelectProjectForClaim={(proj) => setSelectedClaimProject(proj)}
                userAddress={address}
              />
            )}

            {activeTab === 'results' && (
              <ResultsView
                roundInfo={roundInfo}
                projects={projects}
                isLiveOnchain={isLiveOnchain}
              />
            )}

            {activeTab === 'operator' && (
              <OperatorDashboard
                roundInfo={roundInfo}
                onRefresh={refetch}
              />
            )}

            {activeTab === 'methodology' && (
              <MethodologyView />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            &copy; {new Date().getFullYear()} Road to Devcon XI Grant Round &bull; Two Hundred Small Backers Beat One Whale
          </p>
          <div className="flex items-center space-x-4">
            <button onClick={() => setActiveTab('methodology')} className="hover:underline">Methodology</button>
            <button onClick={() => setActiveTab('results')} className="hover:underline">Results & Audit</button>
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Sepolia Etherscan
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedContributeProject && (
        <ContributeModal
          project={selectedContributeProject}
          roundStatus={roundInfo.status}
          onClose={() => setSelectedContributeProject(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {isFundPoolOpen && (
        <MatchingPoolModal
          currentPoolWei={roundInfo.matchingPool}
          roundStatus={roundInfo.status}
          onClose={() => setIsFundPoolOpen(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {selectedClaimProject && (
        <ClaimModal
          project={selectedClaimProject}
          onClose={() => setSelectedClaimProject(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default App;
