import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  QUADRATIC_ROUND_ABI,
  SEPOLIA_CHAIN_ID,
  type ProjectData,
  getEtherscanTxUrl
} from '../config/contract';
import { X, Award, CheckCircle2, AlertCircle, Loader2, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';

interface ClaimModalProps {
  project: ProjectData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ project, onClose, onSuccess }) => {
  const [customError, setCustomError] = useState<string | null>(null);
  const { address, isConnected, chainId } = useAccount();

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

  if (!project) return null;

  const isRecipient =
    isConnected &&
    address &&
    project.recipient &&
    address.toLowerCase() === project.recipient.toLowerCase();

  const handleClaim = async () => {
    setCustomError(null);

    if (!isConnected || !address) {
      setCustomError('Please connect the recipient wallet.');
      return;
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      setCustomError('Please switch to Ethereum Sepolia network.');
      return;
    }

    if (!isRecipient) {
      setCustomError(`Connected wallet (${address.slice(0, 6)}...${address.slice(-4)}) is not the authorized recipient (${project.recipient.slice(0, 6)}...${project.recipient.slice(-4)}).`);
      return;
    }

    if (project.claimed) {
      setCustomError('This project has already withdrawn its funds.');
      return;
    }

    if (project.claimable <= 0n) {
      setCustomError('There are no claimable funds available.');
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      setCustomError('Contract address is not configured. Set VITE_CONTRACT_ADDRESS to execute real claims.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'claimProjectFunds',
        args: [project.id]
      });
      onSuccess();
    } catch (err: unknown) {
      console.error('Claim failed:', err);
    }
  };

  const handleClose = () => {
    resetWrite();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Claim Project Allocation</h3>
              <p className="text-xs text-slate-500 font-mono">Project #{project.id.toString()}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Authorization Check */}
        <div className="p-3.5 rounded-xl border text-xs">
          {isRecipient ? (
            <div className="flex items-start space-x-2.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authorized Recipient Connected</p>
                <p className="text-emerald-700 mt-0.5 font-mono">{project.recipient}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2.5 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Recipient Wallet Required</p>
                <p className="text-amber-700 mt-0.5">
                  Only the registered recipient address (<span className="font-mono">{project.recipient.slice(0, 6)}...{project.recipient.slice(-4)}</span>) can trigger fund withdrawal.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Claim Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500">Direct Contributions Collected:</span>
            <span className="font-mono font-bold text-slate-900">{formatEther(project.totalContributions)} ETH</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500">Final Quadratic Matching:</span>
            <span className="font-mono font-bold text-indigo-700">{formatEther(project.matchingAllocation)} ETH</span>
          </div>
          <div className="flex justify-between py-1 pt-2">
            <span className="font-semibold text-slate-900">Total Payout to Recipient:</span>
            <span className="font-mono font-extrabold text-emerald-700 text-sm">{formatEther(project.claimable)} ETH</span>
          </div>
        </div>

        {/* Errors */}
        {(customError || submitError) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{customError || submitError?.message}</span>
          </div>
        )}

        {/* Pending */}
        {(isSubmitting || isWaitingForReceipt) && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center space-x-2.5 text-xs text-indigo-900">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            <span>{isSubmitting ? 'Confirm withdrawal in wallet...' : 'Processing onchain transfer...'}</span>
          </div>
        )}

        {/* Confirmed */}
        {isConfirmed && txHash && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs text-emerald-900">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Funds Transferred to Recipient!</span>
            </div>
            <a
              href={getEtherscanTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 font-semibold text-emerald-700 underline mt-1"
            >
              <span>View Claim Transaction</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {isConfirmed ? 'Close' : 'Cancel'}
          </button>

          {!isConfirmed && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={!isRecipient || project.claimed || isSubmitting || isWaitingForReceipt}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting || isWaitingForReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Claim {formatEther(project.claimable)} ETH</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
