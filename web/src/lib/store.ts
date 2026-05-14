import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  NetworkType,
  StakeEntry,
  PlatformStats,
  UserAccount,
  ReferralInfo,
  TxRecord,
  WalletData,
} from '@/types';

// ─── Empty wallet data for new connections ────────────────────────────────────
function createEmptyWalletData(address: string): WalletData {
  const now = Math.floor(Date.now() / 1000);
  const userAccount: UserAccount = {
    address,
    totalStaked: 0,
    totalRewardsEarned: 0,
    totalReferralRewards: 0,
    referrer: null,
    referralCount: 0,
    teamSize: 0,
    teamTotalStaked: 0,
    isBlocked: false,
    registeredAt: now,
  };
  const referralInfo: ReferralInfo = {
    totalReferrals: 0,
    totalReferralRewards: 0,
    referralLink: '',
    referrals: [],
    chain: [],
  };
  return {
    stakes: [],
    tokenBalance: 0,
    transactions: [],
    userAccount,
    referralInfo,
    teamStats: { teamSize: 0, teamTotalStaked: 0 },
  };
}

// ─── Platform baseline ────────────────────────────────────────────────────────
const BASE_PLATFORM_STATS: PlatformStats = {
  totalStaked: 0,
  totalUsers: 0,
  rewardPoolBalance: 0,
  rewardRate: 0,
  referralRewardRate: 0,
  isPaused: false,
  totalBurned: 0,
  annualEmission: 0,
  burnBps: 1000,
  effectiveAPY: 1000,
  totalReserve: 0,
  emissionStartTime: 0,
  totalEmissionReleased: 0,
  releasableEmission: 0,
  halvingEpoch: 0,
  halvingStartTime: 0,
  minStakeAmount: 1,
  maxStakePerUser: 500_000_000,
  lockPeriodDays: 30,
  claimIntervalSeconds: 21600,
  totalYearlyBurned: 0,
  lastYearBurnTime: 0,
  isRenounced: false,
  feeRecipient: '',
  totalFeesCollected: 0,
};

// ─── Store types ──────────────────────────────────────────────────────────────
interface AppState {
  // Network
  selectedNetwork: NetworkType;
  setSelectedNetwork: (network: NetworkType) => void;

  // Wallet (active)
  walletAddress: string | null;
  isConnected: boolean;
  setWallet: (address: string | null) => void; // kept for WalletContext compat

  // Per-wallet persistent data (key = `${network}:${address}`)
  walletStates: Record<string, WalletData>;

  // Platform — per-network cache so switching chains never leaks data
  networkPlatformStats: Record<NetworkType, PlatformStats>;
  platformStats: PlatformStats; // always = networkPlatformStats[selectedNetwork]
  updatePlatformStats: (partial: Partial<PlatformStats>) => void;

  // UI
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;

  // Stake actions (operate on active wallet)
  addStake: (stake: StakeEntry) => void;
  claimStakeReward: (id: number | string, reward: number) => void;
  compoundStakeReward: (id: number | string, reward: number) => void;
  unstakeEntry: (id: number | string) => void;
  addTransaction: (tx: TxRecord) => void;

  /**
   * Overwrite wallet state with fresh on-chain data.
   * Keeps existing transactions (local-only) intact.
   */
  loadOnChainData: (
    address: string,
    data: { stakes?: StakeEntry[]; tokenBalance?: number; userAccount?: UserAccount; referralInfo?: ReferralInfo }
  ) => void;

  // Helper: get active wallet data
  getWalletData: () => WalletData | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Network
      selectedNetwork: 'solana',
      setSelectedNetwork: (network) => set(state => ({
        selectedNetwork: network,
        // Immediately switch platformStats to the target network's cached stats
        platformStats: { ...BASE_PLATFORM_STATS, ...state.networkPlatformStats[network] },
      })),

      // ── Wallet
      walletAddress: null,
      isConnected: false,
      setWallet: (address) => {
        if (!address) {
          set({ walletAddress: null, isConnected: false });
          return;
        }
        const network  = get().selectedNetwork;
        const key      = `${network}:${address}`;
        const existing = get().walletStates[key];
        if (!existing) {
          const data = createEmptyWalletData(address);
          set(state => ({
            walletAddress: address,
            isConnected: true,
            walletStates: { ...state.walletStates, [key]: data },
          }));
        } else {
          set({ walletAddress: address, isConnected: true });
        }
      },

      // ── Per-wallet data (keyed by `${network}:${address}`)
      walletStates: {},

      // ── Platform (per-network)
      networkPlatformStats: { solana: BASE_PLATFORM_STATS, polygon: BASE_PLATFORM_STATS },
      platformStats: BASE_PLATFORM_STATS,
      updatePlatformStats: (partial) =>
        set(state => ({
          platformStats: { ...state.platformStats, ...partial },
          networkPlatformStats: {
            ...state.networkPlatformStats,
            [state.selectedNetwork]: {
              ...state.networkPlatformStats[state.selectedNetwork],
              ...partial,
            },
          },
        })),

      // ── UI
      isLoading: false,
      setIsLoading: (v) => set({ isLoading: v }),
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isAdmin: false,
      setIsAdmin: (v) => set({ isAdmin: v }),

