'use client';

import React from 'react';
import Reveal from './Reveal';

// Categorical palette validated with the dataviz skill's validate_palette.js
// (OKLCH lightness band, chroma floor, CVD separation, contrast vs. surface —
// all PASS at mode dark, surface #0f1729, the app's own glass-card surface).
const ALLOCATION = [
  { label: 'Liquidity',       pct: 50.8, amount: '127,000,000', color: '#0891B2' },
  { label: 'Staking Reserve', pct: 48,   amount: '120,000,000', color: '#00A844' },
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
