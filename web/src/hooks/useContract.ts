'use client';

/**
 * useContract — unified hook for on-chain interactions.
 *
 * `isLive`  → true when real contract addresses are set in env vars.
 *             When false, all action functions throw with a clear error
 *             so the UI can show the user what is missing.
 * `isReady` → isLive AND a wallet is connected.
 *
 * All action functions return { txHash, reward?, stakedAt? } on success
 * and throw on failure.
 */

import { useCallback, useMemo } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useAppStore } from '@/lib/store';
import { NETWORK_CONFIG } from '@/lib/config';

import {
  polygonFetchPlatformStats,
  polygonStake,
  polygonClaimRewards,
  polygonCompoundRewards,
  polygonUnstake,
  polygonRenounceOwnership,
  polygonFundRewardPool,
  polygonDepositReserve,
  polygonReleaseEmission,
  polygonSetRewardRate,
  polygonSetReferralRewardRate,
  polygonBlockUser,
  polygonUnblockUser,
  polygonTogglePause,
  polygonSetAnnualEmission,
  polygonSetBurnBps,
  polygonSetTeamTargetTier,
  polygonGetUserStakes,
  polygonGetTokenBalance,
  polygonGetUserAccount,
  polygonGetReferralInfo,
} from '@/lib/contracts/polygon';

import {
  solanaFetchPlatformStats,
  solanaStake,
  solanaClaimRewards,
  solanaCompoundRewards,
  solanaUnstake,
  solanaFundRewardPool,
  solanaDepositReserve,
  solanaReleaseEmission,
  solanaSetRewardRate,
  solanaSetReferralRewardRate,
  solanaBlockUser,
  solanaUnblockUser,
  solanaTogglePause,
  solanaSetAnnualEmission,
  solanaSetBurnBps,
  solanaRenounceOwnership,
  solanaSetTeamTargetTier,
  solanaGetUserStakes,
  solanaGetTokenBalance,
  solanaGetUserAccount,
  solanaGetReferralInfo,
  solanaRefundRewardPool,
  solanaTriggerHalving,
  solanaUpdateUserTeamStats,
  solanaSetBatchApy,
} from '@/lib/contracts/solana';

function isPlaceholderAddr(addr: string | undefined): boolean {
  if (!addr || addr.length < 10) return true;
  // Reject obvious placeholder strings (e.g. YOUR_POLYGON_MAINNET_CONTRACT_ADDRESS)
  if (addr.toUpperCase().startsWith('YOUR_')) return true;
  return false;
}

export interface ContractHook {
  /** true when real contract addresses are configured */
  isLive: boolean;
  /** true when isLive AND wallet connected */
  isReady: boolean;

  stake(amount: number, referrer?: string): Promise<{ txHash: string; stakedAt?: number }>;
  claimRewards(stakeId: number | string, stakedAt: number): Promise<{ txHash: string; reward: number }>;
  compoundRewards(stakeId: number | string, stakedAt: number): Promise<{ txHash: string; reward: number }>;
  unstake(stakeId: number | string, stakedAt: number): Promise<{ txHash: string }>;

  /** Fetch on-chain platform stats and sync them into the Zustand store */
  syncPlatformStats(): Promise<void>;
  /**
   * Fetch the connected wallet's on-chain stakes and token balance,
   * then merge them into the Zustand store (on-chain is source of truth).
   * Safe to call at any time; silently no-ops when wallet is disconnected.
   */
  syncUserData(): Promise<void>;

