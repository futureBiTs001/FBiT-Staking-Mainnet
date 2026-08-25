import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppKitProvider } from '@/providers/AppKitProvider';
import { WalletProvider } from '@/context/WalletContext';

export const metadata: Metadata = {
  title: 'App — Stake, Swap & Earn',
  description: 'Connect your Solana wallet to stake FBiT, swap, track referrals, and claim rewards.',
};

// Wallet SDK (Reown AppKit + WalletConnect + Solana adapter) is scoped to
// this route only — the marketing pages have no wallet UI and shouldn't
// pay for its JS bundle.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppKitProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </AppKitProvider>
  );
}
