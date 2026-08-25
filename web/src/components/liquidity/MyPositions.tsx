'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/context/WalletContext';
import { formatNumber, getTimeRemaining } from '@/lib/utils';
import { checkRateLimit, sanitizeErrorMessage } from '@/lib/security';
import { getExplorerTxUrl } from '@/lib/config';
import {
  solanaLiquidityGetUserPositions,
  solanaLiquidityClaimFees,
  solanaLiquidityCompoundFees,
  solanaLiquidityWithdraw,
  type LiquidityPositionSummary,
} from '@/lib/contracts/liquidity';

type ActionKey = string;

export interface MyPositionsHandle {
  refresh: () => void;
}

export default function MyPositions({ refreshKey }: { refreshKey: number }) {
  const { solanaAddress } = useWallet();
  const [positions, setPositions] = useState<LiquidityPositionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<ActionKey, boolean>>({});
  const [tick, setTick] = useState(0);

  const setBusy = (key: ActionKey, v: boolean) => setActionLoading((s) => ({ ...s, [key]: v }));

  const load = useCallback(async () => {
    if (!solanaAddress) { setPositions([]); return; }
    setLoading(true);
    try {
      const rows = await solanaLiquidityGetUserPositions(new PublicKey(solanaAddress));
      setPositions(rows);
    } catch (e) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [solanaAddress]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Live-tick the unlock countdowns, same pattern as the staking Dashboard.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleClaim = async (p: LiquidityPositionSummary) => {
    if (!checkRateLimit(`liquidity-claim-${p.positionAddress}`)) { toast.error('Please wait a moment.'); return; }
    setBusy(`claim-${p.positionAddress}`, true);
    try {
      const { txHash } = await solanaLiquidityClaimFees(p.positionAddress);
      toast.success(
        <span>Fees claimed! <a href={getExplorerTxUrl('solana', txHash)} target="_blank" rel="noopener noreferrer" className="underline">View</a></span>,
      );
      load();
    } catch (e) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setBusy(`claim-${p.positionAddress}`, false);
    }
  };

  const handleCompound = async (p: LiquidityPositionSummary) => {
    if (!checkRateLimit(`liquidity-compound-${p.positionAddress}`)) { toast.error('Please wait a moment.'); return; }
    setBusy(`compound-${p.positionAddress}`, true);
    try {
      const { txHash } = await solanaLiquidityCompoundFees(p.positionAddress);
      toast.success(
        <span>Fees compounded! <a href={getExplorerTxUrl('solana', txHash)} target="_blank" rel="noopener noreferrer" className="underline">View</a></span>,
      );
      load();
    } catch (e) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setBusy(`compound-${p.positionAddress}`, false);
    }
  };

  const handleWithdraw = async (p: LiquidityPositionSummary) => {
    if (!checkRateLimit(`liquidity-withdraw-${p.positionAddress}`)) { toast.error('Please wait a moment.'); return; }
    setBusy(`withdraw-${p.positionAddress}`, true);
    try {
      const { txHash } = await solanaLiquidityWithdraw(p.positionAddress);
      toast.success(
        <span>Withdrawn! <a href={getExplorerTxUrl('solana', txHash)} target="_blank" rel="noopener noreferrer" className="underline">View</a></span>,
      );
      load();
    } catch (e) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setBusy(`withdraw-${p.positionAddress}`, false);
    }
  };

  if (!solanaAddress) {
    return <div className="glass-card p-6 text-center text-text-muted text-sm">Connect your wallet to see your liquidity positions.</div>;
  }
  if (loading && positions.length === 0) {
    return <div className="glass-card p-6 text-center text-text-muted text-sm">Loading your positions…</div>;
  }
  if (positions.length === 0) {
    return <div className="glass-card p-6 text-center text-text-muted text-sm">You don&apos;t have any liquidity positions yet.</div>;
  }

  return (
    <div className="space-y-3">
      {positions.map((p) => {
        const isPermanent = p.lockType === 'permanent';
        const isUnlocked  = p.lockType === 'none' || (p.unlockTimestampMs !== null && p.unlockTimestampMs <= Date.now());
        const hasFees = p.feeOwedFbit > 0 || p.feeOwedSol > 0;
        return (
          <div key={p.positionAddress} className="glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-1 rounded-full ${
                isPermanent ? 'bg-accent-rose/15 text-accent-rose' : 'bg-brand-500/15 text-brand-400'
              }`}>
                {isPermanent ? 'Permanent Lock' : '24-Month Lock'}
              </span>
              {!isPermanent && (
                <span className="text-text-muted text-xs font-mono">
                  {isUnlocked ? 'Unlocked' : `${getTimeRemaining(Math.floor((p.unlockTimestampMs ?? 0) / 1000))} remaining`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-text-muted text-[11px] uppercase tracking-wider mb-0.5">Claimable Fees</p>
                <p className="font-mono">{formatNumber(p.feeOwedFbit)} FBiT</p>
                <p className="font-mono text-text-muted text-xs">{formatNumber(p.feeOwedSol)} SOL</p>
              </div>
              <div>
                <p className="text-text-muted text-[11px] uppercase tracking-wider mb-0.5">Position</p>
                <p className="font-mono text-xs text-text-muted truncate" title={p.positionAddress}>{p.positionAddress.slice(0, 8)}…{p.positionAddress.slice(-6)}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleClaim(p)}
                disabled={!hasFees || actionLoading[`claim-${p.positionAddress}`]}
                className="btn-secondary text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading[`claim-${p.positionAddress}`] ? 'Claiming…' : 'Claim Fees'}
              </button>
              <button
                onClick={() => handleCompound(p)}
                disabled={!hasFees || actionLoading[`compound-${p.positionAddress}`]}
                className="btn-secondary text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading[`compound-${p.positionAddress}`] ? 'Compounding…' : 'Compound'}
              </button>
              {!isPermanent && isUnlocked && (
                <button
                  onClick={() => handleWithdraw(p)}
                  disabled={actionLoading[`withdraw-${p.positionAddress}`]}
                  className="btn-primary text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionLoading[`withdraw-${p.positionAddress}`] ? 'Withdrawing…' : 'Withdraw'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