  // Admin
  /** Deposit full token supply once — auto-emission handles pool funding from here on. */
  depositReserve(amount: number): Promise<{ txHash: string }>;
  /** Manually trigger release of any available emission from reserve into pool. */
  releaseEmission(): Promise<{ txHash: string }>;
  fundRewardPool(amount: number): Promise<{ txHash: string }>;
  setRewardRate(rate: number): Promise<{ txHash: string }>;
  setReferralRewardRate(rate: number): Promise<{ txHash: string }>;
  blockUser(address: string): Promise<{ txHash: string }>;
  unblockUser(address: string): Promise<{ txHash: string }>;
  togglePause(currentlyPaused: boolean): Promise<{ txHash: string }>;
  /**
   * Update the annual emission that governs PoS APY.
   * effectiveAPY = clamp(annualEmission × 10000 / totalStaked, 6000, 25000) bps → 60%–250%
   */
  setAnnualEmission(annualEmission: number): Promise<{ txHash: string }>;
  /** Update burn percentage on claim/compound. burnBps: 0–5000 (0%–50%). Default 1000 = 10%. */
  setBurnBps(burnBps: number): Promise<{ txHash: string }>;
  /** Update a Team Target Bonus tier (index 0–9, minTeamStaked in token units, bonusBps max 1000) */
  setTeamTargetTier(index: number, minTeamStaked: number, bonusBps: number): Promise<{ txHash: string }>;
  /**
   * Permanently renounce ownership — admin loses all control but earns a 25% passive
   * fee from the reward pool on every claim/compound, paid directly to their wallet.
   * Irreversible.
   */
  renounceOwnership(): Promise<{ txHash: string }>;
  /** Withdraw tokens from the reward pool back to admin's wallet. Solana only. */
  refundRewardPool(amount: number): Promise<{ txHash: string }>;
  /** Trigger annual base-APY halving. Permissionless — anyone can call once per year. Solana only. */
  triggerHalving(): Promise<{ txHash: string }>;
  /** Set the fallback base APY BPS (6000–25000). Only active when emission=0. Solana only. */
  setBaseFallbackApy(apyBps: number): Promise<{ txHash: string }>;
  /** Admin crank: set a user's team_size and team_total_staked on-chain. Solana only. */
  updateUserTeamStats(userAddress: string, teamSize: number, teamTotalStaked: number): Promise<{ txHash: string }>;

}

