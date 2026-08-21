import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingStats from '@/components/landing/LandingStats';
import LandingToken from '@/components/landing/LandingToken';
import LandingTokenomics from '@/components/landing/LandingTokenomics';
import LandingSecurity from '@/components/landing/LandingSecurity';
import LandingRoadmap from '@/components/landing/LandingRoadmap';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingRewards from '@/components/landing/LandingRewards';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LiveTicker from '@/components/landing/LiveTicker';

export default function HomePage() {
  return (
    <>
      <LandingHeader />

      <main className="max-w-7xl mx-auto w-full">
        <LandingHero />
        <LandingStats />
        <LandingToken />
        <LandingRewards />
        <LandingTokenomics />
        <LandingSecurity />
        <LandingRoadmap />
        <LandingFeatures />
        <LandingFAQ />
      </main>

      <footer className="border-t border-white/5 mt-12 pb-12">
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

      <LiveTicker />
    </>
  );
}
