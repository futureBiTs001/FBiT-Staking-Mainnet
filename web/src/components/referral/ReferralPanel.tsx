'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@/context/WalletContext';
import { useAppStore } from '@/lib/store';
import { useContract } from '@/hooks/useContract';
import {
  formatNumber,
  copyToClipboard,
  generateReferralLink,
  getTeamTargetTier,
  getNextTeamTargetTier,
} from '@/lib/utils';
import { REFERRAL_LEVELS, TEAM_TARGET_TIERS } from '@/types';
import { getExplorerTxUrl } from '@/lib/config';
import type { ReferralEntry, TxRecord } from '@/types';

// ProgressBar sets width imperatively to avoid JSX inline-style linter warnings
function ProgressBar({ pct, className }: { pct: number; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }, [pct]);
  return <div ref={ref} className={`h-full rounded-full transition-all duration-500 ${className}`} />;
}

const POLL_INTERVAL_MS = 30_000;

const LEVEL_COLORS: Record<number, string> = {
  1:  'bg-brand-500/10 text-brand-400 border-brand-500/20',
  2:  'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  3:  'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  4:  'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  5:  'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  6:  'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  7:  'bg-accent-rose/10 text-accent-rose border-accent-rose/20',
  8:  'bg-accent-rose/10 text-accent-rose border-accent-rose/20',
  9:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  10: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function ReferralPanel() {
  const { address, solanaAddress, evmAddress } = useWallet();
  const { getWalletData, selectedNetwork } = useAppStore();
  const contract = useContract();

  const [copied, setCopied]           = useState(false);
  const [activeView, setActiveView]   = useState<'overview' | 'levels' | 'team' | 'history'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt]   = useState<Date | null>(null);
  const prevReferralCount             = useRef<number>(0);

  // On-chain history state
  const [onChainRefHistory, setOnChainRefHistory] = useState<TxRecord[]>([]);
  const [fullReferralTree, setFullReferralTree]   = useState<ReferralEntry[]>([]);
  const [isFetchingChain, setIsFetchingChain]     = useState(false);
  const [hasFetchedChain, setHasFetchedChain]     = useState(false);

  const syncReferralData = useCallback(async () => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      await contract.syncUserData();
      setLastSyncAt(new Date());
    } catch {}
    setIsRefreshing(false);
  }, [address, contract]);

  // Initial sync + auto-poll every 30s (lightweight — L1 only)
  useEffect(() => {
    if (!address) return;
    void syncReferralData();
    const id = setInterval(() => syncReferralData(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, selectedNetwork]);

  const walletData      = getWalletData();
  const referralInfo    = walletData?.referralInfo;
  const userAccount     = walletData?.userAccount;
  const teamTotalStaked = userAccount?.teamTotalStaked ?? 0;
  const teamSizeVal     = userAccount?.teamSize ?? 0;

  // Detect new referrals
  useEffect(() => {
    const count = referralInfo?.totalReferrals ?? 0;
    if (prevReferralCount.current > 0 && count > prevReferralCount.current) {
      const diff = count - prevReferralCount.current;
      toast.success(`+${diff} new referral${diff > 1 ? 's' : ''}! Your network is growing.`);
    }
    prevReferralCount.current = count;
  }, [referralInfo?.totalReferrals]);

  // ── On-chain full refresh ────────────────────────────────────────────────────
  const handleRefreshFromChain = useCallback(async () => {
    if (!address) return;
    const solAddr = solanaAddress ?? (!address.startsWith('0x') ? address : null);
    const polyAddr = evmAddress ?? (address.startsWith('0x') ? address : null);

    setIsFetchingChain(true);
    try {
      if (selectedNetwork === 'solana' && solAddr) {
        const [histRes, treeRes] = await Promise.allSettled([
          import('@/lib/contracts/solana').then(m => m.solanaGetReferralOnChainHistory(solAddr)),
          import('@/lib/contracts/solana').then(m => m.solanaGetFullReferralTree(solAddr)),
        ]);
        if (histRes.status === 'fulfilled') setOnChainRefHistory(histRes.value);
        if (treeRes.status === 'fulfilled') setFullReferralTree(treeRes.value);
      } else if (selectedNetwork === 'polygon' && polyAddr) {
        // Polygon: on-chain history from HistoryPanel function (re-use same approach)
        const histRes = await import('@/lib/contracts/polygon')
          .then(m => m.polygonGetOnChainHistory(polyAddr))
          .then(all => all.filter((t: TxRecord) => t.type === 'referral'))
          .catch(() => [] as TxRecord[]);
        setOnChainRefHistory(histRes);
      }
      setHasFetchedChain(true);
      toast.success('On-chain referral data loaded');
    } catch {
      toast.error('Failed to load on-chain referral data');
    } finally {
      setIsFetchingChain(false);
    }
  }, [address, solanaAddress, evmAddress, selectedNetwork]);

  // Referral tree to display: full (if fetched) or L1 fallback
  const displayedTree: ReferralEntry[] = useMemo(() => {
    if (hasFetchedChain && fullReferralTree.length > 0) return fullReferralTree;
    return (referralInfo?.referrals ?? []).map(r => ({ ...r, level: r.level || 1 }));
  }, [hasFetchedChain, fullReferralTree, referralInfo?.referrals]);

  // Local referral txns from Zustand store
  const localRefTxs = useMemo(
    () => (walletData?.transactions ?? []).filter(t => t.type === 'referral'),
    [walletData?.transactions]
  );

  // Merged: on-chain + local, deduped by txHash
  const allRefTxs = useMemo(() => {
    const seen = new Set<string>();
    const merged: TxRecord[] = [];
    for (const tx of [...onChainRefHistory, ...localRefTxs]) {
      const key = tx.txHash && tx.txHash !== 'local' ? tx.txHash : tx.id;
      if (!seen.has(String(key))) {
        seen.add(String(key));
        merged.push(tx);
      }
    }
    return merged.sort((a, b) => b.timestamp - a.timestamp);
  }, [onChainRefHistory, localRefTxs]);

  const currentTier = getTeamTargetTier(teamSizeVal, teamTotalStaked);
  const nextTier    = getNextTeamTargetTier(teamSizeVal, teamTotalStaked);

  const chainAddress = selectedNetwork === 'solana'
    ? (solanaAddress ?? (address && !address.startsWith('0x') ? address : null))
    : (evmAddress   ?? (address && address.startsWith('0x')   ? address : null));
  const referralLink    = chainAddress ? generateReferralLink(chainAddress) : '';
  const totalReferrals  = referralInfo?.totalReferrals ?? 0;
  const totalRewards    = userAccount?.totalReferralRewards ?? referralInfo?.totalReferralRewards ?? 0;
  const activeReferrals = referralInfo?.referrals.filter(r => r.stakedAmount > 0).length ?? 0;
  const teamSize        = teamSizeVal;

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    await syncReferralData();
    toast.success('Referral data refreshed!');
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-accent-purple/20 to-brand-500/20 flex items-center justify-center mb-4 animate-float">
          <span className="text-3xl">◎</span>
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Referral Network</h2>
        <p className="text-text-secondary max-w-sm">
          Connect your wallet to access your referral link and earn commissions across 10 levels.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Referral Link */}
      <div className="glass-card bg-linear-to-br from-accent-purple/5 to-brand-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-lg">Your Referral Link</h3>
          <div className="flex items-center gap-2">
            {lastSyncAt && (
              <span className="text-[10px] text-text-muted font-mono">
                Updated {lastSyncAt.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh referral data"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-all disabled:opacity-40"
            >
              <span className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-surface-900/80 border border-white/5 font-mono text-sm text-text-secondary truncate">
            {referralLink}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-6 py-3 rounded-xl font-display font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
              copied
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'btn-primary'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
        <p className="text-text-muted text-xs mt-3">
          Share this link to earn commissions when your referrals stake tokens — up to 10 levels deep!
          {isRefreshing && <span className="ml-2 text-brand-400 animate-pulse">Syncing...</span>}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals', value: totalReferrals,               color: 'gradient-text' },
          { label: 'Active',          value: activeReferrals,               color: 'text-brand-400' },
          { label: 'Total Earned',    value: formatNumber(totalRewards, 8), color: 'text-accent-cyan' },
          { label: 'Team Size',       value: teamSize,                      color: 'text-accent-amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card text-center">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider">{label}</p>
            <p className={`font-display font-bold text-2xl mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800/50 border border-white/5 overflow-x-auto">
        {(['overview', 'levels', 'team', 'history'] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`flex-1 py-2.5 rounded-lg font-display text-sm font-medium transition-all whitespace-nowrap px-3 ${
              activeView === tab
                ? 'bg-brand-500/10 text-brand-400 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab === 'team' ? 'Team Bonus' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeView === 'overview' && (
        <div className="glass-card">
          <h3 className="font-display font-semibold mb-4">How It Works</h3>
          <div className="space-y-3">
            {[
              { n: 1, color: 'bg-brand-500/20 text-brand-400',        title: 'Share Your Link',       body: 'Copy your unique referral link and share it with friends and community.' },
              { n: 2, color: 'bg-accent-purple/20 text-accent-purple', title: 'They Stake',            body: 'When someone registers through your link and stakes tokens, you earn commissions.' },
              { n: 3, color: 'bg-accent-cyan/20 text-accent-cyan',     title: 'Earn 10 Levels Deep',   body: 'Earn from referrals up to 10 levels deep. The deeper the network, the higher the rewards!' },
            ].map(({ n, color, title, body }) => (
              <div key={n} className="flex items-start gap-4 p-3 rounded-xl bg-surface-800/30">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center font-display font-bold text-sm shrink-0`}>{n}</div>
                <div>
                  <p className="font-display font-medium text-sm">{title}</p>
                  <p className="text-text-muted text-xs mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
          {currentTier && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Active Team Bonus</p>
                <p className="font-display font-bold text-brand-400">+{currentTier.bonusPercentage}% ({currentTier.label})</p>
              </div>
              <button type="button" onClick={() => setActiveView('team')} className="text-xs text-text-muted hover:text-text-secondary font-display transition-colors">
                View tiers →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Levels ── */}
      {activeView === 'levels' && (
        <div className="glass-card">
          <h3 className="font-display font-semibold mb-4">Referral Commission Levels</h3>
          <div className="space-y-2">
            {REFERRAL_LEVELS.map((level) => (
              <div key={level.level} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    level.level <= 3  ? 'bg-brand-500/20 text-brand-400' :
                    level.level <= 6  ? 'bg-accent-purple/20 text-accent-purple' :
                    level.level <= 8  ? 'bg-accent-cyan/20 text-accent-cyan' :
                    'bg-accent-amber/20 text-accent-amber'
                  }`}>L{level.level}</div>
                  <span className="font-display text-sm">Level {level.level}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-2 rounded-full bg-surface-900 overflow-hidden">
                    <ProgressBar pct={(level.percentage / 8) * 100} className="bg-linear-to-r from-brand-500 to-accent-cyan" />
                  </div>
                  <span className="font-mono text-sm text-brand-400 w-14 text-right">{level.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
            <span className="text-text-muted">Total Commission (all levels)</span>
            <span className="font-mono text-brand-400 font-bold">30%</span>
          </div>
        </div>
      )}

      {/* ── Team Bonus ── */}
      {activeView === 'team' && (
        <div className="space-y-4">
          <div className={`glass-card border ${
            currentTier
              ? 'bg-linear-to-br from-accent-purple/10 to-brand-500/10 border-accent-purple/20'
              : 'bg-surface-800/30 border-white/5'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-1">Your Current Tier</p>
                {currentTier ? (
                  <p className="font-display font-bold text-xl gradient-text">{currentTier.label} — +{currentTier.bonusPercentage}% Bonus</p>
                ) : (
                  <p className="font-display font-bold text-xl text-text-secondary">No Tier Yet</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs mb-1">Team Size · Team Staked</p>
                <p className="font-mono text-sm">
                  <span className="text-brand-400">{teamSizeVal}</span>
                  <span className="text-text-muted"> members · </span>
                  <span className="text-accent-cyan">{formatNumber(teamTotalStaked)}</span>
                  <span className="text-text-muted"> FBiT</span>
                </p>
              </div>
            </div>
            {nextTier && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-text-muted text-xs mb-2">
                  Progress to <span className="text-brand-400 font-medium">{nextTier.label} (+{nextTier.bonusPercentage}%)</span>
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {[{ label: 'Team Staked', cur: teamTotalStaked, max: nextTier.minTeamStaked }].map(({ label, cur, max }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted">{label}</span>
                        <span className="font-mono text-text-secondary">{formatNumber(cur)} / {formatNumber(max)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-900 overflow-hidden">
                        <ProgressBar pct={(cur / max) * 100} className="bg-linear-to-r from-accent-cyan to-brand-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="font-display font-semibold mb-4">10-Tier Team Target Bonus</h3>
            <p className="text-text-muted text-xs mb-4">
              Grow your team's total staked FBiT to unlock a permanent bonus applied on top of every staking reward claim.
            </p>
            <div className="space-y-3">
              {TEAM_TARGET_TIERS.map((tier) => {
                const isActive   = currentTier?.tier === tier.tier;
                const isUnlocked = currentTier ? currentTier.tier >= tier.tier : false;
                const colMap: Record<string, string> = {
                  amber:  'bg-accent-amber/20 text-accent-amber border-accent-amber/20',
                  slate:  'bg-surface-700/60 text-text-secondary border-white/10',
                  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
                  cyan:   'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/20',
                  purple: 'bg-accent-purple/20 text-accent-purple border-accent-purple/20',
                  rose:   'bg-accent-rose/20 text-accent-rose border-accent-rose/20',
                  green:  'bg-emerald-400/20 text-emerald-400 border-emerald-400/20',
                  blue:   'bg-blue-400/20 text-blue-400 border-blue-400/20',
                  gray:   'bg-gray-400/20 text-gray-400 border-gray-400/20',
                  brand:  'bg-brand-500/20 text-brand-400 border-brand-500/20',
                };
                return (
                  <div key={tier.tier} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isActive   ? 'bg-brand-500/10 border-brand-500/30' :
                    isUnlocked ? 'bg-surface-800/50 border-white/10' :
                    'bg-surface-800/20 border-white/5 opacity-60'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${colMap[tier.color]}`}>T{tier.tier}</div>
                      <div>
                        <p className="font-display font-medium text-sm flex items-center gap-2">
                          {tier.label}
                          {isActive   && <span className="text-xs text-brand-400 font-normal">(Active)</span>}
                          {isUnlocked && !isActive && <span className="text-xs text-text-muted">✓</span>}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5">{formatNumber(tier.minTeamStaked)} FBiT staked</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-display font-bold text-lg ${isUnlocked ? 'text-brand-400' : 'text-text-muted'}`}>+{tier.bonusPercentage}%</p>
                      <p className="text-text-muted text-xs">bonus</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
              <span className="text-text-muted">Max bonus (Titan)</span>
              <span className="font-mono text-brand-400 font-bold">+10%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeView === 'history' && (
        <div className="space-y-4">

          {/* ── Referral Reward Transactions ── */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-display font-semibold">
                  Referral Reward History
                  {allRefTxs.length > 0 && (
                    <span className="ml-2 text-xs text-text-muted font-normal">({allRefTxs.length} records)</span>
                  )}
                </h3>
                <p className="text-text-muted text-xs mt-0.5">
                  On-chain transactions where your referrals staked and you received a reward
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshFromChain}
                disabled={isFetchingChain}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-semibold border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isFetchingChain ? (
                  <><span className="animate-spin text-xs">◌</span> Fetching...</>
                ) : (
                  <>⟳ Refresh from Chain</>
                )}
              </button>
            </div>

            {allRefTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-3 opacity-20">◎</div>
                {hasFetchedChain ? (
                  <>
                    <p className="font-display font-medium text-text-secondary">No referral rewards found on-chain</p>
                    <p className="text-text-muted text-xs mt-1">Rewards appear here when your referrals stake FBiT</p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-medium text-text-secondary">Load your on-chain referral history</p>
                    <p className="text-text-muted text-xs mt-1">Click <span className="text-brand-400">Refresh from Chain</span> to scan the last 200 transactions</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {allRefTxs.map(tx => {
                  const explorerUrl = getExplorerTxUrl(tx.network, tx.txHash);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3 px-3 rounded-xl bg-surface-800/40 border border-white/5 hover:border-white/10 transition-all">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                        ◎
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold text-accent-amber">Referral Reward</p>
                        <p className="text-text-muted text-[11px] truncate mt-0.5">{tx.label}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold text-accent-amber">+{formatNumber(tx.amount, 8)}</p>
                        <p className="text-text-muted text-[10px]">FBiT</p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-text-secondary text-xs">
                          {new Date(tx.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-text-muted text-[10px]">
                          {new Date(tx.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {tx.txHash && tx.txHash !== 'local' && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on explorer"
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-muted hover:text-brand-400 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Referral Network Tree ── */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-display font-semibold">
                  Referral Network
                  {displayedTree.length > 0 && (
                    <span className="ml-2 text-xs text-text-muted font-normal">
                      ({displayedTree.length} {hasFetchedChain ? 'across all levels' : 'direct referrals'})
                    </span>
                  )}
                </h3>
                {!hasFetchedChain && (
                  <p className="text-text-muted text-[11px] mt-0.5">
                    Click <span className="text-brand-400">Refresh from Chain</span> above to load all 10 levels
                  </p>
                )}
              </div>
              {hasFetchedChain && fullReferralTree.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Array.from(new Set(fullReferralTree.map(r => r.level))).sort().map(lvl => (
                    <span key={lvl} className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${LEVEL_COLORS[lvl] ?? 'bg-surface-700 text-text-muted border-white/10'}`}>
                      L{lvl}: {fullReferralTree.filter(r => r.level === lvl).length}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {displayedTree.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-sm">
                No referrals yet. Share your link to get started!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs font-display uppercase tracking-wider">
                      <th className="text-left pb-3 pl-3">User</th>
                      <th className="text-center pb-3">Level</th>
                      <th className="text-right pb-3">Staked</th>
                      <th className="text-right pb-3 pr-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayedTree.map((entry, i) => (
                      <tr key={i} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 pl-3 font-mono text-xs text-text-secondary" title={entry.address}>
                          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${LEVEL_COLORS[entry.level] ?? 'bg-surface-700 text-text-muted border-white/10'}`}>
                            L{entry.level}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-xs">
                          {entry.stakedAmount > 0
                            ? <span className="text-brand-400">{formatNumber(entry.stakedAmount)} FBiT</span>
                            : <span className="text-text-muted">—</span>
                          }
                        </td>
                        <td className="py-3 text-right pr-3 text-xs text-text-muted">
                          {entry.registeredAt > 0
                            ? new Date(entry.registeredAt * 1000).toLocaleDateString()
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasFetchedChain && fullReferralTree.length === 0 && displayedTree.length === 0 && (
              <p className="text-center py-4 text-text-muted text-xs">
                No referrals found across all 10 levels on-chain.
              </p>
            )}
          </div>

          {/* Total from on-chain */}
          {hasFetchedChain && (
            <div className="glass-card bg-linear-to-r from-accent-amber/5 to-brand-500/5 border border-accent-amber/10">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-1">Total Referral Rewards (on-chain)</p>
                  <p className="font-display font-bold text-2xl text-accent-amber">{formatNumber(totalRewards, 8)} FBiT</p>
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-xs mb-1">Network Depth</p>
                  <p className="font-display font-bold text-brand-400">
                    {fullReferralTree.length > 0
                      ? `${Math.max(...fullReferralTree.map(r => r.level))} levels`
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="text-text-muted text-[11px] mt-3">
                Total from <span className="text-accent-amber font-mono">{userAccount?.totalReferralRewards !== undefined ? 'on-chain' : 'local'} UserAccount</span>. Reward transaction history shows last 200 on-chain events.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
