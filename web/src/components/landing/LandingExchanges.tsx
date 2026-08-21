'use client';

import React from 'react';
import Reveal from './Reveal';

const FBIT_MINT = '5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME';
const FBIT_POOL = '5ZA1NsMv9hviXTUPhxqXbbFqoMwYeaNvSegJiRQv9E2F';

interface Platform {
  name: string;
  logo: string;
  url: string;
  desc: string;
}

// Aggregator/DEX where FBiT actually has a live pool — verified against the
// real GeckoTerminal pool data before adding (pool lives on Meteora DAMM v2;
// Jupiter aggregates that same liquidity, so both are genuine buy paths).
const BUY_ON: Platform[] = [
  { name: 'Jupiter',  logo: '/exchanges/jupiter.png',  url: `https://jup.ag/swap/SOL-${FBIT_MINT}`,      desc: 'Best-route swap aggregator' },
  { name: 'Meteora',  logo: '/exchanges/meteora.png',  url: `https://app.meteora.ag/dammv2/${FBIT_POOL}`, desc: 'The DEX pool FBiT trades on' },
];

// Chart/analytics trackers — each auto-indexes any Solana pool, so these
// populate on their own as the pool sees real trading volume.
const TRACK_ON: Platform[] = [
  { name: 'GeckoTerminal', logo: '/exchanges/geckoterminal.png', url: `https://www.geckoterminal.com/solana/pools/${FBIT_POOL}`, desc: 'Live price & liquidity charts' },
  { name: 'DexScreener',   logo: '/exchanges/dexscreener.png',   url: `https://dexscreener.com/solana/${FBIT_POOL}`,             desc: 'Trading pairs & volume' },
  { name: 'DexTools',      logo: '/exchanges/dextools.png',      url: `https://www.dextools.io/app/en/solana/pair-explorer/${FBIT_POOL}`, desc: 'Charts & holder analytics' },
];

function PlatformCard({ p }: { p: Platform }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card flex items-center gap-3.5 py-4 transition-transform duration-300 hover:-translate-y-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.logo} alt={`${p.name} logo`} className="w-10 h-10 rounded-xl shrink-0 object-cover" />
      <div className="min-w-0">
        <p className="font-display font-semibold text-sm">{p.name}</p>
        <p className="text-text-muted text-xs truncate">{p.desc}</p>
      </div>
      <span className="ml-auto text-text-muted text-sm shrink-0">↗</span>
    </a>
  );
}

export default function LandingExchanges() {
  return (
    <section id="exchanges" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Where to Trade</h2>
          <p className="text-text-muted text-sm">
            FBiT is a permissionless SPL token — buy directly through any of these, no account or KYC required.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">Buy FBiT</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {BUY_ON.map((p) => <PlatformCard key={p.name} p={p} />)}
        </div>
      </Reveal>

      <Reveal delay={140}>
        <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">Track FBiT</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {TRACK_ON.map((p) => <PlatformCard key={p.name} p={p} />)}
        </div>
      </Reveal>
    </section>
  );
}
