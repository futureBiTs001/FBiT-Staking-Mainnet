'use client';

import React from 'react';
import Reveal from './Reveal';

// Categorical palette validated with the dataviz skill's validate_palette.js
// (OKLCH lightness band, chroma floor, CVD separation, contrast vs. surface —
// all PASS at mode dark, surface #0f1729, the app's own glass-card surface).
// Staking Reserve grew from its original 120,000,000 to 229,830,026 after an
// additional 110,000,000 FBiT deposit (extends the emission runway to ~19
// years at the current 12,000,000/year rate) — Liquidity's share shrank to
// match, since total supply is fixed. Update both figures together if the
// reserve is ever topped up (or drawn down) again.
const ALLOCATION = [
  { label: 'Staking Reserve', pct: 91.9, amount: '229,830,026', color: '#00A844' },
  { label: 'Liquidity',       pct: 8.1,  amount: '20,169,974',  color: '#0891B2' },
];

export default function LandingTokenomics() {
  return (
    <section id="tokenomics" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Tokenomics</h2>
          <p className="text-text-muted text-sm">250,000,000 FBiT total supply — fixed forever, mint authority renounced</p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="glass-card">
          {/* Legend — always present for a categorical (identity) breakdown */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
            {ALLOCATION.map((a) => (
              <div key={a.label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                <span className="text-text-secondary">{a.label}</span>
              </div>
            ))}
          </div>

          {/* Horizontal bar list — direct-labeled */}
          <div className="space-y-4">
            {ALLOCATION.map((a) => (
              <div key={a.label}>
                <div className="flex items-baseline justify-between mb-1.5 text-sm">
                  <span className="font-display font-medium">{a.label}</span>
                  <span className="font-mono text-text-muted text-xs">
                    {a.amount} FBiT · <span className="text-text-primary font-semibold">{a.pct}%</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(a.pct, 2)}%`, background: a.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
