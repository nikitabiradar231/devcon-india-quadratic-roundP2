import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, type Hex } from 'viem';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  QUADRATIC_ROUND_ABI,
  SEPOLIA_CHAIN_ID,
  RoundStatus,
  type ProjectData,
  getEtherscanTxUrl
} from '../config/contract';
import { checkWalletEligibility } from '../config/eligibility';
import { X, HeartHandshake, ShieldCheck, ShieldAlert, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface ContributeModalProps {
  project: ProjectData | null;
  onClose: () => void;
  roundStatus: RoundStatus;
  onSuccess: () => void;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
  project,
  onClose,
  roundStatus,
  onSuccess
}) => {
  const [amountStr, setAmountStr] = useState<string>('0.01');
  const [customError, setCustomError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const eligibility = checkWalletEligibility(address);

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

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!isConnected || !address) {
      setCustomError('Please connect your wallet first.');
      return;
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      setCustomError('Please switch your wallet network to Ethereum Sepolia (Chain ID 11155111).');
      return;
    }

    if (roundStatus !== RoundStatus.Live) {
      setCustomError('Contributions are only permitted while the round is Live.');
      return;
    }

    if (!eligibility.isEligible || !eligibility.proof || eligibility.proof.length === 0) {
      setCustomError('This wallet is not present in the Road to Devcon Merkle eligibility allowlist.');
      return;
    }

    let parsedWei: bigint;
    try {
      parsedWei = parseEther(amountStr);
      if (parsedWei <= 0n) {
        setCustomError('Please enter an ETH amount greater than zero.');
        return;
      }
    } catch {
      setCustomError('Invalid ETH amount format.');
      return;
    }

    if (balanceData && balanceData.value < parsedWei) {
      setCustomError(`Insufficient ETH balance. You have ${formatEther(balanceData.value)} ETH.`);
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      setCustomError('Contract address is not configured yet. Set VITE_CONTRACT_ADDRESS to test real transactions.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'contribute',
        args: [project.id, eligibility.proof as Hex[]],
        value: parsedWei
      });
      onSuccess();
    } catch (err: unknown) {
      console.error('Contribution failed:', err);
      // Wagmi / Viem errors are also reflected in submitError
    }
  };

  const handleClose = () => {
    resetWrite();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Contribute to Project</h3>
              <p className="text-xs text-slate-500 font-mono">Project #{project.id.toString()}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Target Summary */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Selected Project</span>
          <p className="text-sm font-bold text-slate-900">{project.name}</p>
          <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>
        </div>

        {/* Eligibility Verification Check */}
        <div className="flex items-start space-x-3 p-3 rounded-xl border text-xs">
          {eligibility.isEligible ? (
            <>
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Wallet Allowlisted for Devcon XI Round</p>
                <p className="text-emerald-700 mt-0.5">
                  Valid Merkle proof with {eligibility.proof.length} sibling hashes ready for onchain submission.
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Wallet Not on Merkle Allowlist</p>
                <p className="text-amber-700 mt-0.5">
                  {address
                    ? 'This address is not in the attendee eligibility tree. Only allowlisted addresses can contribute.'
                    : 'Connect an allowlisted Road to Devcon wallet to proceed.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Contribution Form */}
        <form onSubmit={handleContribute} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="ethAmount" className="font-semibold text-slate-700">Contribution Amount (ETH)</label>
              {balanceData && (
                <span className="text-slate-500 font-mono">
                  Balance: {Number(formatEther(balanceData.value)).toFixed(4)} ETH
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="ethAmount"
                type="number"
                step="0.0001"
                min="0.0001"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                disabled={isSubmitting || isWaitingForReceipt}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="0.01"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">ETH</span>
            </div>
            <div className="flex gap-2 pt-1">
              {['0.005', '0.01', '0.05', '0.1'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmountStr(preset)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  {preset} ETH
                </button>
              ))}
            </div>
          </div>

          {/* Errors */}
          {(customError || submitError) && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{customError || submitError?.message}</span>
            </div>
          )}

          {/* Pending State */}
          {(isSubmitting || isWaitingForReceipt) && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center space-x-2.5 text-xs text-indigo-900">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <span>
                {isSubmitting ? 'Confirm transaction in your wallet...' : 'Transaction broadcast! Waiting for Sepolia block confirmation...'}
              </span>
            </div>
          )}

          {/* Success State */}
          {isConfirmed && txHash && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs text-emerald-900">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Contribution Confirmed onchain!</span>
              </div>
              <p>Your quadratic impact has been recorded on Sepolia.</p>
              <a
                href={getEtherscanTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 font-semibold text-emerald-700 underline mt-1"
              >
                <span>View Transaction on Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {isConfirmed ? 'Done' : 'Cancel'}
            </button>

            {!isConfirmed && (
              <button
                type="submit"
                disabled={isSubmitting || isWaitingForReceipt || !eligibility.isEligible}
                className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                  isSubmitting || isWaitingForReceipt || !eligibility.isEligible
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500'
                }`}
              >
                {isSubmitting || isWaitingForReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Submit Contribution</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