      // ── Stake actions
      addStake: (stake) => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return;
        const key = `${net}:${addr}`;
        set(state => {
          const wd = state.walletStates[key] ?? createEmptyWalletData(addr);
          return {
            walletStates: {
              ...state.walletStates,
              [key]: {
                ...wd,
                stakes: [...wd.stakes, stake],
                tokenBalance: wd.tokenBalance - stake.amount,
                userAccount: { ...wd.userAccount, totalStaked: wd.userAccount.totalStaked + stake.amount },
              },
            },
          };
        });
      },

      claimStakeReward: (id, reward) => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return;
        const key = `${net}:${addr}`;
        const now = Math.floor(Date.now() / 1000);
        set(state => {
          const wd = state.walletStates[key] ?? createEmptyWalletData(addr);
          return {
            walletStates: {
              ...state.walletStates,
              [key]: {
                ...wd,
                stakes: wd.stakes.map(s =>
                  s.id === id ? { ...s, lastClaimAt: now, totalClaimed: s.totalClaimed + reward } : s
                ),
                tokenBalance: wd.tokenBalance + reward,
                userAccount: { ...wd.userAccount, totalRewardsEarned: wd.userAccount.totalRewardsEarned + reward },
              },
            },
          };
        });
      },

      compoundStakeReward: (id, reward) => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return;
        const key = `${net}:${addr}`;
        const now = Math.floor(Date.now() / 1000);
        set(state => {
          const wd = state.walletStates[key] ?? createEmptyWalletData(addr);
          return {
            walletStates: {
              ...state.walletStates,
              [key]: {
                ...wd,
                stakes: wd.stakes.map(s =>
                  s.id === id
                    ? { ...s, amount: s.amount + reward, lastClaimAt: now, totalClaimed: s.totalClaimed + reward }
                    : s
                ),
                userAccount: {
                  ...wd.userAccount,
                  totalStaked: wd.userAccount.totalStaked + reward,
                  totalRewardsEarned: wd.userAccount.totalRewardsEarned + reward,
                },
              },
            },
          };
        });
      },

      unstakeEntry: (id) => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return;
        const key   = `${net}:${addr}`;
        const stake = get().walletStates[key]?.stakes.find(s => s.id === id);
        if (!stake) return;
        set(state => {
          const wd = state.walletStates[key];
          return {
            walletStates: {
              ...state.walletStates,
              [key]: {
                ...wd,
                stakes: wd.stakes.map(s => s.id === id ? { ...s, isActive: false } : s),
                tokenBalance: wd.tokenBalance + stake.amount,
                userAccount: { ...wd.userAccount, totalStaked: wd.userAccount.totalStaked - stake.amount },
              },
            },
          };
        });
      },

      addTransaction: (tx) => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return;
        const key = `${net}:${addr}`;
        set(state => {
          const wd = state.walletStates[key] ?? createEmptyWalletData(addr);
          return {
            walletStates: {
              ...state.walletStates,
              [key]: { ...wd, transactions: [tx, ...wd.transactions].slice(0, 50) },
            },
          };
        });
      },

      loadOnChainData: (address, { stakes, tokenBalance, userAccount, referralInfo }) => {
        const net = get().selectedNetwork;
        const key = `${net}:${address}`;
        set(state => {
          const wd = state.walletStates[key] ?? createEmptyWalletData(address);
          return {
            walletStates: {
              ...state.walletStates,
              [key]: {
                ...wd,
                ...(stakes       !== undefined ? { stakes }       : {}),
                ...(tokenBalance !== undefined ? { tokenBalance } : {}),
                ...(userAccount  !== undefined ? { userAccount }  : {}),
                ...(referralInfo !== undefined ? { referralInfo } : {}),
              },
            },
          };
        });
      },

      getWalletData: () => {
        const { walletAddress: addr, selectedNetwork: net } = get();
        if (!addr) return null;
        return get().walletStates[`${net}:${addr}`] ?? null;
      },
    }),
    {
      name: 'fbit-staking-v6',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (undefined as any)
      ),
      // Only persist the data that must survive page refreshes
      partialize: (state) => ({
        walletStates: state.walletStates,
        networkPlatformStats: state.networkPlatformStats,
        selectedNetwork: state.selectedNetwork,
      }),
      // Merge persisted platformStats with BASE defaults so new fields (e.g. totalBurned)
      // are always present even when loading a pre-burn-halving saved state.
      merge: (persisted: any, current) => {
        const p = persisted as any ?? {};

        // Build per-network platform stats, merging with BASE defaults
        const rawNet = p.networkPlatformStats ?? {};
        const networkPlatformStats: Record<NetworkType, PlatformStats> = {
          solana:  { ...BASE_PLATFORM_STATS, ...rawNet.solana  },
          polygon: { ...BASE_PLATFORM_STATS, ...rawNet.polygon },
        };

        // Migrate: old burnBps 25% → 10%
        for (const net of ['solana', 'polygon'] as NetworkType[]) {
          if (networkPlatformStats[net].burnBps === 2500) networkPlatformStats[net].burnBps = 1000;
          // Note: effectiveAPY is refreshed live on every syncPlatformStats — do not reset cached values
        }

        // Sanitize: strip stakes with non-numeric IDs (stale data from old versions)
        const walletStates: Record<string, any> = p.walletStates ?? {};

        // Migrate pre-v6 wallet keys: plain "address" → "${network}:address"
        for (const key of Object.keys(walletStates)) {
          if (!key.includes(':')) {
            const network = key.startsWith('0x') ? 'polygon' : 'solana';
            walletStates[`${network}:${key}`] = walletStates[key];
            delete walletStates[key];
          }
        }
        for (const addr of Object.keys(walletStates)) {
          const wd = walletStates[addr];
          if (wd?.stakes) {
            wd.stakes = (wd.stakes as StakeEntry[]).filter(
              s => typeof s.id === 'number' || (typeof s.id === 'string' && s.id !== '' && Number.isFinite(parseInt(s.id, 10)))
            );
          }
        }

        const selectedNetwork: NetworkType = p.selectedNetwork ?? current.selectedNetwork;

        return {
          ...current,
          selectedNetwork,
          walletStates,
          networkPlatformStats,
          platformStats: networkPlatformStats[selectedNetwork],
        };
      },
    }
  )
);
