'use client';

import React from 'react';
import Reveal from './Reveal';

const PHASES = [
  {
    phase: 'Phase 1',
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
    phase: 'Phase 2',
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
    phase: 'Phase 3',
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
    phase: 'Phase 4',
    title: 'Exchange Listings & Governance',
    status: 'Planned',
    items: [
      'Tier-2 / Tier-3 CEX listing outreach',
      'Tier-1 CEX listing readiness — compliance, market-making, liquidity depth',
      'DAO governance for protocol parameters',
    ],
  },
  {
    phase: 'Phase 5',
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

      <div className="relative pl-8 sm:pl-10">
        {/* Vertical timeline rail */}
        <div className="absolute left-[11px] sm:left-[13px] top-2 bottom-2 w-px bg-white/10" />

        <div className="space-y-8">
          {PHASES.map((p, i) => (
            <Reveal key={p.phase} delay={i * 90}>
              <div className="relative">
                <span
                  className={`absolute -left-8 sm:-left-10 top-1 w-[23px] h-[23px] sm:w-[27px] sm:h-[27px] rounded-full border-2 flex items-center justify-center ${
                    p.status === 'Complete' ? 'border-brand-500 bg-brand-500/20' :
                    p.status === 'Current'  ? 'border-accent-amber bg-accent-amber/20' :
                    'border-white/20 bg-surface-800'
                  }`}
                >
                  {p.status === 'Complete' && <span className="text-brand-400 text-xs">✓</span>}
                </span>

                <div className="glass-card">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-text-muted text-xs font-mono uppercase tracking-wider">{p.phase}</span>
                    <h3 className="font-display font-semibold text-lg mr-auto">{p.title}</h3>
                    <span className={`text-[11px] font-display font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
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
      </div>
    </section>
  );
}
