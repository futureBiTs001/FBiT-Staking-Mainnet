'use client';

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { polygon, solana } from '@reown/appkit/networks';

// Primary:  dashboard.walletconnect.com
// Fallback: dashboard.reown.com
const PRIMARY_PROJECT_ID  = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID  ?? '').trim();
const FALLBACK_PROJECT_ID = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID_2 ?? '').trim();

const ethersAdapter = new EthersAdapter();

// Phantom, Solflare, and Backpack are all Wallet Standard-compliant and are
// auto-detected by SolanaAdapter without being listed here. Explicitly passing
// their legacy @solana/wallet-adapter-* adapters registered a second, competing
// connector for the same installed extension — when a user picked Phantom,
// two connect() calls raced against the one extension, and Phantom's own
// single-flight guard declined the second with "a previous request is still
// active". Leave this to auto-detection only.
const solanaAdapter = new SolanaAdapter({
  wallets: [],
});

export let appKitModal: ReturnType<typeof createAppKit> | undefined;

// Holds the Reown-connected Solana wallet provider so solana.ts can use the
// exact wallet the user chose (prevents Binance sessions falling through to
// a separately-installed Phantom extension).
export let solanaWalletProvider: any = undefined;

// The Solana address currently connected via Reown (base58). Used to
// verify that a window-injected extension (Phantom etc.) is actually the
// wallet the user chose, rather than a different installed extension.
export let connectedSolanaAddress: string | null = null;

if (typeof window !== 'undefined') {
  const siteUrl = window.location.origin;

  const config = {
    adapters:       [ethersAdapter, solanaAdapter],
    networks:       [polygon, solana] as [typeof polygon, typeof solana],
    defaultNetwork: polygon,
    metadata: {
      name:        'Future Bit (FBiT) Staking',
      description: 'Multi-Chain FBiT Token Staking & Referral Platform',
      url:         siteUrl,
      icons:       [`${siteUrl}/favicon.ico`],
    },
    features: {
      analytics:        false,
      email:            false,
      socials:          [],
      emailShowWallets: false,
      swaps:            false,
      onramp:           false,
    },
    featuredWalletIds: [
      '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance Web3 Wallet
    ],
    allWallets: 'SHOW' as const,
    themeMode: 'dark' as const,
    themeVariables: {
      '--w3m-accent':               '#00E5B4',
      '--w3m-border-radius-master': '12px',
      '--w3m-font-family':          'inherit',
      '--w3m-z-index':              9999,
    },
  };

  const ids = [PRIMARY_PROJECT_ID, FALLBACK_PROJECT_ID].filter(Boolean);

  for (const projectId of ids) {
    try {
      appKitModal = createAppKit({ ...config, projectId });
      break;
    } catch (err) {
      console.warn(`[FBiT] WalletConnect init failed (project: ${projectId}):`, err);
    }
  }

  if (!appKitModal) {
    console.warn('[FBiT] WalletConnect unavailable — both project IDs failed to initialize.');
  } else {
    appKitModal.subscribeProviders((providers: any) => {
      solanaWalletProvider = providers?.solana ?? undefined;
    });

    appKitModal.subscribeAccount((account: any) => {
      if (!account?.isConnected) {
        connectedSolanaAddress = null;
        return;
      }
      const caip = account?.caipAddress ?? '';
      const addr = account?.address ?? '';
      if (caip.startsWith('solana:') || (!caip && addr && !addr.startsWith('0x'))) {
        connectedSolanaAddress = addr;
      } else {
        connectedSolanaAddress = null;
      }
    });
  }
}
