import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'App — Stake, Swap & Earn',
  description: 'Connect your Solana wallet to stake FBiT, swap, track referrals, and claim rewards.',
  alternates: {
    canonical: '/app/',
  },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
