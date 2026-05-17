'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@/context/WalletContext';
import { isAdminAddress } from '@/context/WalletContext';
import { useAppStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { useContract } from '@/hooks/useContract';
import { TEAM_TARGET_TIERS } from '@/types';
import { checkRateLimit, isValidWalletAddress, isValidAmount, isValidBonusBps, sanitizeText, sanitizeErrorMessage } from '@/lib/security';
import ContractSetupNotice from '@/components/ui/ContractSetupNotice';

export default function AdminPanel() {
  const { address } = useWallet();
  const { selectedNetwork, platformStats, updatePlatformStats, addTransaction, getWalletData } = useAppStore();
  const contract = useContract();

  // null = checking, true = initialized, false = not initialized
  const [platformInitialized, setPlatformInitialized] = useState<boolean | null>(null);

  const [fundAmount, setFundAmount]         = useState('');
  const [reserveAmount, setReserveAmount]   = useState('');
  const [refundAmount, setRefundAmount]     = useState('');
  const [rewardRate, setRewardRate]         = useState('');
  const [referralRate, setReferralRate] = useState('');
  const [userAddress, setUserAddress]   = useState('');
  const [processing, setProcessing]       = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'pool' | 'rates' | 'users' | 'tiers' | 'platform'>('pool');
  const [renounceConfirm, setRenounceConfirm] = useState(false);

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

  // Base fallback APY (Solana only — used when emission = 0)
  const [baseFallbackApyBps, setBaseFallbackApyBps] = useState('');

  // Burn unused pool (Polygon only)
  const [burnPoolAmount, setBurnPoolAmount] = useState('');

  // Emergency withdraw (Polygon only, whenPaused)
  const [emergencyToken,  setEmergencyToken]  = useState('');
  const [emergencyTo,     setEmergencyTo]     = useState('');
  const [emergencyAmount, setEmergencyAmount] = useState('');

  // Update User Team Stats state (Solana only)
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
    if (!address || !isAdminAddress(address)) {
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
    if (selectedNetwork !== 'solana' || !contract.isLive) {
      setPlatformInitialized(true); // Polygon is always "initialized"
      return;
    }
    setPlatformInitialized(null);
    contract.isPlatformInitialized()
      .then(ok => setPlatformInitialized(ok))
      .catch(() => setPlatformInitialized(false));
  }, [selectedNetwork, contract.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInitializePlatform = () => {
    run('initPlatform', () => contract.initializePlatform(), 'Platform initialized successfully! Proceed to deposit reserve.');
    // Re-check after a short delay so the UI updates
    setTimeout(() => {
      contract.isPlatformInitialized().then(ok => setPlatformInitialized(ok)).catch(() => {});
    }, 5000);
  };

  const RESERVE_MIN = 1;
  const RESERVE_MAX = 800_000_000;

  const handleDepositReserve = () => {
    const n = parseFloat(reserveAmount);
    if (!n || n <= 0) return;
    if (n < RESERVE_MIN) {
      toast.error('Minimum deposit is 1 FBiT');
      return;
    }
    if (n > RESERVE_MAX) {
      toast.error('Maximum deposit is 800,000,000 FBiT (800M)');
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

  const handleRefundRewardPool = () => {
    const n = parseFloat(refundAmount);
    if (!n || n <= 0) { toast.error('Enter a valid refund amount'); return; }
    if (n > platformStats.rewardPoolBalance) { toast.error('Amount exceeds reward pool balance'); return; }
    run('refundPool', () => contract.refundRewardPool(n), `Refunded ${formatNumber(n)} FBiT from reward pool to wallet`);
  };

  const handleSetRewardRate = () => {
    const n = parseInt(rewardRate, 10);
    if (!n || n <= 0) return;
    run('rewardRate', () => contract.setRewardRate(n), `Reward rate updated to ${n / 100}%`);
  };

  const handleSetReferralRate = () => {
    const n = parseInt(referralRate, 10);
    if (!n || n <= 0) return;
    run('referralRate', () => contract.setReferralRewardRate(n), `Referral rate updated to ${n / 100}%`);
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

  const handleTogglePause = () =>
    run('pause', () => contract.togglePause(platformStats.isPaused), platformStats.isPaused ? 'Platform resumed' : 'Platform paused');

  const handleBurnUnusedPool = () => {
    const n = parseFloat(burnPoolAmount);
    if (!isValidAmount(n)) { toast.error('Enter a valid amount to burn.'); return; }
    run('burnPool', () => contract.burnUnusedPool(n), `Burned ${formatNumber(n)} WFBIT from unused pool`);
  };

  const handleEmergencyWithdraw = () => {
    const token = sanitizeText(emergencyToken);
    const to    = sanitizeText(emergencyTo);
    const n     = parseFloat(emergencyAmount);
    if (!isValidWalletAddress(token)) { toast.error('Invalid token address.'); return; }
    if (!isValidWalletAddress(to))    { toast.error('Invalid recipient address.'); return; }
    if (!isValidAmount(n))            { toast.error('Enter a valid amount.'); return; }
    run('emergencyWithdraw', () => contract.emergencyWithdraw(token, to, n), `Emergency withdrew ${formatNumber(n)} tokens to ${to.slice(0, 8)}…`);
  };


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
      'Ownership renounced — 25% passive fee active',
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
    if (!address || !isAdminAddress(address)) {
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
  const EMISSION_MAX = 1_000_000;

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

  const handleTriggerHalving = () =>
    run('halving', () => contract.triggerHalving(), '4-year halving triggered — base APY halved');

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
              25% of every gross reward (claim & compound) is sent directly to your wallet from pool automatically — no action needed.
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
                Fee Recipient · {selectedNetwork === 'solana' ? 'Solana' : 'Polygon'}
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
            A <span className="text-accent-amber font-semibold">25% passive fee</span> is automatically
            sent to your wallet from the reward pool each time any user Claims or Compounds — no
            action required on your part.
          </p>
        </div>

        {/* Fee Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Total Fees Earned</p>
            <p className="font-display font-bold text-2xl text-accent-amber">
              {formatNumber(platformStats.totalFeesCollected ?? 0)}
            </p>
            <p className="text-text-muted text-xs mt-1">FBiT collected</p>
          </div>
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Fee Rate</p>
            <p className="font-display font-bold text-2xl text-brand-400">25%</p>
            <p className="text-text-muted text-xs mt-1">of gross reward on every claim / compound</p>
          </div>
          <div className="glass-card text-center p-5">
            <p className="text-text-muted text-xs font-display uppercase tracking-wider mb-2">Your Balance</p>
            <p className="font-display font-bold text-2xl text-accent-cyan">
              {formatNumber(walletData?.tokenBalance ?? 0)}
            </p>
            <p className="text-text-muted text-xs mt-1">FBiT in wallet</p>
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
              Manage the FBiT Staking platform on {selectedNetwork === 'solana' ? 'Solana' : 'Polygon'}
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
          ...(selectedNetwork === 'polygon' ? [
            { label: 'Reserve',   value: formatNumber(platformStats.totalReserve ?? 0),                              color: 'text-brand-400' },
          ] : []),
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
                { label: 'Reserve',           value: `${formatNumber(platformStats.totalReserve ?? 0)} FBiT`,           color: 'text-brand-400' },
                { label: 'Released Total',    value: `${formatNumber(platformStats.totalEmissionReleased ?? 0)} FBiT`,  color: 'text-accent-cyan' },
                { label: 'Releasable Now',    value: `${formatNumber(platformStats.releasableEmission ?? 0)} FBiT`,     color: 'text-accent-amber' },
                { label: 'Reward Pool',       value: `${formatNumber(platformStats.rewardPoolBalance)} FBiT`,           color: 'text-accent-purple' },
                ...(selectedNetwork === 'polygon' && platformStats.remainingYears !== undefined ? [
                  { label: 'Remaining Years', value: `${platformStats.remainingYears} yrs`,                            color: 'text-brand-400' },
                ] : []),
                ...(selectedNetwork === 'polygon' && platformStats.maxPendingRewards !== undefined ? [
                  { label: 'Max Pending',     value: `${formatNumber(platformStats.maxPendingRewards)} FBiT`,           color: 'text-accent-rose' },
                ] : []),
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl bg-surface-800/40 border border-white/5 text-center">
                  <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">{label}</p>
                  <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
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
                Deposit Amount (FBiT) — Min: 1 · Max: 800,000,000
              </label>
              <input
                type="number"
                value={reserveAmount}
                onChange={(e) => setReserveAmount(e.target.value)}
                placeholder="e.g. 800000000"
                min={1}
                max={800_000_000}
                className="input-field font-mono"
              />
              {(() => {
                const n = parseFloat(reserveAmount);
                if (reserveAmount && n > 0 && n < RESERVE_MIN) return <p className="text-accent-rose text-xs mt-1">Minimum deposit is 1 FBiT</p>;
                if (reserveAmount && n > RESERVE_MAX) return <p className="text-accent-rose text-xs mt-1">Maximum deposit is 800,000,000 FBiT (800M)</p>;
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

          {/* ── Fund Reward Pool — Solana: primary card; Polygon: collapsed fallback ── */}
          {selectedNetwork === 'solana' ? (
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
                  placeholder="e.g. 800000000"
                  min={1}
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
          ) : (
            <details className="glass-card space-y-4">
              <summary className="font-display font-semibold text-sm text-text-secondary cursor-pointer select-none">
                Manual Pool Top-Up (fallback)
              </summary>
              <p className="text-text-muted text-xs mt-2">
                Add tokens directly to the reward pool. Use only if the auto-emission reserve was not funded.
              </p>
              <div>
                <label className="text-sm text-text-secondary font-display mb-1 block">Amount (FBiT)</label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="e.g. 100000"
                  className="input-field font-mono"
                />
              </div>
              <AdminButton
                label="Fund Reward Pool"
                loadingLabel="Funding…"
                onClick={handleFund}
                disabled={isRenounced || !fundAmount || parseFloat(fundAmount) <= 0}
                loading={busy('fund')}
                variant="cyan"
              />
            </details>
          )}

          {/* ── Refund Pool Reward ── */}
          {selectedNetwork === 'solana' && (
            <div className="glass-card space-y-4 border border-accent-rose/20">
              <div>
                <h3 className="font-display font-semibold text-lg mb-1">Refund Pool Reward</h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Withdraw tokens from the reward pool back to your admin wallet.
                  Only available on <span className="text-brand-400 font-semibold">Solana</span>.
                  Cannot be used after ownership is renounced.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-800/40 border border-white/5 text-center">
                  <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">Reward Pool Balance</p>
                  <p className="font-mono font-semibold text-sm text-accent-cyan">{formatNumber(platformStats.rewardPoolBalance)} FBiT</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-800/40 border border-white/5 text-center">
                  <p className="text-text-muted text-[10px] font-display uppercase tracking-wider mb-1">After Refund</p>
                  <p className="font-mono font-semibold text-sm text-accent-amber">
                    {refundAmount && parseFloat(refundAmount) > 0
                      ? formatNumber(Math.max(0, platformStats.rewardPoolBalance - parseFloat(refundAmount)))
                      : formatNumber(platformStats.rewardPoolBalance)}{' '}FBiT
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary font-display mb-1 block">
                  Refund Amount (FBiT) — Max: {formatNumber(platformStats.rewardPoolBalance)}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    min={1}
                    className="input-field font-mono flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setRefundAmount(platformStats.rewardPoolBalance.toFixed(0))}
                    className="px-3 py-2 rounded-lg text-xs font-display bg-accent-rose/10 text-accent-rose border border-accent-rose/20 hover:bg-accent-rose/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {refundAmount && parseFloat(refundAmount) > platformStats.rewardPoolBalance && (
                  <p className="text-accent-rose text-xs mt-1">Amount exceeds reward pool balance</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-accent-rose/5 border border-accent-rose/10 text-xs text-text-muted">
                <p className="text-accent-rose font-semibold mb-1">⚠ Warning</p>
                <p>Withdrawing from the reward pool reduces the funds available for user rewards. Ensure enough balance remains to cover pending user claims.</p>
              </div>

              <AdminButton
                label={isRenounced ? 'Refund Disabled (Ownership Renounced)' : `Refund ${refundAmount ? formatNumber(parseFloat(refundAmount) || 0) : '0'} FBiT to Wallet`}
                loadingLabel="Refunding…"
                onClick={handleRefundRewardPool}
                disabled={
                  isRenounced ||
                  !refundAmount ||
                  parseFloat(refundAmount) <= 0 ||
                  parseFloat(refundAmount) > platformStats.rewardPoolBalance
                }
                loading={busy('refundPool')}
                variant="rose"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Rates ── */}
      {activeSection === 'rates' && (
        <div className="space-y-4">
          <div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Reward Rate</h3>
            <p className="text-text-muted text-xs -mt-2">
              Current: <span className="text-accent-purple font-mono">{platformStats.rewardRate / 100}%</span> ({platformStats.rewardRate} bps)
            </p>
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">
                New rate (basis points — 1000 = 10%)
              </label>
              <input
                type="number"
                value={rewardRate}
                onChange={(e) => setRewardRate(e.target.value)}
                placeholder={`Current: ${platformStats.rewardRate}`}
                className="input-field font-mono"
              />
            </div>
            <AdminButton
              label="Update Reward Rate"
              loadingLabel="Updating…"
              onClick={handleSetRewardRate}
              disabled={isRenounced || !rewardRate || parseInt(rewardRate) <= 0}
              loading={busy('rewardRate')}
              variant="purple"
            />
          </div>

          <div className="glass-card space-y-4">
            <h3 className="font-display font-semibold text-lg">Referral Reward Rate</h3>
            <p className="text-text-muted text-xs -mt-2">
              Current: <span className="text-accent-cyan font-mono">{platformStats.referralRewardRate / 100}%</span> ({platformStats.referralRewardRate} bps)
            </p>
            <div>
              <label className="text-sm text-text-secondary font-display mb-1 block">
                New rate (basis points)
              </label>
              <input
                type="number"
                value={referralRate}
                onChange={(e) => setReferralRate(e.target.value)}
                placeholder={`Current: ${platformStats.referralRewardRate}`}
                className="input-field font-mono"
              />
            </div>
            <AdminButton
              label="Update Referral Rate"
              loadingLabel="Updating…"
              onClick={handleSetReferralRate}
              disabled={isRenounced || !referralRate || parseInt(referralRate) <= 0}
              loading={busy('referralRate')}
              variant="cyan"
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

          {/* Halving Mechanism — Solana only, permissionless */}
          {selectedNetwork === 'solana' && (() => {
            const SECS_PER_PERIOD = 1460 * 24 * 60 * 60; // 4-year halving
            const INITIAL_EMISSION = 1_000_000;
            const MIN_VALID_TS = 1_000_000_000;  // Sep 2001
            const MAX_VALID_TS = 4_102_444_800;  // Jan 2100
            const epoch           = platformStats.halvingEpoch   ?? 0;
            const hStartRaw       = platformStats.halvingStartTime ?? 0;
            const hStart          = (hStartRaw >= MIN_VALID_TS && hStartRaw <= MAX_VALID_TS) ? hStartRaw : 0;
            const nowSecs         = Math.floor(Date.now() / 1000);
            const nextHalvingAt   = hStart > 0 ? hStart + (epoch + 1) * SECS_PER_PERIOD : 0;
            const secsUntil       = nextHalvingAt > 0 ? nextHalvingAt - nowSecs : 0;
            const halvingDue      = secsUntil <= 0 && hStart > 0;

            const daysUntil    = Math.floor(secsUntil / 86400);
            const hoursUntil   = Math.floor((secsUntil % 86400) / 3600);
            const minsUntil    = Math.floor((secsUntil % 3600) / 60);
            const countdownStr = halvingDue
              ? '⚡ Halving overdue — ready to trigger!'
              : nextHalvingAt > 0
                ? `${daysUntil}d ${hoursUntil}h ${minsUntil}m`
                : 'Not started';

            // Back-calculate the epoch-0 emission from current on-chain value + halving epoch
            const currentEmission = platformStats.annualEmission > 0 ? platformStats.annualEmission : INITIAL_EMISSION;
            const initialEmission = currentEmission * Math.pow(2, epoch);

            // Show 6 epochs in schedule table
            const schedule = Array.from({ length: 6 }, (_, i) => ({
              epoch: i,
              emission: initialEmission / Math.pow(2, i),
              active: i === epoch,
            }));

            return (
              <div className="glass-card space-y-4 border border-accent-amber/20 bg-accent-amber/5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                      ⚡ Halving Mechanism
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                        Epoch {epoch}
                      </span>
                    </h3>
                    <p className="text-text-muted text-xs mt-0.5">
                      Reward emission halves every 4 years — 50% cut each cycle. Permissionless (auto-triggered by platform).
                    </p>
                  </div>
                </div>

                {/* Countdown */}
                <div className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${halvingDue ? 'bg-accent-rose/10 border-accent-rose/30' : 'bg-surface-800/40 border-white/5'}`}>
                  <span className="text-xl">{halvingDue ? '🔴' : '⏱'}</span>
                  <div>
                    <p className={`font-display font-semibold text-sm ${halvingDue ? 'text-accent-rose' : 'text-text-primary'}`}>
                      {halvingDue ? 'Halving Overdue' : 'Next Halving In'}
                    </p>
                    <p className={`font-mono text-xs mt-0.5 ${halvingDue ? 'text-accent-rose' : 'text-brand-400'}`}>
                      {countdownStr}
                    </p>
                  </div>
                  {halvingDue && (
                    <div className="ml-auto">
                      <AdminButton
                        label="Trigger Now"
                        loadingLabel="Triggering…"
                        onClick={handleTriggerHalving}
                        disabled={busy('halving')}
                        loading={busy('halving')}
                        variant="amber"
                      />
                    </div>
                  )}
                </div>

                {/* Emission Schedule */}
                <div>
                  <p className="text-xs text-text-muted font-display uppercase tracking-wider mb-2">Emission Schedule (50% Halving Every 4 Years)</p>
                  <div className="rounded-xl overflow-hidden border border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-800/60 text-text-muted">
                          <th className="text-left px-3 py-2 font-display">Year</th>
                          <th className="text-right px-3 py-2 font-display">Annual Emission</th>
                          <th className="text-right px-3 py-2 font-display">Daily Release</th>
                          <th className="text-right px-3 py-2 font-display">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map(({ epoch: ep, emission, active }) => (
                          <tr key={ep} className={`border-t border-white/5 ${active ? 'bg-accent-amber/5' : ''}`}>
                            <td className="px-3 py-2 font-mono text-text-secondary">Year {ep === 0 ? '1–4' : `${ep * 4 + 1}–${ep * 4 + 4}`}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={active ? 'text-accent-amber font-bold' : 'text-text-secondary'}>
                                {emission >= 1000 ? `${(emission / 1000).toFixed(0)}K` : emission.toFixed(0)} FBiT/yr
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-text-muted">
                              {(emission / 365).toFixed(0)} FBiT
                            </td>
                            <td className="px-3 py-2 text-right">
                              {active
                                ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent-amber/20 text-accent-amber border border-accent-amber/30">● Active</span>
                                : ep < epoch
                                  ? <span className="text-text-muted">✓ Done</span>
                                  : <span className="text-text-muted/40">Pending</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-text-muted space-y-1 p-3 rounded-xl bg-surface-800/40 border border-white/5">
                  <p><span className="text-accent-amber">●</span> Auto-triggered by the platform when 4 years elapses — no admin action needed.</p>
                  <p><span className="text-brand-400">●</span> Emission halves by 50% on every trigger — APY adjusts dynamically in real time.</p>
                  <p><span className="text-accent-rose">●</span> Contract enforces the 1460-day time lock — early calls revert automatically.</p>
                </div>

                {/* Manual trigger (always available for non-overdue state as backup) */}
                {!halvingDue && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted">Manual trigger (backup — contract rejects if time lock not met)</p>
                    <AdminButton
                      label="Force Trigger"
                      loadingLabel="Triggering…"
                      onClick={handleTriggerHalving}
                      disabled={busy('halving')}
                      loading={busy('halving')}
                      variant="amber"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Halving Schedule — Polygon (client-side display, manual action required) */}
          {selectedNetwork === 'polygon' && (() => {
            const SECS_PER_YEAR    = 365 * 24 * 60 * 60;
            const INITIAL_EMISSION = 1_000_000;
            const hStart     = platformStats.emissionStartTime ?? 0;
            const nowSecs    = Math.floor(Date.now() / 1000);
            const yearsElapsed  = hStart > 0 ? Math.floor((nowSecs - hStart) / SECS_PER_YEAR) : 0;
            const currentEpoch  = yearsElapsed;
            const schedule = Array.from({ length: 6 }, (_, i) => ({
              ep: i,
              emission: INITIAL_EMISSION / Math.pow(2, i),
              active: i === currentEpoch && hStart > 0,
            }));
            const suggestedEmission = INITIAL_EMISSION / Math.pow(2, currentEpoch);
            const onChainEmission   = platformStats.annualEmission ?? 0;
            const mismatch = hStart > 0 && Math.abs(onChainEmission - suggestedEmission) > 100;
            return (
              <div className="glass-card space-y-4 border border-accent-amber/20 bg-accent-amber/5">
                <div>
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    📅 Halving Schedule
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                      Polygon
                    </span>
                  </h3>
                  <p className="text-text-muted text-xs mt-0.5 leading-relaxed">
                    Polygon has no on-chain halving. Use <span className="text-brand-400 font-mono">Rates → Annual Emission</span> each year to manually apply the halving schedule below.
                  </p>
                </div>

                {/* Current state */}
                {hStart > 0 ? (
                  <div className={`p-3 rounded-xl border text-xs ${mismatch ? 'bg-accent-rose/10 border-accent-rose/30' : 'bg-surface-800/40 border-white/5'}`}>
                    {mismatch ? (
                      <>
                        <p className="font-display font-semibold text-accent-rose mb-1">⚠ Emission Mismatch</p>
                        <p className="text-text-muted">
                          Year {currentEpoch + 1} suggests <span className="text-accent-amber font-mono font-semibold">{suggestedEmission.toLocaleString()} FBiT/year</span>.
                          On-chain: <span className="font-mono text-text-secondary">{onChainEmission.toLocaleString()} FBiT/year</span>.
                          Update via <span className="text-brand-400">Rates → Annual Emission</span>.
                        </p>
                      </>
                    ) : (
                      <p className="text-text-muted">
                        Year {currentEpoch + 1} of schedule · <span className="text-accent-amber font-mono">{onChainEmission.toLocaleString()} FBiT/year</span> ✓
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-accent-amber p-3 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                    ⚠ Emission clock not started — deposit reserve tokens to begin.
                  </p>
                )}

                {/* Emission Schedule Table */}
                <div>
                  <p className="text-xs text-text-muted font-display uppercase tracking-wider mb-2">Emission Schedule (50% Halving Each Year)</p>
                  <div className="rounded-xl overflow-hidden border border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-800/60 text-text-muted">
                          <th className="text-left px-3 py-2 font-display">Year</th>
                          <th className="text-right px-3 py-2 font-display">Annual Emission</th>
                          <th className="text-right px-3 py-2 font-display">Daily Release</th>
                          <th className="text-right px-3 py-2 font-display">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map(({ ep, emission, active }) => (
                          <tr key={ep} className={`border-t border-white/5 ${active ? 'bg-accent-amber/5' : ''}`}>
                            <td className="px-3 py-2 font-mono text-text-secondary">Year {ep + 1}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={active ? 'text-accent-amber font-bold' : 'text-text-secondary'}>
                                {emission >= 1000 ? `${(emission / 1000).toFixed(0)}K` : emission.toFixed(0)} FBiT
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-text-muted">
                              {(emission / 365).toFixed(0)} FBiT
                            </td>
                            <td className="px-3 py-2 text-right">
                              {active
                                ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent-amber/20 text-accent-amber border border-accent-amber/30">● Active</span>
                                : ep < currentEpoch && hStart > 0
                                  ? <span className="text-text-muted">✓ Done</span>
                                  : <span className="text-text-muted/40">Pending</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-text-muted space-y-1 p-3 rounded-xl bg-surface-800/40 border border-white/5">
                  <p><span className="text-accent-amber">●</span> Unlike Solana, Polygon halving is a manual admin action — call <span className="font-mono text-brand-400">setAnnualEmission</span> each year.</p>
                  <p><span className="text-brand-400">●</span> Reserve runway: <span className="text-text-secondary font-mono">{(platformStats.remainingYears ?? 0)} years</span> remaining at current emission rate.</p>
                  <p><span className="text-accent-cyan">●</span> Max pending rewards across all stakers: <span className="font-mono text-text-secondary">{formatNumber(platformStats.maxPendingRewards ?? 0)} FBiT</span>.</p>
                </div>
              </div>
            );
          })()}

          {/* Burn Unused Pool — Polygon only */}
          {selectedNetwork === 'polygon' && (
            <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5 space-y-3">
              <div>
                <p className="font-display font-medium">Burn Unused Pool</p>
                <p className="text-text-muted text-sm mt-0.5">
                  Permanently burn excess WFBIT from the reward pool. Tokens go to the dead address.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to burn"
                  value={burnPoolAmount}
                  onChange={e => setBurnPoolAmount(e.target.value)}
                  className="flex-1 bg-surface-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-400/50"
                />
                <AdminButton
                  label="Burn"
                  loadingLabel="Burning…"
                  onClick={handleBurnUnusedPool}
                  disabled={isRenounced || !burnPoolAmount || parseFloat(burnPoolAmount) <= 0 || busy('burnPool')}
                  loading={busy('burnPool')}
                  variant="rose"
                />
              </div>
              <p className="text-xs text-text-muted">
                Pool balance: <span className="text-text-secondary font-mono">{formatNumber(platformStats.rewardPoolBalance)} WFBIT</span>
              </p>
            </div>
          )}

          {/* Emergency Withdraw — Polygon only, requires paused state */}
          {selectedNetwork === 'polygon' && (
            <div className={`p-4 rounded-xl border space-y-3 ${platformStats.isPaused ? 'bg-accent-amber/5 border-accent-amber/20' : 'bg-surface-800/30 border-white/5 opacity-60'}`}>
              <div>
                <p className="font-display font-medium flex items-center gap-2">
                  🚨 Emergency Withdraw
                  {!platformStats.isPaused && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-text-muted border border-white/10 font-normal">
                      Requires Paused
                    </span>
                  )}
                </p>
                <p className="text-text-muted text-sm mt-0.5">
                  Withdraw any token from the contract. Only available when platform is paused.
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Token address (0x…)"
                  value={emergencyToken}
                  onChange={e => setEmergencyToken(e.target.value)}
                  disabled={!platformStats.isPaused}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-400/50 disabled:opacity-40"
                />
                <input
                  type="text"
                  placeholder="Recipient address (0x…)"
                  value={emergencyTo}
                  onChange={e => setEmergencyTo(e.target.value)}
                  disabled={!platformStats.isPaused}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-400/50 disabled:opacity-40"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={emergencyAmount}
                    onChange={e => setEmergencyAmount(e.target.value)}
                    disabled={!platformStats.isPaused}
                    className="flex-1 bg-surface-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-400/50 disabled:opacity-40"
                  />
                  <AdminButton
                    label="Withdraw"
                    loadingLabel="Withdrawing…"
                    onClick={handleEmergencyWithdraw}
                    disabled={!platformStats.isPaused || busy('emergencyWithdraw')}
                    loading={busy('emergencyWithdraw')}
                    variant="rose"
                  />
                </div>
              </div>
            </div>
          )}

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
                    : 'Permanently surrender admin control. Earn 25% passive fees forever. Irreversible.'}
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
                <p><span className="text-brand-400">●</span> Burn still applies: 10% of user's gross reward is burned from their share on every claim / compound.</p>
                <p><span className="text-accent-cyan">●</span> Additionally, you receive 25% of gross reward separately from the pool — user's share is untouched by this fee.</p>
                <p><span className="text-accent-purple">●</span> Example: user earns 1 FBiT gross → 0.1 burned → user gets 0.9 FBiT · you get 0.25 FBiT from pool.</p>
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
                    <li className="flex items-start gap-2"><span className="text-accent-amber mt-0.5">🔥</span> Burn still applies: 10% of user's gross reward is burned from their share on every claim / compound</li>
                    <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">✓</span> You receive <strong className="text-white">25% of gross reward</strong> from pool — paid separately, no deduction from user (e.g. 1 FBiT gross → 0.9 to user, 0.25 to you from pool)</li>
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
