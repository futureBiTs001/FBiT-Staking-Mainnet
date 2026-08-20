'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@/context/WalletContext';
import { isAdminAddress } from '@/context/WalletContext';
import { useAppStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { useContract } from '@/hooks/useContract';
import { TEAM_TARGET_TIERS } from '@/types';
import { checkRateLimit, isValidWalletAddress, isValidAmount, isValidBonusBps, sanitizeText, sanitizeErrorMessage } from '@/lib/security';
import ContractSetupNotice from '@/components/ui/ContractSetupNotice';
import UsdValue from '@/components/ui/UsdValue';
import { useTokenPrice } from '@/hooks/useTokenPrice';

export default function AdminPanel() {
  const { address } = useWallet();
  const { selectedNetwork, platformStats, updatePlatformStats, addTransaction, getWalletData } = useAppStore();
  const contract = useContract();
  const { pairs: pricePairs } = useTokenPrice();
  const fbitPriceUsd = pricePairs[0]?.priceUsd ? Number(pricePairs[0].priceUsd) : null;

  // null = checking, true = initialized, false = not initialized
  const [platformInitialized, setPlatformInitialized] = useState<boolean | null>(null);

  const [fundAmount, setFundAmount]         = useState('');
  const [reserveAmount, setReserveAmount]   = useState('');
  const [userAddress, setUserAddress]   = useState('');
  const [processing, setProcessing]       = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'pool' | 'rates' | 'users' | 'tiers' | 'platform'>('pool');
  const [renounceConfirm, setRenounceConfirm] = useState(false);

  // Blocked users list (no backend/indexer — fetched on demand by scanning on-chain state)
  const [blockedUsers, setBlockedUsers]           = useState<{ address: string; totalStaked: number }[]>([]);
  const [isFetchingBlocked, setIsFetchingBlocked] = useState(false);
  const [hasFetchedBlocked, setHasFetchedBlocked] = useState(false);

  // Per-level referral percentages state (10 levels, default values in BPS)
  const DEFAULT_REF_PCT = [25, 50, 125, 150, 200, 325, 350, 425, 550, 800];
  const [refPct, setRefPct] = useState<number[]>(DEFAULT_REF_PCT);

  // Annual emission management state
  const [annualEmissionValue, setAnnualEmissionValue] = useState('');
  // Burn BPS management state
  const [burnBpsValue, setBurnBpsValue] = useState('');

  // Live on-chain tiers (populated by syncPlatformStats) — fallback to static constants
  const liveTiers = (platformStats.teamTiers as typeof TEAM_TARGET_TIERS | undefined) ?? TEAM_TARGET_TIERS;

  // Team Target Tier management state — pre-filled from Tier 1 defaults
  const [tierIndex,        setTierIndex]        = useState('0');
  const [tierMinStaked,    setTierMinStaked]    = useState(String(liveTiers[0].minTeamStaked));
  const [tierBonusBps,     setTierBonusBps]     = useState(String(liveTiers[0].bonusBps));

  // Base fallback APY (used when emission = 0)
  const [baseFallbackApyBps, setBaseFallbackApyBps] = useState('');

  // Update User Team Stats state
  const [teamStatsAddress,      setTeamStatsAddress]      = useState('');
  const [teamStatsSize,         setTeamStatsSize]         = useState('');
  const [teamStatsTotalStaked,  setTeamStatsTotalStaked]  = useState('');

  const walletData = getWalletData();

  const run = async (
    key: string,
    onChainFn: (() => Promise<{ txHash: string }>) | null,
    successMsg: string
  ) => {
    // SECURITY: Re-verify admin identity and rate-limit on every sensitive action.
    if (!address || !(await isAdminAddress(address))) {
      toast.error('Security check failed: connected wallet is not an admin.');
      return;
    }
    if (!checkRateLimit(`admin-${key}`, { maxCalls: 3, windowMs: 60_000 })) {
      toast.error('Too many attempts for this action. Wait 60 seconds.');
      return;
    }
    setProcessing(key);
    const toastId = toast.loading('Processing transaction…');
    try {
      if (!contract.isLive || !onChainFn) throw new Error('Contract not configured. Set up your deployment addresses to execute on-chain admin transactions.');
      const result = await onChainFn();
      const txHash = result.txHash;
      // Sync immediately, then again after 2 s to catch any RPC propagation delay
      contract.syncPlatformStats().catch(() => {});
      setTimeout(() => { contract.syncPlatformStats().catch(() => {}); }, 2000);
      addTransaction({
        id: Date.now().toString(),
        type: 'admin',
        label: successMsg,
        amount: 0,
        txHash,
        timestamp: Date.now(),
        status: 'success',
        network: selectedNetwork,
      });
      toast.success(successMsg, { id: toastId });
    } catch (err: any) {
      // Log raw error for admin debugging — check browser DevTools console
      console.error('[AdminPanel] raw error:', err);
      const raw = err instanceof Error ? err.message : String(err);
      // Show the real error to admin (first 200 chars), fall back to sanitized if empty
      const display = raw.trim().slice(0, 200) || sanitizeErrorMessage(err);
      toast.error(display, { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  // Check on-chain whether Platform PDA is initialized
  useEffect(() => {
    if (!contract.isLive) return;
    setPlatformInitialized(null);
    contract.isPlatformInitialized()
      .then(ok => setPlatformInitialized(ok))
      .catch(() => setPlatformInitialized(false));
  }, [contract.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch live platform stats on mount and keep them fresh — platformStats is no
  // longer persisted across reloads (see store.ts), and unlike Dashboard/StakePanel
  // this panel had no sync-on-mount at all, so it only ever showed real numbers
  // after an admin action fired one of the post-tx syncPlatformStats() calls below.
  useEffect(() => {
    if (!contract.isLive) return;
    contract.syncPlatformStats().catch(() => {});
    const id = setInterval(() => { contract.syncPlatformStats().catch(() => {}); }, 60_000);
    return () => clearInterval(id);
  }, [contract.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInitializePlatform = () => {
    run('initPlatform', () => contract.initializePlatform(), 'Platform initialized successfully! Proceed to deposit reserve.');
    // Re-check after a short delay so the UI updates
    setTimeout(() => {
      contract.isPlatformInitialized().then(ok => setPlatformInitialized(ok)).catch(() => {});
    }, 5000);
  };

  const RESERVE_MIN = 0.1;
  const RESERVE_MAX = 250_000_000;

  const handleDepositReserve = () => {
    const n = parseFloat(reserveAmount);
    if (!n || n <= 0) return;
    if (n < RESERVE_MIN) {
      toast.error(`Minimum deposit is ${RESERVE_MIN} FBiT`);
      return;
    }
    if (n > RESERVE_MAX) {
      toast.error(`Maximum deposit is ${RESERVE_MAX.toLocaleString()} FBiT`);
      return;
    }
    run('reserve', () => contract.depositReserve(n), `Deposited ${formatNumber(n)} FBiT into auto-emission reserve`);
  };

  const handleReleaseEmission = () => {
    run('release', () => contract.releaseEmission(), 'Released available emission into reward pool');
  };

  const handleFund = () => {
    const n = parseFloat(fundAmount);
    if (!n || n <= 0) return;
    run('fund', () => contract.fundRewardPool(n), `Funded reward pool with ${formatNumber(n)} FBiT`);
  };

  const handleToggleReferralSystem = () => {
    const next = platformStats.referralRewardRate > 0 ? 0 : 1;
    run('referralRate', () => contract.setReferralRewardRate(next), `Referral system turned ${next > 0 ? 'ON' : 'OFF'}`);
  };

  const handleSetReferralPercentages = () => {
    if (refPct.length !== 10) { toast.error('Exactly 10 referral percentages required.'); return; }
    const total = refPct.reduce((s, v) => s + v, 0);
    if (total > 5000) { toast.error(`Total BPS (${total}) exceeds 5000 (50%) limit.`); return; }
    if (refPct.some((v) => v < 0)) { toast.error('BPS values cannot be negative.'); return; }
    run(
      'refPct',
      () => contract.setReferralPercentages(refPct as [number,number,number,number,number,number,number,number,number,number]),
      `Referral % updated (total: ${(total / 100).toFixed(2)}%)`
    );
  };

  const handleBlock = () => {
    const addr = sanitizeText(userAddress);
    if (!isValidWalletAddress(addr)) { toast.error('Invalid wallet address format.'); return; }
    run('block', () => contract.blockUser(addr), `User ${addr.slice(0, 8)}… blocked`);
  };

  const handleUnblock = () => {
    const addr = sanitizeText(userAddress);
    if (!isValidWalletAddress(addr)) { toast.error('Invalid wallet address format.'); return; }
    run('unblock', () => contract.unblockUser(addr), `User ${addr.slice(0, 8)}… unblocked`);
  };

  const refreshBlockedUsers = useCallback(async () => {
    setIsFetchingBlocked(true);
    try {
      const list = await contract.getBlockedUsers();
      setBlockedUsers(list);
    } catch {
      toast.error('Failed to load blocked users list.');
    } finally {
      setIsFetchingBlocked(false);
      setHasFetchedBlocked(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNetwork]);

  // Auto-fetch the first time the User Mgmt tab is opened (and again on network switch)
  useEffect(() => {
    if (activeSection === 'users') {
      setHasFetchedBlocked(false);
      refreshBlockedUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, selectedNetwork]);

  const handleUnblockFromList = (addr: string) => {
    run('unblock', () => contract.unblockUser(addr), `User ${addr.slice(0, 8)}… unblocked`);
    // Optimistically drop from the list; a full refresh will confirm shortly after the tx lands
    setBlockedUsers((prev) => prev.filter((u) => u.address.toLowerCase() !== addr.toLowerCase()));
  };

  const handleTogglePause = () =>
    run('pause', () => contract.togglePause(platformStats.isPaused), platformStats.isPaused ? 'Platform resumed' : 'Platform paused');

  const handleRenounceOwnership = () => {
    setRenounceConfirm(false);
    run(
      'renounce',
      async () => {
        const result = await contract.renounceOwnership();
        // Immediately flip the store so the UI switches to fee-recipient view
        updatePlatformStats({ isRenounced: true, feeRecipient: address ?? '' });
        return result;
      },
      'Ownership renounced — the 1% platform fee now goes to you automatically',
    );
  };

  const handleSetTeamTier = () => {
    const idx = parseInt(tierIndex, 10);
    const min = parseFloat(tierMinStaked);
    const bps = parseInt(tierBonusBps, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx > 9) { toast.error('Tier index must be 0–9.'); return; }
    // Use a generous cap (10B) — tier min staked can exceed the normal 500M stake cap
    if (!Number.isFinite(min) || min <= 0 || min > 10_000_000_000) { toast.error('Min staked must be a positive number (max 10B).'); return; }
    if (!Number.isInteger(bps) || bps < 0 || bps > 1000) { toast.error('Bonus BPS must be 0–1000 (0 = disable tier).'); return; }
    run(
      'teamTier',
      () => contract.setTeamTargetTier(idx, min, bps),
      `Team tier ${idx + 1} updated: ${min.toLocaleString()} FBiT → ${(bps / 100).toFixed(2)}% bonus`
    );
  };

  const handleSyncAllTiers = async () => {
    if (!address || !(await isAdminAddress(address))) {
      toast.error('Security check failed: connected wallet is not an admin.');
      return;
    }
    if (!checkRateLimit('admin-syncAllTiers', { maxCalls: 1, windowMs: 120_000 })) {
      toast.error('Too many sync attempts. Wait 2 minutes.');
      return;
    }
    if (!contract.isLive) { toast.error('Contract not configured.'); return; }
    if (platformStats.isRenounced) return;
    setProcessing('syncAllTiers');
    let successCount = 0;
    for (let i = 0; i < TEAM_TARGET_TIERS.length; i++) {
      const t = TEAM_TARGET_TIERS[i];
      try {
        await contract.setTeamTargetTier(i, t.minTeamStaked, t.bonusBps);
        successCount++;
        toast.success(`Tier ${i + 1} (${t.label}) updated ✓`, { duration: 2000 });
      } catch (err: any) {
        console.error(`[AdminPanel] Tier ${i + 1} sync error:`, err);
        const raw = err instanceof Error ? err.message : String(err);
        toast.error(`Tier ${i + 1} failed: ${raw.trim().slice(0, 150) || sanitizeErrorMessage(err)}`);
        break;
      }
    }
    setProcessing(null);
    if (successCount === TEAM_TARGET_TIERS.length) {
      toast.success(`All ${TEAM_TARGET_TIERS.length} tiers synced to contract!`);
      // Re-fetch after delay so Admin Panel table shows updated on-chain values
      setTimeout(() => { contract.syncPlatformStats().catch(() => {}); }, 2000);
    }
  };

  const handleSetBurnBps = () => {
    const bps = parseInt(burnBpsValue, 10);
    if (isNaN(bps) || bps < 0 || bps > 5000) return;
    run('burnBps', () => contract.setBurnBps(bps), `Burn rate updated to ${(bps / 100).toFixed(2)}%`);
  };

  const EMISSION_MIN = 10_000;
  const EMISSION_MAX = 1_000_000_000; // matches contract's on-chain cap (setAnnualEmission)

  const handleSetAnnualEmission = () => {
    const emission = parseFloat(annualEmissionValue);
    if (isNaN(emission) || emission <= 0) return;
    if (emission < EMISSION_MIN) {
      toast.error(`Minimum annual emission is ${EMISSION_MIN.toLocaleString()} FBiT`);
      return;
    }
    if (emission > EMISSION_MAX) {
      toast.error(`Maximum annual emission is ${EMISSION_MAX.toLocaleString()} FBiT`);
      return;
    }
    run('annualEmission', () => contract.setAnnualEmission(emission), `Annual emission updated to ${emission.toLocaleString()} FBiT/year`);
  };

  const handleSetBaseFallbackApy = () => {
    const bps = parseInt(baseFallbackApyBps, 10);
    if (isNaN(bps) || bps < 1000 || bps > 30000) { toast.error('Base APY BPS must be 1000–30000 (10%–300%)'); return; }
    run('baseFallbackApy', () => contract.setBaseFallbackApy(bps), `Base fallback APY set to ${bps / 100}%`);
  };

  const handleUpdateUserTeamStats = () => {
    const addr = sanitizeText(teamStatsAddress);
    const size  = parseInt(teamStatsSize, 10);
    const staked = parseFloat(teamStatsTotalStaked);
    if (!isValidWalletAddress(addr)) { toast.error('Invalid wallet address'); return; }
    if (isNaN(size) || size < 0) { toast.error('Invalid team size'); return; }
    if (isNaN(staked) || staked < 0) { toast.error('Invalid team total staked'); return; }
    run(
      'updateTeamStats',
      () => contract.updateUserTeamStats(addr, size, staked),
      `Team stats updated for ${addr.slice(0, 8)}… → size: ${size}, staked: ${staked.toLocaleString()} FBiT`
    );
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-accent-rose/20 to-accent-amber/20 flex items-center justify-center animate-float">
          <span className="text-3xl">{platformStats.isRenounced ? '💰' : '⚙'}</span>
        </div>
        <h2 className="font-display text-2xl font-bold">
          {platformStats.isRenounced ? 'Fee Recipient Panel' : 'Admin Panel'}
        </h2>
        <p className="text-text-secondary max-w-sm">
          {platformStats.isRenounced
            ? 'Connect the fee recipient wallet to view your fee earnings.'
            : 'Connect the owner wallet to manage the platform.'}
        </p>
        {platformStats.isRenounced && (
          <div className="glass-card max-w-sm w-full text-left border border-accent-amber/20 bg-accent-amber/5 space-y-1 mt-2">
            <p className="text-accent-amber text-xs font-display font-semibold">Passive Fee Mode Active</p>
            <p className="text-text-muted text-xs">
              The standard 1% platform fee (on stake, unstake, claim, and compound) is sent directly to your wallet automatically — no action needed.
            </p>
          </div>
        )}
      </div>
    );
  }

  const busy = (key: string) => processing === key;

  // Determine renounced state and whether the connected wallet is the fee recipient
  const isRenounced = Boolean(platformStats.isRenounced);
  const isFeeRecipient =
    isRenounced &&
    !!platformStats.feeRecipient &&
    address.toLowerCase() === platformStats.feeRecipient.toLowerCase();

  // ── Fee Recipient View (post-renounce, former admin wallet) ────────────────
  if (isFeeRecipient) {
    const walletData = getWalletData();
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="glass-card bg-linear-to-r from-accent-amber/5 to-accent-rose/5 border-accent-amber/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display font-bold text-xl">Admin Panel</h2>
              <p className="text-text-muted text-sm">
                Fee Recipient · Solana
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-lg text-xs font-display font-medium bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
              🔓 Ownership Renounced
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="glass-card border border-accent-amber/20 bg-accent-amber/5 space-y-1">
          <p className="font-display font-semibold text-accent-amber text-sm">Passive Fee Mode Active</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            You have permanently renounced admin ownership. All platform controls are disabled.
            The standard <span className="text-accent-amber font-semibold">1% platform fee</span> — the
            same fee that always applied on stake, unstake, claim, and compound — is automatically
            sent to your wallet instead of the former admin's. No action required on your part.
          </p>
        </div>

        {/* Fee Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Total Fees Earned</p>
            <p className="font-display font-bold text-2xl text-accent-amber">
              {formatNumber(platformStats.totalFeesCollected ?? 0)}
            </p>
            <p className="text-text-muted text-xs mt-1">
              FBiT collected <UsdValue amount={platformStats.totalFeesCollected ?? 0} priceUsd={fbitPriceUsd} />
            </p>
          </div>
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Fee Rate</p>
            <p className="font-display font-bold text-2xl text-brand-400">1%</p>
            <p className="text-text-muted text-xs mt-1">of stake, unstake, claim & compound</p>
          </div>
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Your Balance</p>
            <p className="font-display font-bold text-2xl text-accent-cyan">
              {formatNumber(walletData?.tokenBalance ?? 0)}
            </p>
            <p className="text-text-muted text-xs mt-1">
              FBiT in wallet <UsdValue amount={walletData?.tokenBalance ?? 0} priceUsd={fbitPriceUsd} />
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="glass-card space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-text-secondary">How Fees Work</h3>
          <div className="space-y-2 text-xs text-text-secondary">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/40 border border-white/5">
              <span className="text-accent-amber mt-0.5">●</span>
              <span>Fees are transferred automatically on every user Claim or Compound — directly into your wallet. No manual action needed.</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/40 border border-white/5">
              <span className="text-accent-amber mt-0.5">●</span>
              <span>The fee is drawn from the reward pool separately — users receive 100% of their earned reward with no deductions.</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/40 border border-white/5">
              <span className="text-accent-amber mt-0.5">●</span>
              <span>This arrangement is permanent and irreversible. Even without connecting your wallet, fees continue to arrive on-chain.</span>
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        {(walletData?.transactions.filter(t => t.type === 'admin') ?? []).length > 0 && (
          <div className="glass-card space-y-3">
            <p className="text-xs text-text-muted font-display uppercase tracking-wider">Recent History</p>
            <div className="space-y-1.5">
              {walletData?.transactions.filter(t => t.type === 'admin').slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/40 border border-white/5 text-xs">
                  <span className="text-text-secondary">{tx.label}</span>
                  <span className="text-text-muted font-mono">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card bg-linear-to-r from-accent-amber/5 to-accent-rose/5 border-accent-amber/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-xl">Admin Panel</h2>
            <p className="text-text-muted text-sm">
              Manage the FBiT Staking platform on Solana
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-display font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
              ⬡ On-Chain
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-display font-medium ${
              platformStats.isPaused
                ? 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20'
                : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
            }`}>
              {platformStats.isPaused ? '⏸ Paused' : '● Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Contract setup notice */}
      <ContractSetupNotice />

      {/* Renounced banner — shown when ownership has been given up by a different address */}
      {isRenounced && (
        <div className="glass-card border border-accent-rose/30 bg-accent-rose/5 flex items-start gap-3">
          <span className="text-accent-rose text-lg mt-0.5">🔒</span>
          <div>
            <p className="font-display font-semibold text-accent-rose text-sm">Ownership Has Been Renounced</p>
            <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
              Admin control was permanently surrendered. All management functions are disabled.
              Fee recipient: <span className="font-mono text-accent-amber">{platformStats.feeRecipient?.slice(0, 8)}…{platformStats.feeRecipient?.slice(-6)}</span> ·{' '}
              Total fees paid: <span className="text-accent-amber font-semibold">{formatNumber(platformStats.totalFeesCollected ?? 0)} FBiT</span>
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats — live from store */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'TVL',          value: formatNumber(platformStats.totalStaked),                                    color: 'text-brand-400' },
          { label: 'Users',        value: formatNumber(platformStats.totalUsers, 0),                                  color: 'text-accent-purple' },
          { label: 'Reward Pool',  value: formatNumber(platformStats.rewardPoolBalance),                              color: 'text-accent-cyan' },
          { label: 'Current APY',  value: `${Math.round((platformStats.effectiveAPY ?? 1000) / 100)}%`,             color: 'text-accent-amber' },
          { label: 'Total Burned 🔥', value: formatNumber(platformStats.totalBurned ?? 0, 8),                        color: 'text-accent-rose' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card text-center p-4">
            <p className="text-text-muted text-xs mb-1">{label}</p>
            <p className={`font-display font-bold text-lg ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800/50 border border-white/5 overflow-x-auto">
        {(['pool', 'rates', 'tiers', 'users', 'platform'] as const).map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 py-2.5 rounded-lg font-display text-sm font-medium transition-all whitespace-nowrap px-3 ${
              activeSection === s
                ? 'bg-accent-amber/10 text-accent-amber shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {s === 'pool' ? 'Reward Pool' : s === 'rates' ? 'Rates' : s === 'tiers' ? 'Team Tiers' : s === 'users' ? 'User Mgmt' : 'Platform'}
          </button>
        ))}
      </div>

      {/* ── Reward Pool ── */}
      {activeSection === 'pool' && (
        <div className="space-y-4">

          {/* ── Initialize Platform (Solana only — must be done FIRST) ── */}
          {selectedNetwork === 'solana' && platformInitialized === false && (
            <div className="glass-card border border-accent-rose/40 bg-accent-rose/5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <h3 className="font-display font-bold text-lg text-accent-rose">Platform Not Initialized</h3>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">
                    The on-chain Platform account does not exist yet. You must initialize it <span className="text-accent-rose font-semibold">once</span> before
                    any other admin action (deposit reserve, set emission, etc.) will work.
                    This creates the Platform PDA using your admin wallet.
                  </p>
                </div>
              </div>
              <AdminButton
                label="Initialize Platform (One-Time Setup)"
                loadingLabel="Initializing…"
                onClick={handleInitializePlatform}
                disabled={busy('initPlatform')}
                loading={busy('initPlatform')}
                variant="primary"
              />
            </div>
          )}

          {selectedNetwork === 'solana' && platformInitialized === null && (
            <div className="glass-card border border-white/10 py-3 text-center text-text-muted text-sm animate-pulse">
              Checking platform status…
            </div>
          )}

          {/* Fix Bump card removed — platform.bump = 253 confirmed on-chain (one-time fix done) */}

          {/* ── Auto-Emission Reserve (primary) — Both networks ── */}
          {<div className="glass-card space-y-4 border border-brand-500/20">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Auto-Emission Reserve</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                Deposit your <span className="text-brand-400 font-semibold">full token supply once</span>.
                The contract releases <span className="text-brand-400">{formatNumber(platformStats.annualEmission || 1000000)} FBiT/year</span> automatically
                into the reward pool — <span className="text-accent-cyan">no manual management ever again</span>.
              </p>
            </div>

            {/* Reserve Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Reserve',           value: `${formatNumber(platformStats.totalReserve ?? 0)} FBiT`,           color: 'text-brand-400',   usd: platformStats.totalReserve },
                { label: 'Released Total',    value: `${formatNumber(platformStats.totalEmissionReleased ?? 0)} FBiT`,  color: 'text-accent-cyan', usd: platformStats.totalEmissionReleased },
                { label: 'Releasable Now',    value: `${formatNumber(platformStats.releasableEmission ?? 0)} FBiT`,     color: 'text-accent-amber',usd: platformStats.releasableEmission },
                { label: 'Reward Pool',       value: `${formatNumber(platformStats.rewardPoolBalance)} FBiT`,           color: 'text-accent-purple',usd: platformStats.rewardPoolBalance },
              ].map(({ label, value, color, usd }) => (
                <div key={label} className="p-3 rounded-xl bg-surface-800/40 border border-white/5 text-center">
                  <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">{label}</p>
                  <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
                  {usd !== undefined && <UsdValue amount={usd} priceUsd={fbitPriceUsd} className="text-[10px] block mt-0.5" />}
                </div>
              ))}
            </div>

            {platformStats.emissionStartTime && platformStats.emissionStartTime > 0 ? (
              <p className="text-xs text-text-muted">
                Emission clock started: <span className="text-text-secondary font-mono">
                  {new Date(platformStats.emissionStartTime * 1000).toLocaleDateString()}
                </span>
              </p>
            ) : (
              <p className="text-xs text-accent-amber">⚠ Reserve not yet funded — deposit tokens to start the emission clock.</p>
            )}
            {!isRenounced && (
              <p className="text-xs text-accent-rose">
                ⚠ <span className="font-semibold">Deposit before renouncing ownership.</span> Once renounced, the reserve cannot be topped up — only auto-release continues.
              </p>
            )}

            {/* Deposit Reserve */}
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">
                Deposit Amount (FBiT) — Min: {RESERVE_MIN} · Max: {RESERVE_MAX.toLocaleString()}
              </label>
              <input
                type="number"
                value={reserveAmount}
                onChange={(e) => setReserveAmount(e.target.value)}
                placeholder={`e.g. ${RESERVE_MAX}`}
                min={RESERVE_MIN}
                max={RESERVE_MAX}
                className="input-field font-mono"
              />
              {(() => {
                const n = parseFloat(reserveAmount);
                if (reserveAmount && n > 0 && n < RESERVE_MIN) return <p className="text-accent-rose text-xs mt-1">Minimum deposit is {RESERVE_MIN} FBiT</p>;
                if (reserveAmount && n > RESERVE_MAX) return <p className="text-accent-rose text-xs mt-1">Maximum deposit is {RESERVE_MAX.toLocaleString()} FBiT</p>;
                return null;
              })()}
            </div>
            <AdminButton
              label={isRenounced ? 'Deposit Disabled (Ownership Renounced)' : 'Deposit Full Reserve (One-Time)'}
              loadingLabel="Depositing…"
              onClick={handleDepositReserve}
              disabled={
                isRenounced ||
                !reserveAmount ||
                parseFloat(reserveAmount) < RESERVE_MIN ||
                parseFloat(reserveAmount) > RESERVE_MAX
              }
              loading={busy('reserve')}
              variant="primary"
            />

            {/* Manual release trigger — always visible, disabled when nothing to release */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              {(platformStats.releasableEmission ?? 0) > 0 ? (
                <p className="text-xs text-accent-amber">
                  <span className="font-semibold">{formatNumber(platformStats.releasableEmission ?? 0)} FBiT</span> is available now.
                  Releases automatically on the next claim/compound — or trigger manually.
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  No emission available to release yet. Tokens accumulate at {formatNumber(platformStats.annualEmission || 1000000)} FBiT/year.
                </p>
              )}
              <AdminButton
                label={(platformStats.releasableEmission ?? 0) > 0
                  ? `Release ${formatNumber(platformStats.releasableEmission ?? 0)} FBiT Now`
                  : 'Release Emission (Nothing Available)'}
                loadingLabel="Releasing…"
                onClick={handleReleaseEmission}
                disabled={(platformStats.releasableEmission ?? 0) <= 0}
                loading={busy('release')}
                variant="amber"
              />
            </div>
          </div>}

          {/* ── Fund Reward Pool ── */}
          <div className="glass-card space-y-4 border border-accent-cyan/20">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Fund Reward Pool</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                Apne wallet se directly reward pool me FBiT daalo. Stakers ko yahan se rewards milenge.
              </p>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">Amount (FBiT)</label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="e.g. 250000000"
                min={0.1}
                max={250_000_000}
                className="input-field font-mono"
              />
              {fundAmount && parseFloat(fundAmount) > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  Pool badhkar <span className="text-brand-400 font-mono">{formatNumber(platformStats.rewardPoolBalance + parseFloat(fundAmount))} FBiT</span> ho jayega
                </p>
              )}
            </div>
            <AdminButton
              label={`Fund Reward Pool${fundAmount && parseFloat(fundAmount) > 0 ? ` — ${formatNumber(parseFloat(fundAmount))} FBiT` : ''}`}
              loadingLabel="Funding…"
              onClick={handleFund}
              disabled={isRenounced || !fundAmount || parseFloat(fundAmount) <= 0}
              loading={busy('fund')}
              variant="cyan"
            />
            {isRenounced && (
              <p className="text-xs text-accent-rose">⚠ Ownership renounce hone ke baad direct funding disabled hai.</p>
            )}
          </div>

        </div>
      )}

      {/* ── Rates ── */}
      {activeSection === 'rates' && (
        <div className="space-y-4">
          <div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Referral System</h3>
            <p className="text-text-muted text-xs -mt-2">
              Master on/off switch for the entire 10-level referral system. This is <strong>not</strong> a
              percentage — the contract only checks whether this value is zero or non-zero. The actual
              per-level reward percentages are set separately below, under "Referral Level Percentages".
            </p>
            <div className={`p-3 rounded-xl border text-sm font-display font-semibold text-center ${
              platformStats.referralRewardRate > 0
                ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                : 'bg-accent-rose/10 border-accent-rose/20 text-accent-rose'
            }`}>
              Referral System is currently {platformStats.referralRewardRate > 0 ? 'ON' : 'OFF'}
            </div>
            <AdminButton
              label={platformStats.referralRewardRate > 0 ? 'Turn Referral System OFF' : 'Turn Referral System ON'}
              loadingLabel="Updating…"
              onClick={handleToggleReferralSystem}
              disabled={isRenounced}
              loading={busy('referralRate')}
              variant={platformStats.referralRewardRate > 0 ? 'rose' : 'cyan'}
            />
          </div>

          {/* Per-level referral percentages — Solana only */}
          {selectedNetwork === 'solana' && (
            <div className="glass-card space-y-4">
              <h3 className="font-display font-semibold text-lg">Referral Level Percentages</h3>
              <p className="text-text-muted text-xs -mt-2">
                Set reward % for each of the 10 referral levels (in BPS — 100&nbsp;=&nbsp;1%).
                Total must be ≤ 5000 (50%). Current total:{' '}
                <span className="text-accent-cyan font-mono">
                  {refPct.reduce((s, v) => s + v, 0)} BPS ({(refPct.reduce((s, v) => s + v, 0) / 100).toFixed(2)}%)
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {refPct.map((val, i) => (
                  <div key={i}>
                    <label
                      htmlFor={`refPct-${i}`}
                      className="text-xs text-text-secondary font-display mb-1 block"
                    >
                      L{i + 1} BPS
                    </label>
                    <input
                      id={`refPct-${i}`}
                      type="number"
                      min={0}
                      max={5000}
                      value={val}
                      placeholder="0"
                      title={`Level ${i + 1} referral percentage in basis points`}
                      onChange={(e) => {
                        const next = [...refPct];
                        next[i] = Math.max(0, parseInt(e.target.value) || 0);
                        setRefPct(next);
                      }}
                      className="input-field font-mono text-sm w-full"
                    />
                  </div>
                ))}
              </div>
              <p className="text-text-muted text-xs">
                Default: L1=25, L2=50, L3=125, L4=150, L5=200, L6=325, L7=350, L8=425, L9=550, L10=800
              </p>
              <AdminButton
                label="Update Referral Levels"
                loadingLabel="Updating…"
                onClick={handleSetReferralPercentages}
                disabled={isRenounced || refPct.reduce((s, v) => s + v, 0) > 5000}
                loading={busy('refPct')}
                variant="cyan"
              />
            </div>
          )}

          {/* Burn BPS update — both networks */}
          {<div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Burn Percentage</h3>
            <p className="text-text-muted text-xs -mt-2">
              Percentage of user's reward burned on every claim / compound via SPL Token burn — permanently removes tokens from total supply (not a transfer to dead wallet).
              Range: <span className="text-brand-400">0% – 50%</span>.
            </p>

            {/* BURN INACTIVE warning */}
            {(platformStats.burnBps ?? 0) === 0 && (
              <div className="p-3 rounded-xl bg-accent-rose/15 border border-accent-rose/40 text-sm space-y-2">
                <p className="font-semibold text-accent-rose">Burn is INACTIVE — 0% burn rate on-chain</p>
                <p className="text-text-muted text-xs">No FBiT is being burned when users claim or compound. Set a burn rate to start permanently reducing total supply.</p>
                <button
                  type="button"
                  onClick={() => { setBurnBpsValue('1000'); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-rose/20 border border-accent-rose/40 text-accent-rose font-semibold hover:bg-accent-rose/30 transition-colors"
                >
                  Fill 1000 bps (10% default)
                </button>
              </div>
            )}

            <div className="p-3 rounded-xl bg-accent-rose/5 border border-accent-rose/10 text-xs text-text-muted space-y-1">
              <p>On-chain burn rate: <span className="text-accent-rose font-mono font-semibold">{((platformStats.burnBps ?? 0) / 100).toFixed(2)}%</span> ({platformStats.burnBps ?? 0} bps)</p>
              <p>Example: 100 FBiT reward → <span className="text-accent-rose font-semibold">{((platformStats.burnBps ?? 0) / 100).toFixed(2)} FBiT permanently burned</span> (SPL burn, reduces total supply), {(100 - (platformStats.burnBps ?? 0) / 100).toFixed(2)} FBiT to user</p>
            </div>
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">New Burn Rate (basis points — 100 bps = 1%)</label>
              <input
                type="number"
                min="0"
                max="5000"
                value={burnBpsValue}
                onChange={(e) => setBurnBpsValue(e.target.value)}
                placeholder="e.g. 1000 = 10%, 2500 = 25%, 0 = disable burn"
                className="input-field font-mono"
              />
            </div>
            <AdminButton
              label={(platformStats.burnBps ?? 0) === 0 ? 'Activate Burn' : 'Update Burn Rate'}
              loadingLabel="Updating…"
              onClick={handleSetBurnBps}
              disabled={isRenounced || burnBpsValue === '' || parseInt(burnBpsValue) < 0 || parseInt(burnBpsValue) > 5000}
              loading={busy('burnBps')}
              variant="rose"
            />
          </div>}

          {/* Annual Emission update — both networks */}
          {<div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Annual Emission (PoS APY)</h3>
            <p className="text-text-muted text-xs -mt-2">
              Total FBiT distributed to stakers per year. APY auto-adjusts:
              <span className="text-brand-400 font-mono"> APY = emission ÷ totalStaked</span>, clamped between <span className="text-brand-400">10%</span> and <span className="text-brand-400">300%</span>.
              More stakers → APY girta hai. Fewer stakers → APY badhta hai.
            </p>

            {/* Current live stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">Current Emission</p>
                <p className="font-mono font-bold text-accent-cyan text-sm">{(platformStats.annualEmission ?? 0).toLocaleString()}</p>
                <p className="text-text-muted text-[10px]">FBiT/year</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">Total Staked</p>
                <p className="font-mono font-bold text-brand-400 text-sm">{(platformStats.totalStaked ?? 0).toLocaleString()}</p>
                <p className="text-text-muted text-[10px]">FBiT</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-800/50 border border-white/5">
                <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">Current APY</p>
                <p className={`font-mono font-bold text-sm ${
                  (platformStats.effectiveAPY ?? 0) >= 30000 ? 'text-accent-rose' :
                  (platformStats.effectiveAPY ?? 0) <= 1000  ? 'text-accent-amber' : 'text-brand-400'
                }`}>
                  {Math.round((platformStats.effectiveAPY ?? 1000) / 100)}%
                </p>
                <p className="text-text-muted text-[10px]">
                  {(platformStats.effectiveAPY ?? 0) >= 30000 ? '⚠ MAX cap' :
                   (platformStats.effectiveAPY ?? 0) <= 1000  ? '⚠ MIN cap' : '✓ Dynamic'}
                </p>
              </div>
            </div>

            {/* APY target calculator */}
            {(() => {
              const staked = platformStats.totalStaked ?? 0;
              if (staked === 0) return (
                <div className="p-3 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-xs text-accent-amber">
                  ⚠ Abhi koi stake nahi hai — jab users stake karenge tab APY dynamically change hoga.
                  Pehle kuch tokens stake karo phir emission set karo.
                </div>
              );
              const emFor300 = Math.ceil(staked * 3.0);
              const emFor100 = Math.ceil(staked * 1.0);
              const emFor10  = Math.ceil(staked * 0.1);
              return (
                <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 space-y-2">
                  <p className="text-xs font-display text-text-secondary font-semibold">
                    APY Calculator — Total Staked: <span className="text-brand-400 font-mono">{staked.toLocaleString()} FBiT</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <button
                      type="button"
                      onClick={() => setAnnualEmissionValue(String(emFor300))}
                      className="p-2 rounded-lg bg-accent-rose/10 border border-accent-rose/20 hover:bg-accent-rose/20 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-accent-rose">300% APY</p>
                      <p className="font-mono text-text-muted mt-0.5">{emFor300.toLocaleString()}</p>
                      <p className="text-[10px] text-text-muted">FBiT/year</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnualEmissionValue(String(emFor100))}
                      className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-brand-400">100% APY</p>
                      <p className="font-mono text-text-muted mt-0.5">{emFor100.toLocaleString()}</p>
                      <p className="text-[10px] text-text-muted">FBiT/year</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnualEmissionValue(String(emFor10))}
                      className="p-2 rounded-lg bg-accent-amber/10 border border-accent-amber/20 hover:bg-accent-amber/20 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-accent-amber">10% APY</p>
                      <p className="font-mono text-text-muted mt-0.5">{emFor10.toLocaleString()}</p>
                      <p className="text-[10px] text-text-muted">FBiT/year</p>
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted text-center">↑ Click any button to auto-fill</p>
                </div>
              );
            })()}

            {/* Input + live preview */}
            <div className="space-y-2">
              <label className="text-sm text-text-secondary font-display block">
                New Annual Emission (FBiT/year)
              </label>
              <input
                type="number"
                value={annualEmissionValue}
                onChange={(e) => setAnnualEmissionValue(e.target.value)}
                placeholder="e.g. 500000"
                min={10_000}
                className="input-field font-mono"
              />
              {/* Live APY preview */}
              {(() => {
                const n      = parseFloat(annualEmissionValue);
                const staked = platformStats.totalStaked ?? 0;
                if (!annualEmissionValue || isNaN(n) || n <= 0) return null;
                if (n < EMISSION_MIN) return <p className="text-accent-rose text-xs mt-1">Minimum 10,000 FBiT/year</p>;
                let previewApy = staked > 0 ? Math.round((n / staked) * 100) : 300;
                previewApy = Math.min(300, Math.max(10, previewApy));
                const color = previewApy >= 300 ? 'text-accent-rose' : previewApy <= 10 ? 'text-accent-amber' : 'text-brand-400';
                return (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-surface-800/50 border border-white/5 text-xs">
                    <span className="text-text-muted">Preview APY:</span>
                    <span className={`font-mono font-bold ${color}`}>{previewApy}%</span>
                    {previewApy >= 300 && <span className="text-accent-rose">(MAX cap — emission bahut zyada hai)</span>}
                    {previewApy <= 10  && <span className="text-accent-amber">(MIN cap — emission kam hai)</span>}
                  </div>
                );
              })()}
            </div>

            <AdminButton
              label="Update Annual Emission"
              loadingLabel="Updating…"
              onClick={handleSetAnnualEmission}
              disabled={
                isRenounced ||
                !annualEmissionValue ||
                parseFloat(annualEmissionValue) < EMISSION_MIN ||
                parseFloat(annualEmissionValue) > EMISSION_MAX
              }
              loading={busy('annualEmission')}
              variant="purple"
            />
          </div>}
          {/* Base Fallback APY — Solana only, used when emission = 0 */}
          {selectedNetwork === 'solana' && (
            <div className="glass-card space-y-4">
              <h3 className="font-display font-semibold text-lg">Base Fallback APY (Solana)</h3>
              <p className="text-text-muted text-xs -mt-2">
                Fallback APY used <em>only when annual emission is not configured</em>.
                Once emission is set, PoS APY (emission ÷ totalStaked) overrides this automatically.
                Range: <span className="text-brand-400">10% – 300%</span> (1000–30000 BPS).
              </p>
              <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 text-xs text-text-muted">
                Current base APY: <span className="text-accent-cyan font-mono">{Math.round((platformStats.effectiveAPY ?? 1000) / 100)}%</span> (effective — may be overridden by PoS emission)
              </div>
              <div>
                <label className="text-sm text-text-secondary font-display mb-1 block">New Base APY (BPS — 1000 = 10%, 30000 = 300%)</label>
                <input
                  type="number"
                  min="1000"
                  max="30000"
                  value={baseFallbackApyBps}
                  onChange={(e) => setBaseFallbackApyBps(e.target.value)}
                  placeholder="e.g. 30000 = 300%"
                  className="input-field font-mono"
                />
              </div>
              <AdminButton
                label="Set Base Fallback APY"
                loadingLabel="Setting…"
                onClick={handleSetBaseFallbackApy}
                disabled={isRenounced || baseFallbackApyBps === '' || parseInt(baseFallbackApyBps) < 1000 || parseInt(baseFallbackApyBps) > 30000}
                loading={busy('baseFallbackApy')}
                variant="cyan"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Team Target Tiers ── */}
      {activeSection === 'tiers' && (
        <div className="space-y-4">
          {/* Current tier table */}
          <div className="glass-card">
            <h3 className="font-display font-semibold text-lg mb-1">Team Target Bonus Tiers</h3>
            <p className="text-text-muted text-xs mb-4">
              10 tiers applied on top of staking rewards. Bonus is based on the user's team total staked FBiT.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-text-muted font-display uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-2 pr-4">Tier</th>
                    <th className="text-left py-2 pr-4">Label</th>
                    <th className="text-right py-2 pr-4">Min Team Staked</th>
                    <th className="text-right py-2">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTiers.map((tier, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-4 text-text-muted">{i + 1}</td>
                      <td className="py-2 pr-4 font-display font-medium text-text-primary">{TEAM_TARGET_TIERS[i]?.label ?? `Tier ${i + 1}`}</td>
                      <td className="py-2 pr-4 text-right text-text-secondary">
                        {Number(tier.minTeamStaked).toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-brand-400 font-semibold">
                        +{(Number(tier.bonusBps) / 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Update a single tier */}
          <div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Update a Tier</h3>
            <p className="text-text-muted text-xs -mt-2">
              Override any tier's minimum team staked threshold and bonus BPS on-chain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="tier-index-select" className="text-sm text-text-secondary font-display mb-1 block">
                  Tier (0 = Tier 1)
                </label>
                <select
                  id="tier-index-select"
                  value={tierIndex}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const idx = parseInt(e.target.value);
                    setTierIndex(e.target.value);
                    const t = liveTiers[idx];
                    if (t) {
                      setTierMinStaked(String(t.minTeamStaked));
                      setTierBonusBps(String(t.bonusBps));
                    }
                  }}
                  className="input-field font-mono"
                >
                  {liveTiers.map((t, i) => (
                    <option key={i} value={String(i)}>
                      {i}: {TEAM_TARGET_TIERS[i]?.label ?? `Tier ${i + 1}`} (+{(Number(t.bonusBps) / 100).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-text-secondary font-display mb-1 block">
                  Min Team Staked <span className="text-accent-amber font-semibold">(FBiT tokens)</span>
                </label>
                <input
                  type="number"
                  value={tierMinStaked}
                  onChange={(e) => setTierMinStaked(e.target.value)}
                  placeholder="e.g. 50000"
                  className="input-field font-mono"
                />
                <p className="text-xs text-text-muted mt-1">
                  Enter whole FBiT units (e.g. 50000 = 50,000 FBiT). Converted to lamports on-chain automatically.
                </p>
              </div>

              <div>
                <label className="text-sm text-text-secondary font-display mb-1 block">
                  Bonus BPS (max 1000 = 10%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={tierBonusBps}
                  onChange={(e) => setTierBonusBps(e.target.value)}
                  placeholder="e.g. 200 = 2%"
                  className="input-field font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted p-3 rounded-xl bg-surface-800/40 border border-white/5">
              <span className="text-accent-amber">⚑</span>
              Preview: Tier {parseInt(tierIndex) + 1} —{' '}
              {tierMinStaked ? Number(tierMinStaked).toLocaleString() : '—'} FBiT →{' '}
              <span className="text-brand-400 font-semibold">
                +{tierBonusBps ? (parseInt(tierBonusBps) / 100).toFixed(2) : '—'}%
              </span>
            </div>

            <AdminButton
              label="Update Tier On-Chain"
              loadingLabel="Updating…"
              onClick={handleSetTeamTier}
              disabled={isRenounced || tierMinStaked === '' || tierBonusBps === '' || !(parseInt(tierBonusBps) >= 0 && parseInt(tierBonusBps) <= 1000) || !(parseFloat(tierMinStaked) > 0)}
              loading={busy('teamTier')}
              variant="amber"
            />
          </div>

          {/* Sync all tiers at once */}
          <div className="glass-card space-y-3 border border-brand-500/20 bg-brand-500/5">
            <div>
              <h3 className="font-display font-semibold text-base">Sync All 10 Tiers to Contract</h3>
              <p className="text-text-muted text-xs mt-1">
                Applies current frontend tier values to the smart contract in one go — all 10 tiers sequentially.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-text-muted">
              {TEAM_TARGET_TIERS.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-800/40 border border-white/5">
                  <span className="text-text-secondary">T{i + 1} {t.label}</span>
                  <span className="text-brand-400">{t.minTeamStaked.toLocaleString()} FBiT · +{t.bonusPercentage}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted">Above values will be synced to contract. Current on-chain values shown in the table above.</p>
            <AdminButton
              label="Sync All Tiers to Contract"
              loadingLabel="Syncing tiers… (10 transactions)"
              onClick={handleSyncAllTiers}
              disabled={isRenounced || processing !== null}
              loading={processing === 'syncAllTiers'}
              variant="brand"
            />
          </div>
        </div>
      )}

      {/* ── User Management ── */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Block / Unblock */}
          <div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Block / Unblock User</h3>
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">Wallet Address</label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="Enter full wallet address…"
                className="input-field font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminButton
                label="Block User"
                loadingLabel="Blocking…"
                onClick={handleBlock}
                disabled={isRenounced || !userAddress.trim()}
                loading={busy('block')}
                variant="rose"
              />
              <AdminButton
                label="Unblock User"
                loadingLabel="Unblocking…"
                onClick={handleUnblock}
                disabled={isRenounced || !userAddress.trim()}
                loading={busy('unblock')}
                variant="primary"
              />
            </div>
          </div>

          {/* Blocked Users List */}
          <div className="glass-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">
                Blocked Users {hasFetchedBlocked && <span className="text-text-muted font-normal text-sm">({blockedUsers.length})</span>}
              </h3>
              <button
                type="button"
                onClick={refreshBlockedUsers}
                disabled={isFetchingBlocked}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
                title="Refresh blocked users list"
              >
                <span className={isFetchingBlocked ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
              </button>
            </div>

            {isFetchingBlocked ? (
              <p className="text-text-muted text-sm text-center py-4 animate-pulse">Scanning on-chain state…</p>
            ) : blockedUsers.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">
                {hasFetchedBlocked ? 'No blocked users.' : 'Loading…'}
              </p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(({ address: addr, totalStaked }) => (
                  <div
                    key={addr}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-800/40 border border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-accent-rose truncate">{addr}</p>
                      <p className="text-text-muted text-[11px] mt-0.5">{formatNumber(totalStaked)} FBiT staked</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockFromList(addr)}
                      disabled={isRenounced || processing !== null}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-display font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy('unblock') ? 'Unblocking…' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-text-muted text-[10px]">
              {selectedNetwork === 'solana'
                ? 'Scanned directly from on-chain program accounts — always complete and current.'
                : 'Reconstructed from block/unblock events over the last ~2M blocks (~11 days). Older actions outside this window may not appear.'}
            </p>
          </div>

          {/* Update Team Stats — Solana only */}
          {selectedNetwork === 'solana' && (
            <div className="glass-card space-y-4 border border-accent-cyan/20">
              <div>
                <h3 className="font-display font-semibold text-lg">Update User Team Stats</h3>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">
                  Manually set a user's <span className="text-accent-cyan">teamSize</span> and <span className="text-accent-cyan">teamTotalStaked</span> on-chain.
                  Use this after indexing stake/unstake events for accurate team bonus calculations.
                  <span className="text-brand-400"> Solana only.</span>
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-secondary font-display mb-1 block">User Wallet Address</label>
                  <input
                    type="text"
                    value={teamStatsAddress}
                    onChange={(e) => setTeamStatsAddress(e.target.value)}
                    placeholder="Enter full wallet address…"
                    className="input-field font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-text-secondary font-display mb-1 block">Team Size (members)</label>
                    <input
                      type="number"
                      min="0"
                      value={teamStatsSize}
                      onChange={(e) => setTeamStatsSize(e.target.value)}
                      placeholder="e.g. 15"
                      className="input-field font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary font-display mb-1 block">Team Total Staked (FBiT)</label>
                    <input
                      type="number"
                      min="0"
                      value={teamStatsTotalStaked}
                      onChange={(e) => setTeamStatsTotalStaked(e.target.value)}
                      placeholder="e.g. 250000"
                      className="input-field font-mono"
                    />
                  </div>
                </div>
              </div>
              <AdminButton
                label="Update Team Stats On-Chain"
                loadingLabel="Updating…"
                onClick={handleUpdateUserTeamStats}
                disabled={isRenounced || !teamStatsAddress.trim() || !teamStatsSize || !teamStatsTotalStaked}
                loading={busy('updateTeamStats')}
                variant="cyan"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Platform Controls ── */}
      {activeSection === 'platform' && (
        <div className="glass-card space-y-4">
          <h3 className="font-display font-semibold text-lg">Platform Controls</h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-white/5">
            <div>
              <p className="font-display font-medium">Platform Status</p>
              <p className="text-text-muted text-sm mt-0.5">
                {platformStats.isPaused
                  ? 'Platform is paused. All operations are disabled.'
                  : 'Platform is active and processing transactions.'}
              </p>
            </div>
            <AdminButton
              label={platformStats.isPaused ? 'Unpause' : 'Pause'}
              loadingLabel={platformStats.isPaused ? 'Resuming…' : 'Pausing…'}
              onClick={handleTogglePause}
              disabled={isRenounced}
              loading={busy('pause')}
              variant={platformStats.isPaused ? 'primary' : 'rose'}
            />
          </div>

          <div className="p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/10">
            <p className="text-accent-amber font-display font-medium text-sm mb-1">⚠ Warning</p>
            <p className="text-text-muted text-xs">
              Pausing the platform prevents all staking, claiming, and unstaking operations. Use only in emergencies.
            </p>
          </div>

          {/* Renounce Ownership */}
          <div className={`p-4 rounded-xl border space-y-3 ${isRenounced ? 'bg-surface-800/20 border-white/5 opacity-60' : 'bg-accent-rose/5 border-accent-rose/20'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-display font-medium flex items-center gap-2">
                  🔓 Renounce Ownership
                  {isRenounced && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-rose/10 text-accent-rose border border-accent-rose/20 font-normal">
                      Renounced
                    </span>
                  )}
                </p>
                <p className="text-text-muted text-sm mt-0.5">
                  {isRenounced
                    ? `Ownership permanently renounced. Fee recipient: ${platformStats.feeRecipient?.slice(0, 10)}…`
                    : 'Permanently surrender admin control. The standard 1% platform fee keeps flowing to you forever. Irreversible.'}
                </p>
              </div>
              <AdminButton
                label="Renounce Ownership"
                loadingLabel="Renouncing…"
                onClick={() => setRenounceConfirm(true)}
                disabled={isRenounced || busy('renounce')}
                loading={busy('renounce')}
                variant="rose"
              />
            </div>
            {!isRenounced && (
              <div className="text-xs text-text-muted p-3 rounded-xl bg-surface-800/40 border border-white/5 space-y-1">
                <p><span className="text-accent-amber">●</span> You will permanently lose all admin privileges.</p>
                <p><span className="text-accent-cyan">●</span> The same 1% platform fee that already applies on stake, unstake, claim, and compound keeps applying — it just routes to you instead of the former admin.</p>
                <p><span className="text-brand-400">●</span> Burn still applies too: 10% of the remainder (after the 1% fee) is burned on every claim/compound.</p>
                <p><span className="text-accent-purple">●</span> Example (claim): user earns 1 FBiT gross → 0.01 to you (1% fee) → 0.099 burned (10% of the rest) → user gets 0.891 FBiT.</p>
                <p><span className="text-accent-rose">●</span> This action cannot be undone, even by deploying a new contract.</p>
              </div>
            )}
          </div>

          {/* Renounce Confirmation Modal */}
          {renounceConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
              <div className="glass-card max-w-md w-full space-y-5 border border-accent-rose/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-rose/20 flex items-center justify-center shrink-0">
                    <span className="text-xl">⚠</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-accent-rose">Confirm Renouncement</h3>
                    <p className="text-text-muted text-xs">This action is permanent and irreversible</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>By confirming, you agree to:</p>
                  <ul className="space-y-1.5 text-xs pl-3">
                    <li className="flex items-start gap-2"><span className="text-accent-rose mt-0.5">✕</span> Permanently lose all admin rights — fund pool, set rates, block users, pause platform, update APYs</li>
                    <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">✓</span> The standard <strong className="text-white">1% platform fee</strong> (stake, unstake, claim, compound) keeps applying — it just routes to your wallet instead of the former admin's</li>
                    <li className="flex items-start gap-2"><span className="text-accent-amber mt-0.5">🔥</span> Burn still applies too: 10% of the remainder (after the 1% fee) is burned on every claim/compound</li>
                    <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">✓</span> Fees accumulate indefinitely with no further action required</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRenounceConfirm(false)}
                    className="flex-1 py-3 rounded-xl font-display font-medium text-sm bg-surface-700 text-text-secondary hover:bg-surface-600 transition-colors border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRenounceOwnership}
                    className="flex-1 py-3 rounded-xl font-display font-bold text-sm bg-accent-rose/20 text-accent-rose border border-accent-rose/30 hover:bg-accent-rose/30 transition-colors"
                  >
                    Yes, Renounce Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent admin transactions */}
          {(walletData?.transactions.filter(t => t.type === 'admin') ?? []).length > 0 && (
            <div>
              <p className="text-xs text-text-muted font-display uppercase tracking-wider mb-2">Recent Admin Actions</p>
              <div className="space-y-1.5">
                {walletData?.transactions.filter(t => t.type === 'admin').slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/40 border border-white/5 text-xs">
                    <span className="text-text-secondary">{tx.label}</span>
                    <span className="text-text-muted font-mono">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminButton({
  label, loadingLabel, onClick, disabled, loading, variant,
}: {
  label: string; loadingLabel: string; onClick: () => void;
  disabled: boolean; loading: boolean; variant: 'primary' | 'purple' | 'cyan' | 'rose' | 'amber' | 'brand';
}) {
  const base = 'py-3 px-6 rounded-xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2';
  const colors = {
    primary: 'btn-primary',
    purple:  'bg-accent-purple/20 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/30',
    cyan:    'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/30',
    rose:    'bg-accent-rose/10 text-accent-rose border border-accent-rose/20 hover:bg-accent-rose/20',
    amber:   'bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/20',
    brand:   'btn-primary',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${disabled || loading ? 'bg-surface-700 text-text-muted cursor-not-allowed border border-white/5' : colors[variant]}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}
