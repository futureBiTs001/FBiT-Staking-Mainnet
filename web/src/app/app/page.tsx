'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from '@/lib/store';
import { useBotGuard } from '@/hooks/useBotGuard';
import Header from '@/components/layout/Header';
import BotChallenge from '@/components/ui/BotChallenge';

// Each tab's code (and its transitive deps — Anchor, recharts, the Jupiter
// swap widget, etc.) is only fetched when that tab is actually opened,
// instead of all six bundling into the initial page load.
const TabLoading = () => (
  <div className="glass-card flex items-center justify-center py-24 text-text-muted text-sm animate-pulse">
    Loading…
  </div>
);
const Dashboard    = dynamic(() => import('@/components/staking/Dashboard'),      { loading: TabLoading });
const StakePanel   = dynamic(() => import('@/components/staking/StakePanel'),     { loading: TabLoading });
const SwapPanel    = dynamic(() => import('@/components/market/SwapPanel'),       { loading: TabLoading });
const ReferralPanel = dynamic(() => import('@/components/referral/ReferralPanel'), { loading: TabLoading });
const CalculatorPanel = dynamic(() => import('@/components/staking/CalculatorPanel'), { loading: TabLoading });
const AdminPanel   = dynamic(() => import('@/components/admin/AdminPanel'),       { loading: TabLoading });
const HistoryPanel = dynamic(() => import('@/components/history/HistoryPanel'),   { loading: TabLoading });

export default function AppPage() {
  const { activeTab, isAdmin } = useAppStore();
  const {
    challengeNeeded,
    challengeRiskLevel,
    onChallengeSolved,
    onChallengeDismissed,
  } = useBotGuard();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'stake':     return <StakePanel />;
      case 'swap':      return <SwapPanel />;
      case 'referral':  return <ReferralPanel />;
      case 'calculator': return <CalculatorPanel />;
      case 'history':   return <HistoryPanel />;
      case 'admin':     return isAdmin ? <AdminPanel /> : <Dashboard />;
      default:          return <Dashboard />;
    }
  };

  return (
    <>
      {challengeNeeded && challengeRiskLevel && (
        <BotChallenge
          riskLevel={challengeRiskLevel}
          onSolved={onChallengeSolved}
          onDismiss={onChallengeDismissed}
        />
      )}

      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#162033',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#00E676', secondary: '#0f1729' } },
          error:   { iconTheme: { primary: '#fb7185', secondary: '#0f1729' } },
        }}
      />

      <Header />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {renderContent()}
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FBiT logo" className="w-6 h-6 rounded-full object-cover" />
              <span className="font-display text-sm text-text-muted">FutureBit</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap justify-center">
              <span>Solana</span>
              <span>·</span>
              <span>10-Level Referrals</span>
              <span>·</span>
              <span>Up to 300% APY</span>
              <span>·</span>
              <Link href="/about" className="hover:text-brand-400 transition-colors">About</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