export function useContract(): ContractHook {
  const { address, solanaAddress, evmAddress } = useWallet();
  const { selectedNetwork, updatePlatformStats, loadOnChainData } = useAppStore();

  // Resolve the chain-specific address for the selected network
  const chainAddress = selectedNetwork === 'solana'
    ? (solanaAddress ?? (address && !address.startsWith('0x') ? address : null))
    : (evmAddress   ?? (address && address.startsWith('0x')   ? address : null));

  const config = NETWORK_CONFIG[selectedNetwork];

  const isLive = useMemo(() => {
    // Both chains need a deployed contract address and stake token mint.
    if (isPlaceholderAddr(config.contractAddress)) return false;
    if (isPlaceholderAddr(config.stakeTokenAddress)) return false;
    // Vault addresses are NOT checked here — the vault helper functions
    // throw specific "not configured" errors when stake/claim/unstake is
    // attempted without them. Admin-only operations don't need vaults.
    return true;
  }, [config]);

  const isReady = useMemo(() => isLive && !!chainAddress, [isLive, chainAddress]);

  // ── Staking ────────────────────────────────────────────────────────────────

  const stake = useCallback(
    async (amount: number, referrer?: string) => {
      if (selectedNetwork === 'solana') {
        return solanaStake(amount, referrer);
      }
      const result = await polygonStake(amount, referrer);
      return { ...result, stakedAt: Math.floor(Date.now() / 1000) };
    },
    [selectedNetwork]
  );

  const claimRewards = useCallback(
    (stakeId: number | string, stakedAt: number) => {
      if (selectedNetwork === 'solana') return solanaClaimRewards(stakeId, stakedAt);
      return polygonClaimRewards(stakeId);
    },
    [selectedNetwork]
  );

  const compoundRewards = useCallback(
    (stakeId: number | string, stakedAt: number) => {
      if (selectedNetwork === 'solana') return solanaCompoundRewards(stakeId, stakedAt);
      return polygonCompoundRewards(stakeId);
    },
    [selectedNetwork]
  );

  const unstake = useCallback(
    (stakeId: number | string, stakedAt: number) => {
      if (selectedNetwork === 'solana') return solanaUnstake(Number(stakeId));
      return polygonUnstake(stakeId);
    },
    [selectedNetwork]
  );

  // ── Sync ──────────────────────────────────────────────────────────────────

  const SECS_PER_YEAR = 365 * 24 * 60 * 60;

  const syncPlatformStats = useCallback(async () => {
    const stats =
      selectedNetwork === 'solana'
        ? await solanaFetchPlatformStats()
        : await polygonFetchPlatformStats();
    if (!stats) return;

    updatePlatformStats(stats);

    // Auto-trigger halving when 1 year has elapsed (Solana, permissionless)
    if (
      selectedNetwork === 'solana' &&
      chainAddress &&
      stats.halvingStartTime &&
      stats.halvingStartTime > 0
    ) {
      const nowSecs    = Math.floor(Date.now() / 1000);
      const halvingDue = nowSecs >= stats.halvingStartTime + SECS_PER_YEAR;
      if (halvingDue) {
        solanaTriggerHalving()
          .then(() => {
            // Re-fetch stats after halving so UI reflects new epoch immediately
            solanaFetchPlatformStats().then(fresh => { if (fresh) updatePlatformStats(fresh); });
          })
          .catch(() => { /* contract will revert if already triggered — safe to ignore */ });
      }
    }
  }, [selectedNetwork, chainAddress, updatePlatformStats]);

  const syncUserData = useCallback(async () => {
    if (!address || !chainAddress) return;

    const tokenConfigured = !isPlaceholderAddr(config.stakeTokenAddress);

    try {
      const update: Parameters<typeof loadOnChainData>[1] = {};

      if (isLive) {
        const [stakesResult, userAccountResult, referralInfoResult] = await Promise.allSettled([
          selectedNetwork === 'solana'
            ? solanaGetUserStakes(chainAddress)
            : polygonGetUserStakes(chainAddress),
          selectedNetwork === 'solana'
            ? solanaGetUserAccount(chainAddress)
            : polygonGetUserAccount(chainAddress),
          selectedNetwork === 'solana'
            ? solanaGetReferralInfo(chainAddress)
            : polygonGetReferralInfo(chainAddress),
        ]);
        if (stakesResult.status === 'fulfilled') update.stakes = stakesResult.value;
        if (userAccountResult.status === 'fulfilled' && userAccountResult.value) update.userAccount = userAccountResult.value;
        if (referralInfoResult.status === 'fulfilled' && referralInfoResult.value) {
          update.referralInfo = referralInfoResult.value;
        } else if (update.userAccount) {
          // referralInfo fetch failed OR returned null — always synthesize from
          // userAccount so the count is never lost (covers both RPC errors and
          // cases where the contract returns null for an un-registered user).
          update.referralInfo = {
            totalReferrals:       update.userAccount.referralCount,
            totalReferralRewards: update.userAccount.totalReferralRewards,
            referralLink:         '',
            referrals:            [],
            chain:                [],
          };
        }
      }

      if (tokenConfigured) {
        const balanceResult = await Promise.allSettled([
          selectedNetwork === 'solana'
            ? solanaGetTokenBalance(chainAddress)
            : polygonGetTokenBalance(chainAddress),
        ]);
        if (balanceResult[0].status === 'fulfilled') update.tokenBalance = balanceResult[0].value;
      }

      if (Object.keys(update).length > 0) {
        loadOnChainData(address, update);
      }
    } catch (err) {
      console.warn('[useContract] syncUserData failed:', err);
    }
  }, [address, chainAddress, isLive, config, selectedNetwork, loadOnChainData]);

  // ── Admin ─────────────────────────────────────────────────────────────────

  const depositReserve = useCallback(
    (amount: number) => {
      if (selectedNetwork === 'solana') return solanaDepositReserve(amount);
      return polygonDepositReserve(amount);
    },
    [selectedNetwork]
  );

  const releaseEmission = useCallback(
    () => {
      if (selectedNetwork === 'solana') return solanaReleaseEmission();
      return polygonReleaseEmission();
    },
    [selectedNetwork]
  );

  const fundRewardPool = useCallback(
    (amount: number) => {
      if (selectedNetwork === 'solana') return solanaFundRewardPool(amount);
      return polygonFundRewardPool(amount);
    },
    [selectedNetwork]
  );

  const setRewardRate = useCallback(
    (rate: number) => {
      if (selectedNetwork === 'solana') return solanaSetRewardRate(rate);
      return polygonSetRewardRate(rate);
    },
    [selectedNetwork]
  );

  const setReferralRewardRate = useCallback(
    (rate: number) => {
      if (selectedNetwork === 'solana') return solanaSetReferralRewardRate(rate);
      return polygonSetReferralRewardRate(rate);
    },
    [selectedNetwork]
  );

  const blockUser = useCallback(
    (userAddress: string) => {
      if (selectedNetwork === 'solana') return solanaBlockUser(userAddress);
      return polygonBlockUser(userAddress);
    },
    [selectedNetwork]
  );

  const unblockUser = useCallback(
    (userAddress: string) => {
      if (selectedNetwork === 'solana') return solanaUnblockUser(userAddress);
      return polygonUnblockUser(userAddress);
    },
    [selectedNetwork]
  );

  const togglePause = useCallback(
    (currentlyPaused: boolean) => {
      if (selectedNetwork === 'solana') return solanaTogglePause();
      return polygonTogglePause(currentlyPaused);
    },
    [selectedNetwork]
  );

  const setAnnualEmission = useCallback(
    (annualEmission: number) => {
      if (selectedNetwork === 'solana') return solanaSetAnnualEmission(annualEmission);
      return polygonSetAnnualEmission(annualEmission);
    },
    [selectedNetwork]
  );

  const setBurnBps = useCallback(
    (burnBps: number) => {
      if (selectedNetwork === 'solana') return solanaSetBurnBps(burnBps);
      return polygonSetBurnBps(burnBps);
    },
    [selectedNetwork]
  );

  const setTeamTargetTier = useCallback(
    (index: number, minTeamStaked: number, bonusBps: number) => {
      if (selectedNetwork === 'solana') return solanaSetTeamTargetTier(index, minTeamStaked, bonusBps);
      return polygonSetTeamTargetTier(index, minTeamStaked, bonusBps);
    },
    [selectedNetwork]
  );

  const renounceOwnership = useCallback(
    () => {
      if (selectedNetwork === 'solana') return solanaRenounceOwnership();
      return polygonRenounceOwnership();
    },
    [selectedNetwork]
  );

  const refundRewardPool = useCallback(
    (amount: number) => {
      if (selectedNetwork === 'solana') return solanaRefundRewardPool(amount);
      return Promise.reject(new Error('Refund reward pool is not supported on Polygon.'));
    },
    [selectedNetwork]
  );

  const triggerHalving = useCallback(
    () => {
      if (selectedNetwork === 'solana') return solanaTriggerHalving();
      return Promise.reject(new Error('Trigger halving is not supported on Polygon.'));
    },
    [selectedNetwork]
  );

  const updateUserTeamStats = useCallback(
    (userAddress: string, teamSize: number, teamTotalStaked: number) => {
      if (selectedNetwork === 'solana') return solanaUpdateUserTeamStats(userAddress, teamSize, teamTotalStaked);
      return Promise.reject(new Error('Update user team stats is not supported on Polygon.'));
    },
    [selectedNetwork]
  );

  const setBaseFallbackApy = useCallback(
    (apyBps: number) => {
      if (selectedNetwork === 'solana') return solanaSetBatchApy(apyBps);
      return Promise.reject(new Error('Set base fallback APY is not supported on Polygon (use setAnnualEmission instead).'));
    },
    [selectedNetwork]
  );

  return {
    isLive,
    isReady,
    stake,
    claimRewards,
    compoundRewards,
    unstake,
    syncPlatformStats,
    syncUserData,
    depositReserve,
    releaseEmission,
    fundRewardPool,
    setRewardRate,
    setReferralRewardRate,
    blockUser,
    unblockUser,
    togglePause,
    setAnnualEmission,
    setBurnBps,
    setTeamTargetTier,
    renounceOwnership,
    refundRewardPool,
    triggerHalving,
    updateUserTeamStats,
    setBaseFallbackApy,
  };
}
