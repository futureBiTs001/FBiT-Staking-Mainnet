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

interface WalletOption {
  name: string;
  logo?: string;
  emoji?: string;
  emojiBg?: string;
  desc: string;
}

// Wallets this site's own connect flow actually supports: Phantom/Solflare/Backpack
// auto-detect via Wallet Standard, Binance Web3 Wallet is explicitly featured in
// the Reown/WalletConnect config (see src/lib/reown.ts) — not an arbitrary list.
const WALLETS: WalletOption[] = [
  { name: 'Phantom',              emoji: '👻', emojiBg: '#AB9FF2', desc: 'Most widely used Solana wallet' },
  { name: 'Solflare',             logo: '/wallets/solflare.png',   desc: 'Solana-native, hardware wallet support' },
  { name: 'Backpack',             logo: '/wallets/backpack.png',   desc: 'Built-in multi-chain wallet' },
  { name: 'Binance Web3 Wallet',  logo: '/wallets/binance.png',    desc: 'Built into the Binance app' },
];

const SAFETY_TIPS = [
  {
    icon: '🔖',
    title: 'Only use this bookmarked URL',
    desc: 'Always go to futurebit.in directly. Never connect your wallet through a link from a DM, comment, or search ad — that\'s the #1 way people get phished.',
  },
  {
    icon: '🔑',
    title: 'Never share your seed phrase',
    desc: 'No wallet, exchange, or FutureBit team member will ever ask for your recovery phrase or private key. Anyone who does is trying to steal your funds.',
  },
  {
    icon: '🔍',
    title: 'Verify the mint address',
    desc: 'Before swapping, check the FBiT contract address against the one shown below in Token Details — fake tokens with the same name are a common trick.',
  },
  {
    icon: '👀',
    title: 'Read your wallet popup carefully',
    desc: 'Before approving any transaction, check the token, amount, and destination shown in your wallet — not just what the website says.',
  },
];

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
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {TRACK_ON.map((p) => <PlatformCard key={p.name} p={p} />)}
        </div>
      </Reveal>

      <Reveal delay={200}>
        <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">Recommended Wallets</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {WALLETS.map((w) => (
            <div key={w.name} className="glass-card flex flex-col items-center text-center gap-2 py-5">
              {w.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.logo} alt={`${w.name} logo`} className="w-11 h-11 rounded-xl object-cover" />
              ) : (
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${w.emojiBg}26`, border: `1px solid ${w.emojiBg}55` }}
                >
                  {w.emoji}
                </span>
              )}
              <div>
                <p className="font-display font-semibold text-sm">{w.name}</p>
                <p className="text-text-muted text-[11px] leading-snug mt-0.5">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={260}>
        <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">Stay Safe</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {SAFETY_TIPS.map((t) => (
            <div key={t.title} className="glass-card flex gap-3.5 items-start py-4">
              <span className="text-xl shrink-0">{t.icon}</span>
              <div>
                <h3 className="font-display font-semibold text-sm mb-1">{t.title}</h3>
                <p className="text-text-muted text-xs leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
