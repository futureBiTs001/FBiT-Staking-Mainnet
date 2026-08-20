'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ParticleGlobe from './ParticleGlobe';

function useResponsiveGlobeSize(): number {
  const [size, setSize] = useState(640);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setSize(w < 640 ? 420 : w < 1024 ? 560 : 700);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return size;
}

export default function LandingHero() {
  const globeSize = useResponsiveGlobeSize();

  return (
    <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 text-center overflow-hidden">
      {/* Particle globe — code-generated, represents the decentralized, global network.
          No overlay behind it — sits directly on the page's normal bg-mesh/grid background
          (from layout.tsx) so it doesn't read as a separate darker patch. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="opacity-80 animate-float">
          <ParticleGlobe size={globeSize} />
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/20 mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-xs font-display text-brand-400 tracking-wide">Live on Solana Mainnet</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.1] mb-5 animate-slide-up">
          Stake FBiT.
          <br />
          <span className="gradient-text">Earn Dynamic APY, Automatically.</span>
        </h1>

        <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in">
          A non-custodial Solana staking protocol where APY adjusts automatically with total
          staked — up to 10%-300%. Backed by a 10-level referral network and a deflationary burn
          mechanism. No KYC required, and your keys never leave your wallet.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
          <Link href="/app" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto">
            Launch App →
          </Link>
          <a href="#stats" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
            View Live Stats
          </a>
        </div>
      </div>
    </section>
  );
}
