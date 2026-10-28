import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  QUADRATIC_ROUND_ABI,
  SEPOLIA_CHAIN_ID,
  RoundStatus,
  getEtherscanTxUrl
} from '../config/contract';
import { X, Coins, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface MatchingPoolModalProps {
  currentPoolWei: bigint;
  roundStatus: RoundStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export const MatchingPoolModal: React.FC<MatchingPoolModalProps> = ({
  currentPoolWei,
  roundStatus,
  onClose,
  onSuccess
}) => {
  const [depositAmount, setDepositAmount] = useState<string>('1.0');
  const [customError, setCustomError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({ address });

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

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!isConnected || !address) {
      setCustomError('Please connect your wallet first.');
      return;
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      setCustomError('Please switch to Ethereum Sepolia network.');
      return;
    }

    if (roundStatus === RoundStatus.Finalized) {
      setCustomError('Cannot deposit matching funds into a finalized round.');
      return;
    }

    let parsedWei: bigint;
    try {
      parsedWei = parseEther(depositAmount);
      if (parsedWei <= 0n) {
        setCustomError('Deposit amount must be greater than zero.');
        return;
      }
    } catch {
      setCustomError('Invalid ETH amount format.');
      return;
    }

    if (balanceData && balanceData.value < parsedWei) {
      setCustomError(`Insufficient balance. You have ${formatEther(balanceData.value)} ETH.`);
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      setCustomError('Contract address is not configured. Set VITE_CONTRACT_ADDRESS to test real deposits.');
      return;
    }

    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: QUADRATIC_ROUND_ABI,
        functionName: 'fundMatchingPool',
        value: parsedWei
      });
      onSuccess();
    } catch (err: unknown) {
      console.error('Matching pool deposit error:', err);
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
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sponsor Matching Pool</h3>
              <p className="text-xs text-slate-500">Fund the collective community quadratic matching pool</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Pool Status */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
          <div>
            <span className="font-medium text-slate-500">Current Matching Pool</span>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{formatEther(currentPoolWei)} ETH</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Open to all sponsors
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="sponsorEthAmount" className="font-semibold text-slate-700">Sponsorship Amount (ETH)</label>
              {balanceData && (
                <span className="text-slate-500 font-mono">
                  Wallet: {Number(formatEther(balanceData.value)).toFixed(4)} ETH
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="sponsorEthAmount"
                type="number"
                step="0.1"
                min="0.001"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={isSubmitting || isWaitingForReceipt}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="1.0"
                required
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">ETH</span>
            </div>
            <div className="flex gap-2 pt-1">
              {['0.5', '1.0', '2.5', '5.0'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setDepositAmount(preset)}
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

          {/* Pending */}
          {(isSubmitting || isWaitingForReceipt) && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center space-x-2.5 text-xs text-indigo-900">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <span>{isSubmitting ? 'Confirm deposit in wallet...' : 'Broadcasting deposit to Sepolia...'}</span>
            </div>
          )}

          {/* Confirmed */}
          {isConfirmed && txHash && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs text-emerald-900">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Matching Pool Funded!</span>
              </div>
              <p>Thank you for amplifying community public goods backing.</p>
              <a
                href={getEtherscanTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 font-semibold text-emerald-700 underline mt-1"
              >
                <span>View on Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
              {isConfirmed ? 'Close' : 'Cancel'}
            </button>

            {!isConfirmed && (
              <button
                type="submit"
                disabled={isSubmitting || isWaitingForReceipt}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSubmitting || isWaitingForReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Deposit Funds</span>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
