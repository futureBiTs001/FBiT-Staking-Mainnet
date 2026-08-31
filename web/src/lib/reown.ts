'use client';

import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';

// Primary:  dashboard.walletconnect.com
// Fallback: dashboard.reown.com
const PRIMARY_PROJECT_ID  = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID  ?? '').trim();
const FALLBACK_PROJECT_ID = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID_2 ?? '').trim();

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

/**
 * True when this page is running inside Binance Web3 Wallet's own in-app DApp
 * browser. Binance's in-app browser injects a Wallet Standard-compliant Solana
 * provider directly (per their docs) — so a user already inside it should
 * connect via that auto-detected "installed" wallet, NOT via the WalletConnect
 * "Binance Web3 Wallet" featured entry in the Reown modal, which tries to
 * deep-link back out to relaunch the very app the user is already inside and
 * fails/bounces back. See WalletContext's connect() for where this is used.
 */
export function isInsideBinanceAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.binancew3w || w.ethereum?.isBinance);
}

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
    adapters:       [solanaAdapter],
    networks:       [solana] as [typeof solana],
    defaultNetwork: solana,
    metadata: {
      name:        'FutureBit',
      description: 'FBiT Token Staking & Referral Platform on Solana',
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
    // Only feature the WalletConnect-routed Binance entry when we're NOT already
    // inside Binance's own in-app browser — in that context Binance's already
    // auto-detected Wallet Standard provider is the correct pick, and featuring
    // the WC entry above it just steers users into the deep-link-to-self loop
    // that fails (see isInsideBinanceAppBrowser's doc comment).
    featuredWalletIds: isInsideBinanceAppBrowser() ? [] : [
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
