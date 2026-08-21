'use client';

import React from 'react';
import Reveal from './Reveal';

const PHASES = [
  {
    phase: '01',
    icon: '🏗️',
    title: 'Foundation',
    status: 'Complete',
    items: [
      'Solana staking platform live',
      '10-level referral system',
      'Team Target Bonus tiers',
      'Auto-emission reserve system',
      'Deflationary burn mechanism',
      'Non-custodial, open-source contracts',
    ],
  },
  {
    phase: '02',
    icon: '🛡️',
    title: 'Consolidation & Security',
    status: 'Current',
    items: [
      'FBiT token v2 — fixed supply, renounced mint authority',
      '100% liquidity locked/burned',
      'Team & marketing allocations under 10-year vesting',
      'Independent smart contract audit',
      'Whitepaper & documentation finalized',
    ],
  },
  {
    phase: '03',
    icon: '📈',
    title: 'Market Expansion',
    status: 'Planned',
    items: [
      'Additional DEX liquidity depth',
      'Community & marketing growth campaigns',
      'DeFi ecosystem partnerships',
      'Continued platform hardening',
    ],
  },
  {
    phase: '04',
    icon: '🏛️',
    title: 'Exchange Listings & Governance',
    status: 'Planned',
    items: [
      'Tier-2 / Tier-3 CEX listing outreach',
      'Tier-1 CEX listing readiness — compliance, market-making, liquidity depth',
      'DAO governance for protocol parameters',
    ],
  },
  {
    phase: '05',
    icon: '🚀',
    title: 'Long-Term Vision',
    status: 'Planned',
    items: [
      'Additional chain deployments',
      'Expanded FBiT token utility',
      'Ongoing audits & security reviews',
    ],
  },
];

const STATUS_STYLE: Record<string, string> = {
  Complete: 'text-brand-400 bg-brand-500/10 border-brand-500/30',
  Current:  'text-accent-amber bg-accent-amber/10 border-accent-amber/30',
  Planned:  'text-text-muted bg-white/5 border-white/10',
};

const DOT_STYLE: Record<string, string> = {
  Complete: 'border-brand-500 bg-brand-500/20',
  Current:  'border-accent-amber bg-accent-amber/20 shadow-[0_0_16px_rgba(251,191,36,0.5)]',
  Planned:  'border-white/20 bg-surface-800',
};

const RAIL_SEGMENT: Record<string, string> = {
  Complete: 'from-brand-500/70 to-brand-500/70',
  Current:  'from-accent-amber/70 to-white/25',
  Planned:  'from-white/25 to-white/25',
};

export default function LandingRoadmap() {
  return (
    <section id="roadmap" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Roadmap</h2>
          <p className="text-text-muted text-sm max-w-xl mx-auto">
            Goals we're building toward — not guarantees of a specific exchange or date.
          </p>
        </div>
      </Reveal>

      <div className="relative pl-10 sm:pl-14">
        {PHASES.map((p, i) => (
          <Reveal key={p.phase} delay={i * 90}>
            <div className="relative pb-8 last:pb-0">
              {/* Rail segment connecting this node to the next */}
              {i < PHASES.length - 1 && (
                <span
                  className={`absolute -left-6.75 sm:-left-8.75 top-6 bottom-0 w-0.5 bg-linear-to-b ${RAIL_SEGMENT[p.status]}`}
                />
              )}

              {/* Node */}
              <span
                className={`absolute -left-10 sm:-left-14 top-0 w-6.75 h-6.75 sm:w-7.75 sm:h-7.75 rounded-full border-2 flex items-center justify-center ${DOT_STYLE[p.status]}`}
              >
                {p.status === 'Complete' && <span className="text-brand-400 text-xs">✓</span>}
                {p.status === 'Current' && <span className="w-2 h-2 rounded-full bg-accent-amber animate-pulse" />}
              </span>

              <div
                className={`glass-card relative overflow-hidden ${
                  p.status === 'Current' ? 'border-accent-amber/30 shadow-[0_0_28px_rgba(251,191,36,0.08)]' : ''
                }`}
              >
                {/* Ghost phase numeral */}
                <span className="absolute -right-2 -top-4 font-display font-black text-7xl sm:text-8xl text-white/4 select-none leading-none">
                  {p.phase}
                </span>

                <div className="relative flex flex-wrap items-center gap-2.5 mb-3">
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Phase {p.phase}</span>
                  <h3 className="font-display font-semibold text-lg mr-auto">{p.title}</h3>
                  <span className={`text-[11px] font-display font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <ul className="relative space-y-1.5">
                  {p.items.map((item) => (
                    <li key={item} className="text-text-muted text-sm flex items-start gap-2">
                      <span className="text-text-muted/50 mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
