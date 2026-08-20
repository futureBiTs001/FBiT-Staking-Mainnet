'use client';

import React from 'react';
import Reveal from './Reveal';

const POINTS = [
  {
    icon: '🔒',
    title: '100% Liquidity Locked/Burned',
    desc: 'All FBiT/SOL pool liquidity is permanently locked or burned — it can never be pulled by any single wallet.',
    color: 'text-brand-400',
  },
  {
    icon: '🪙',
    title: 'Fixed Supply, No Minting',
    desc: 'Mint authority has been renounced on-chain. The 250,000,000 FBiT supply is permanent — no new tokens can ever be created.',
    color: 'text-accent-cyan',
  },
  {
    icon: '⏳',
    title: 'Team & Marketing Vesting',
    desc: 'The 0.5% team + marketing allocation is locked under a 10-year vesting schedule with a 6-month cliff before any release begins.',
    color: 'text-accent-purple',
  },
  {
    icon: '📜',
    title: 'Open-Source & Verifiable',
    desc: 'Smart contracts are open-source and verifiable on Solana Explorer — anyone can audit the code that holds their funds.',
    color: 'text-accent-amber',
  },
  {
    icon: '🔑',
    title: 'Non-Custodial',
    desc: 'Your tokens never leave your wallet. Staking, claiming, and unstaking are all direct wallet-to-contract interactions — we never hold your funds.',
    color: 'text-brand-400',
  },
  {
    icon: '🛡',
    title: 'On-Chain Bot & Abuse Protection',
    desc: 'Rate limiting, input sanitization, and behavioral risk checks protect the platform from automated abuse without ever collecting KYC data.',
    color: 'text-accent-rose',
  },
];

export default function LandingSecurity() {
  return (
    <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Built to Be Trusted</h2>
          <p className="text-text-muted text-sm max-w-xl mx-auto">
            Every claim below is independently verifiable on-chain — nothing here relies on taking our word for it.
          </p>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 70}>
            <div className="glass-card h-full transition-transform duration-300 hover:-translate-y-1.5">
              <div className={`text-2xl mb-3 ${p.color}`}>{p.icon}</div>
              <h3 className="font-display font-semibold text-base mb-1.5">{p.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{p.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
