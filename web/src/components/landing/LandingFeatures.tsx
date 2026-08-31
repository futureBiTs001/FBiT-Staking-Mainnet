'use client';

import React from 'react';
import Reveal from './Reveal';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Built on Solana',
    desc: 'Fast finality and low transaction fees — stake, claim, and compound without the gas costs of other chains.',
    color: 'text-accent-purple',
  },
  {
    icon: '📈',
    title: 'Dynamic PoS APY',
    desc: 'APY adjusts automatically with total staked — no fixed promises, fully on-chain and transparent.',
    color: 'text-brand-400',
  },
  {
    icon: '◎',
    title: '10-Level Referrals',
    desc: 'Earn commission up to 10 levels deep — up to 17.75% total, paid automatically on-chain.',
    color: 'text-accent-cyan',
  },
  {
    icon: '🎯',
    title: 'Team Target Bonus',
    desc: 'Grow your team\'s total stake to unlock extra bonus tiers on top of your base APY.',
    color: 'text-accent-amber',
  },
  {
    icon: '🔥',
    title: 'Deflationary Burn',
    desc: 'A portion of every claim is burned on-chain, permanently reducing total supply.',
    color: 'text-accent-rose',
  },
  {
    icon: '🔒',
    title: 'Non-Custodial',
    desc: 'Your tokens never leave your wallet. No KYC, no sign-up — connect and stake directly.',
    color: 'text-brand-400',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-10">
          <h2 className="text-gradient font-display font-extrabold text-3xl sm:text-4xl mb-2">How It Works</h2>
          <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto">
            Everything runs on-chain — no middlemen, no custody, no hidden logic.
          </p>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 80}>
            <div className="glass-card h-full transition-transform duration-300 hover:-translate-y-1.5">
              <div className={`text-2xl mb-3 ${f.color}`}>{f.icon}</div>
              <h3 className="font-display font-semibold text-base mb-1.5">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
