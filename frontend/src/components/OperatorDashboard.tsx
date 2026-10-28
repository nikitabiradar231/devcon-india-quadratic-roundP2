import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Hex, type Address, isAddress } from 'viem';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  QUADRATIC_ROUND_ABI,
  SEPOLIA_CHAIN_ID,
  RoundStatus,
  type RoundInfo,
  getEtherscanTxUrl
} from '../config/contract';
import { Settings, ShieldCheck, ShieldAlert, PlusCircle, CheckCircle2, AlertCircle, Loader2, ExternalLink, Calendar, Lock } from 'lucide-react';

interface OperatorDashboardProps {
  roundInfo: RoundInfo;
  onRefresh: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ roundInfo, onRefresh }) => {
  const { address, isConnected, chainId } = useAccount();

  // Registration form state
  const [projId, setProjId] = useState<string>('3');
  const [projName, setProjName] = useState<string>('');
  const [projDesc, setProjDesc] = useState<string>('');
  const [projRecipient, setProjRecipient] = useState<string>('');
  const [regError, setRegError] = useState<string | null>(null);

  // Root update state
  const [newRoot, setNewRoot] = useState<string>('');
  const [rootError, setRootError] = useState<string | null>(null);

  // Finalize state
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const {
    data: txHash,
    isPending: isSubmitting,
    error: submitError,
    writeContractAsync,
    reset: resetWrite
  } = useWriteContract();

  const { isLoading: isWaitingForReceipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash
  });

  const isOperator =
    isConnected &&
    address &&
    roundInfo.operator &&
    address.toLowerCase() === roundInfo.operator.toLowerCase();

  const isBeforeStart = roundInfo.status === RoundStatus.Upcoming;
  const isAfterEnd = roundInfo.status === RoundStatus.Ended;
  const isFinalized = roundInfo.status === RoundStatus.Finalized;

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!isOperator) {
      setRegError('Only the round operator address can register new projects.');
      return;
    }
    if (!isBeforeStart) {
      setRegError('Project registration is closed because the round has already started.');
      return;
    }
    if (!isAddress(projRecipient)) {
      setRegError('Please provide a valid Ethereum recipient address.');
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      setRegError('Contract address is not configured.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'registerProject',
        args: [BigInt(projId), projName, projDesc, projRecipient as Address]
      });
      onRefresh();
    } catch (err: unknown) {
      console.error('Registration failed:', err);
    }
  };

  const handleUpdateRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setRootError(null);

    if (!isOperator) {
      setRootError('Only the operator can update the eligibility Merkle root.');
      return;
    }
    if (!isBeforeStart) {
      setRootError('Eligibility root updates are locked after round start.');
      return;
    }
    if (!newRoot.startsWith('0x') || newRoot.length !== 66) {
      setRootError('Root must be a valid 32-byte hex string (0x... 66 chars).');
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      setRootError('Contract address is not configured.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'setEligibilityRoot',
        args: [newRoot as Hex]
      });
      onRefresh();
    } catch (err: unknown) {
      console.error('Root update failed:', err);
    }
  };

  const handleFinalize = async () => {
    setFinalizeError(null);

    if (!isAfterEnd) {
      setFinalizeError('Round has not ended yet. Finalization unlocks only after roundEnd timestamp.');
      return;
    }
    if (isFinalized) {
      setFinalizeError('Round is already finalized.');
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      setFinalizeError('Contract address is not configured.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'finalize'
      });
      onRefresh();
    } catch (err: unknown) {
      console.error('Finalization failed:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Operator Header & Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Operator & Admin Dashboard</h2>
              <p className="text-xs text-slate-500 font-mono">Operator: {roundInfo.operator}</p>
            </div>
          </div>

          <div>
            {isOperator ? (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" />
                <span>Authorized Operator Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldAlert className="w-4 h-4" />
                <span>Read-Only (Non-Operator Wallet)</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Feedback */}
        {(submitError || isConfirmed) && (
          <div className="pt-2">
            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError.message}</span>
              </div>
            )}
            {isConfirmed && txHash && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Transaction Confirmed!</span>
                </div>
                <a
                  href={getEtherscanTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline inline-flex items-center space-x-1"
                >
                  <span>Etherscan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Registration (Only before round start) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Register New Project</h3>
            {isBeforeStart ? (
              <span className="text-xs text-emerald-600 font-semibold">Registration Open</span>
            ) : (
              <span className="text-xs text-slate-400 font-medium inline-flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Locked (Round Started)</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Operator-exclusive project registration. The contract prevents new project registration once the round start timestamp arrives.
          </p>

          <form onSubmit={handleRegisterProject} className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Project ID</label>
                <input
                  type="number"
                  value={projId}
                  onChange={(e) => setProjId(e.target.value)}
                  disabled={!isBeforeStart || !isOperator}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono disabled:bg-slate-100"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ethereum India Tooling"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  disabled={!isBeforeStart || !isOperator}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs disabled:bg-slate-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                placeholder="Brief mission and roadmap..."
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                disabled={!isBeforeStart || !isOperator}
                rows={2}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs disabled:bg-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={projRecipient}
                onChange={(e) => setProjRecipient(e.target.value)}
                disabled={!isBeforeStart || !isOperator}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono disabled:bg-slate-100"
                required
              />
            </div>

            {regError && <p className="text-xs text-rose-600 font-medium">{regError}</p>}

            <button
              type="submit"
              disabled={!isBeforeStart || !isOperator || isSubmitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"
            >
              Register Project onchain
            </button>
          </form>
        </div>

        {/* Finalization & Eligibility Configuration */}
        <div className="space-y-6">
          {/* Finalization Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Finalize Quadratic Round</h3>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isFinalized
                    ? 'bg-purple-100 text-purple-800'
                    : isAfterEnd
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isFinalized ? 'Already Finalized' : isAfterEnd ? 'Ready to Finalize' : 'Awaiting Round End'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Finalization computes the square root of each unique contributor's aggregate contribution, calculates the quadratic scores, and deterministically allocates matching pool payouts.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Quadratic Score:</span>
                <span className="font-mono font-bold text-slate-900">
                  {roundInfo.totalAllocatedMatching > 0n ? 'Computed' : '0 (Pending)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Allocated Matching:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Number(roundInfo.totalAllocatedMatching) > 0 ? 'Allocated' : '0 ETH'}
                </span>
              </div>
            </div>

            {finalizeError && <p className="text-xs text-rose-600 font-medium">{finalizeError}</p>}

            <button
              type="button"
              onClick={handleFinalize}
              disabled={!isAfterEnd || isFinalized || isSubmitting}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400 shadow-sm"
            >
              {isFinalized ? 'Round Finalized' : 'Execute Finalization onchain'}
            </button>
          </div>

          {/* Eligibility Root Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Update Eligibility Merkle Root</h3>
            <p className="text-xs text-slate-500">
              Current root: <code className="font-mono text-slate-700 text-[11px] break-all">{roundInfo.eligibilityRoot}</code>
            </p>

            <form onSubmit={handleUpdateRoot} className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="0x..."
                value={newRoot}
                onChange={(e) => setNewRoot(e.target.value)}
                disabled={!isBeforeStart || !isOperator}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono disabled:bg-slate-100"
              />
              {rootError && <p className="text-xs text-rose-600 font-medium">{rootError}</p>}

              <button
                type="submit"
                disabled={!isBeforeStart || !isOperator || isSubmitting}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400"
              >
                Commit New Merkle Root
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
