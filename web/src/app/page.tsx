import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingStats from '@/components/landing/LandingStats';
import LandingExchanges from '@/components/landing/LandingExchanges';
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
    <div className="min-h-screen" style={{ backgroundColor: '#050505' }}>
      <LandingHeader />

      <main className="max-w-7xl mx-auto w-full">
        <LandingHero />
        <LandingStats />
        <LandingExchanges />
        <LandingToken />
        <LandingRewards />
        <LandingTokenomics />
        <LandingSecurity />
        <LandingRoadmap />
        <LandingFeatures />
        <LandingFAQ />
      </main>

      <footer className="border-t border-white/5 mt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="FBiT logo" className="w-6 h-6 rounded-full object-cover" />
                <span className="font-display text-sm text-text-muted">FutureBit</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://x.com/FUTURBIT"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow FutureBit on X"
                  className="text-text-muted hover:text-brand-400 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://t.me/FutureBit_Community"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join FutureBit on Telegram"
                  className="text-text-muted hover:text-brand-400 transition-colors"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22.05 3.42 2.9 10.83c-1.3.52-1.29 1.24-.24 1.56l4.9 1.53 1.9 5.83c.23.63.4.88.82.88.43 0 .62-.2.84-.42l2.02-1.94 4.2 3.1c.77.43 1.33.2 1.53-.72l2.77-13.05c.3-1.14-.42-1.65-1.6-1.18ZM8.6 14.4l9.1-5.74c.44-.27.85-.13.51.17l-7.6 6.86-.29 3.1z" />
                  </svg>
                </a>
              </div>
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
    </div>
  );
}
