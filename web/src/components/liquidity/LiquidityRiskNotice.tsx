'use client';

import React from 'react';

const RISK_POINTS = [
  {
    icon: '⚖️',
    title: 'Impermanent loss is real',
    desc: 'Providing liquidity in any AMM — this one included — carries impermanent loss risk if FBiT\'s price moves a lot. Trading fees help offset it, but do not eliminate it. This is true at every protocol, of every size.',
  },
  {
    icon: '🔒',
    title: 'Locked means locked',
    desc: '24-month positions cannot be withdrawn early under any circumstance, including a falling price. Permanent-lock positions can never be withdrawn at all. Only lock what you are fully comfortable not touching.',
  },
  {
    icon: '💧',
    title: 'FBiT liquidity is currently thin',
    desc: 'Large deposits may see meaningful price impact on the swap leg. Check the quoted price impact before confirming, and consider a smaller amount if it looks high.',
  },
  {
    icon: '🏦',
    title: 'Self-custody, not protocol custody',
    desc: 'Your position NFT is minted directly to your own wallet — FutureBit never holds custody of your liquidity. Fee claims and (once unlocked) withdrawals are enforced by Meteora\'s own on-chain program, not by us.',
  },
];

export default function LiquidityRiskNotice() {
  return (
    <div>
      <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">Understand the Risk</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {RISK_POINTS.map((r) => (
          <div key={r.title} className="glass-card flex gap-3.5 items-start py-4">
            <span className="text-xl shrink-0">{r.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-sm mb-1">{r.title}</h3>
              <p className="text-text-muted text-xs leading-relaxed">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
