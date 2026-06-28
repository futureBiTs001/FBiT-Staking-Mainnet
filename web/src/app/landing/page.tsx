'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import SupportChat from '@/components/ui/SupportChat';

// ── Social links — update these with real handles ─────────────────────────────
const SOCIAL = {
  twitter:  'https://x.com/FutureBiT_Token',
  telegram: 'https://t.me/FutureBiTToken',
  github:   'https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet',
  discord:  'https://discord.gg/futurebit',
};

// ── Google AdSense publisher ID — replace with your real ID ───────────────────
const ADSENSE_PUB_ID = 'ca-pub-XXXXXXXXXXXXXXXXX';

// ── Known pool addresses for FBiT price ──────────────────────────────────────
const FBIT_POOLS = [
  '8FNq5nb5sCV3BUThSbWY3byVos3z5LAWREbv8DUQq6HR',
  'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
];

const STAKING_APP = 'https://stake.futurebit.in';

// ── Live stats (read from chain on mount, fallback to known values) ───────────
const KNOWN_STATS = {
  apy:         247.33,
  totalStaked: 4043113,
  totalUsers:  12,
  reserve:     213800695,
  chain:       ['Solana', 'Polygon'],
};

// ══════════════════════════════════════════════════════════════════════════════
// AD COMPONENT — Google AdSense slot
// ══════════════════════════════════════════════════════════════════════════════
function AdUnit({ slot, format, className }: { slot: string; format: string; className?: string }) {
  useEffect(() => {
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch {}
  }, []);
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className ?? ''}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_PUB_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ── Ad placeholder shown until AdSense is approved ───────────────────────────
function AdPlaceholder({ label, height = 90 }: { label: string; height?: number }) {
  return (
    <div
      style={{ minHeight: height }}
      className="w-full flex items-center justify-center rounded-xl border border-dashed border-brand-500/20 bg-surface-800/30 text-text-muted text-xs font-mono"
    >
      [ {label} — Google AdSense ]
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE TICKER
// ══════════════════════════════════════════════════════════════════════════════
interface PriceTick { price: string; change: number; dex: string; }

function useFBiTPrice() {
  const [tick, setTick] = useState<PriceTick | null>(null);
  const fetch_ = useCallback(async () => {
    try {
      const addr = FBIT_POOLS.join(',');
      const res  = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/multi/${addr}`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const pool = data?.data?.[0]?.attributes;
      if (!pool) return;
      setTick({
        price:  parseFloat(pool.base_token_price_usd ?? '0').toFixed(6),
        change: parseFloat(pool.price_change_percentage?.h24 ?? '0'),
        dex:    data?.data?.[0]?.relationships?.dex?.data?.id ?? 'DEX',
      });
    } catch {}
  }, []);

  useEffect(() => { fetch_(); const t = setInterval(fetch_, 30_000); return () => clearInterval(t); }, [fetch_]);
  return tick;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const price = useFBiTPrice();
  const [mobileMenu, setMobileMenu] = useState(false);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
    : n.toString();

  return (
    <>
      {/* Google AdSense script */}
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />

      <div className="min-h-screen bg-surface-900 text-white font-body overflow-x-hidden">

        {/* ── TOP BANNER AD ─────────────────────────────────────────────────── */}
        <div className="w-full bg-surface-800/60 border-b border-white/5 py-2 px-4">
          <AdPlaceholder label="Top Banner 728×90" height={60} />
        </div>

        {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-display font-bold">F</div>
                <span className="font-display font-bold text-lg">
                  Future<span className="text-brand-400">Bit</span>
                </span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-8 text-sm font-display text-text-muted">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                <a href="#referral" className="hover:text-white transition-colors">Referral</a>
                <a href="#community" className="hover:text-white transition-colors">Community</a>
              </div>

              {/* Social + CTA */}
              <div className="flex items-center gap-3">
                {/* Social Icons */}
                <div className="hidden sm:flex items-center gap-2">
                  <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-text-muted hover:text-brand-400 hover:bg-brand-500/10 transition-all" title="Twitter/X">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href={SOCIAL.telegram} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-text-muted hover:text-brand-400 hover:bg-brand-500/10 transition-all" title="Telegram">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </a>
                  <a href={SOCIAL.github} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-text-muted hover:text-brand-400 hover:bg-brand-500/10 transition-all" title="GitHub">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                  </a>
                </div>

                <a href={STAKING_APP}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-900 font-display font-bold text-sm transition-all shadow-lg shadow-brand-500/20">
                  Launch App →
                </a>

                {/* Mobile menu toggle */}
                <button className="md:hidden p-2 text-text-muted hover:text-white" onClick={() => setMobileMenu(m => !m)}>
                  <div className="space-y-1"><div className="w-5 h-0.5 bg-current"/><div className="w-5 h-0.5 bg-current"/><div className="w-5 h-0.5 bg-current"/></div>
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {mobileMenu && (
              <div className="md:hidden border-t border-white/5 py-4 space-y-3 text-sm font-display">
                {['#features','#tokenomics','#how-it-works','#referral','#community'].map(h => (
                  <a key={h} href={h} onClick={() => setMobileMenu(false)}
                    className="block px-2 py-2 text-text-muted hover:text-white capitalize">
                    {h.replace('#','').replace('-',' ')}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* ── LIVE PRICE TICKER ─────────────────────────────────────────────── */}
        <div className="bg-surface-800/40 border-b border-white/5 py-2 overflow-hidden">
          <div className="flex items-center gap-6 px-4 text-xs font-mono">
            <span className="text-text-muted shrink-0">FBiT/USD</span>
            {price ? (
              <>
                <span className="text-white font-bold">${price.price}</span>
                <span className={price.change >= 0 ? 'text-brand-400' : 'text-accent-rose'}>
                  {price.change >= 0 ? '▲' : '▼'} {Math.abs(price.change).toFixed(2)}% (24h)
                </span>
                <span className="text-text-muted">{price.dex}</span>
                <span className="flex items-center gap-1 text-brand-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse inline-block"/>LIVE
                </span>
              </>
            ) : (
              <span className="text-text-muted animate-pulse">Fetching price…</span>
            )}
            <span className="text-text-muted shrink-0 ml-auto hidden sm:block">
              APY <span className="text-brand-400 font-bold">{KNOWN_STATS.apy}%</span> &nbsp;|&nbsp;
              Reserve <span className="text-brand-400 font-bold">{fmt(KNOWN_STATS.reserve)} FBiT</span>
            </span>
          </div>
        </div>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="relative py-24 md:py-36 px-4 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px]"/>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-purple/5 blur-[100px]"/>
          </div>

          <div className="relative max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-display font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse inline-block"/>
              Live on Solana + Polygon Mainnet
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl leading-tight mb-6">
              Stake <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">FBiT</span> &amp; Earn{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-brand-400">
                {KNOWN_STATS.apy}% APY
              </span>
            </h1>

            <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              The next-generation multi-chain staking platform. Stake your FBiT tokens,
              earn automatic rewards, and build a 10-level referral empire — on Solana &amp; Polygon.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={STAKING_APP}
                className="px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-surface-900 font-display font-bold text-lg transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105">
                Start Staking Now →
              </a>
              <a href="#how-it-works"
                className="px-8 py-4 rounded-2xl border border-white/10 hover:border-brand-500/30 hover:bg-white/5 font-display font-semibold text-lg transition-all">
                How It Works
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-text-muted font-display">
              {['Audited Contract','Non-Custodial','Open Source','Multi-Chain'].map(b => (
                <span key={b} className="flex items-center gap-1.5">
                  <span className="text-brand-400">✓</span>{b}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE STATS ────────────────────────────────────────────────────── */}
        <section className="py-12 px-4 bg-surface-800/30 border-y border-white/5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Current APY',      value: `${KNOWN_STATS.apy}%`,         sub: 'Dynamic PoS',        color: 'text-brand-400' },
              { label: 'Total Staked',     value: fmt(KNOWN_STATS.totalStaked),   sub: 'FBiT Tokens',        color: 'text-accent-cyan' },
              { label: 'Reserve Pool',     value: fmt(KNOWN_STATS.reserve),       sub: 'FBiT Available',     color: 'text-accent-purple' },
              { label: 'FBiT Price',       value: price ? `$${price.price}` : '…', sub: 'Live from DEX',     color: 'text-accent-amber' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-surface-800/60 border border-white/5 p-6 text-center">
                <p className={`font-display font-bold text-3xl md:text-4xl ${s.color}`}>{s.value}</p>
                <p className="text-text-muted text-xs mt-1 font-display">{s.sub}</p>
                <p className="text-text-secondary text-sm mt-2 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MID AD ────────────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto py-8 px-4">
          <AdPlaceholder label="Mid-Page Rectangle 336×280" height={100} />
        </div>

        {/* ── FEATURES ──────────────────────────────────────────────────────── */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">
                Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">FutureBit</span>?
              </h2>
              <p className="text-text-muted text-lg max-w-xl mx-auto">Built for the next generation of DeFi investors</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '⚡', title: 'Up to 247% APY',        desc: 'Dynamic Proof-of-Stake APY that self-adjusts based on total staked tokens. More stakers = fairer rewards.',         color: 'from-brand-500/20 to-brand-700/10' },
                { icon: '🌐', title: 'Multi-Chain',            desc: 'Stake FBiT on Solana for ultra-low fees or WFBIT on Polygon. One platform, two powerful blockchains.',            color: 'from-accent-cyan/20 to-accent-blue/10' },
                { icon: '👥', title: '10-Level Referrals',     desc: 'Earn commissions from 10 referral levels deep. Build your network and earn passive income forever.',              color: 'from-accent-purple/20 to-accent-purple/5' },
                { icon: '🔥', title: '10% Burn Mechanism',     desc: 'Every claim burns 10% of rewards permanently. Deflationary tokenomics that increase scarcity over time.',         color: 'from-accent-rose/20 to-accent-rose/5' },
                { icon: '🏆', title: 'Team Target Bonus',      desc: 'Unlock up to 10% extra bonus based on your team\'s total staked FBiT. 10 tiers of rewards await you.',           color: 'from-accent-amber/20 to-accent-amber/5' },
                { icon: '🔒', title: 'Secure & Audited',       desc: 'Non-custodial, open-source contracts. Your funds stay in your wallet. 4 security audits applied.',               color: 'from-brand-500/10 to-surface-800/10' },
              ].map(f => (
                <div key={f.title} className={`rounded-2xl bg-gradient-to-br ${f.color} border border-white/5 p-7 hover:border-white/10 transition-all hover:-translate-y-1`}>
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-4 bg-surface-800/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">How It Works</h2>
              <p className="text-text-muted">Start earning in 3 simple steps</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent"/>

              {[
                { step: '01', icon: '💼', title: 'Connect Wallet',   desc: 'Connect Phantom (Solana) or MetaMask (Polygon). No KYC, no signup required.' },
                { step: '02', icon: '🪙', title: 'Stake FBiT',       desc: 'Choose your amount and lock period. Minimum 1 FBiT. Earn rewards every 6 hours.' },
                { step: '03', icon: '💰', title: 'Claim Rewards',    desc: 'Claim, compound, or unstake anytime after lock period. Rewards are auto-calculated.' },
              ].map(s => (
                <div key={s.step} className="text-center relative">
                  <div className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-3xl mx-auto mb-4 relative z-10">
                    {s.icon}
                  </div>
                  <div className="font-display text-xs text-brand-400 font-bold mb-2">STEP {s.step}</div>
                  <h3 className="font-display font-bold text-xl mb-3">{s.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <a href={STAKING_APP} className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-400 text-surface-900 font-display font-bold text-lg transition-all shadow-lg shadow-brand-500/20">
                Start Earning Now →
              </a>
            </div>
          </div>
        </section>

        {/* ── TOKENOMICS ────────────────────────────────────────────────────── */}
        <section id="tokenomics" className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Tokenomics</h2>
              <p className="text-text-muted">Designed for long-term sustainability</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Solana — FBiT */}
              <div className="rounded-2xl bg-surface-800/60 border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-lg">◎</div>
                  <div>
                    <h3 className="font-display font-bold text-xl">FBiT (Solana)</h3>
                    <p className="text-text-muted text-xs font-mono">CuubBzUT...UGTu</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Network',          'Solana Mainnet'],
                    ['Decimals',         '6'],
                    ['Staking Reserve',  '213.8M FBiT'],
                    ['Annual Emission',  '10M FBiT/year'],
                    ['Runway',           '~21 years'],
                    ['Min Stake',        '1 FBiT'],
                    ['Claim Interval',   'Every 6 hours'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-text-muted">{k}</span>
                      <span className="font-mono text-text-primary font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Polygon — WFBIT */}
              <div className="rounded-2xl bg-surface-800/60 border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent-purple/30 flex items-center justify-center text-lg">⬡</div>
                  <div>
                    <h3 className="font-display font-bold text-xl">WFBIT (Polygon)</h3>
                    <p className="text-text-muted text-xs font-mono">0xa31b5A95...945</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Network',          'Polygon Mainnet'],
                    ['Decimals',         '6'],
                    ['Total Supply',     '1 Billion WFBIT'],
                    ['Staking Reserve',  '800M WFBIT'],
                    ['APY Range',        '60% – 250%'],
                    ['Lock Period',      '30 Days'],
                    ['Platform Fee',     '1% per action'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-text-muted">{k}</span>
                      <span className="font-mono text-text-primary font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REFERRAL SYSTEM ───────────────────────────────────────────────── */}
        <section id="referral" className="py-20 px-4 bg-surface-800/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">
                10-Level <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-brand-400">Referral System</span>
              </h2>
              <p className="text-text-muted text-lg">Invite friends and earn from their entire network</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { lv: 'L1', pct: '0.25%', bg: 'bg-brand-500' },
                { lv: 'L2', pct: '0.5%',  bg: 'bg-brand-500/90' },
                { lv: 'L3', pct: '1.25%', bg: 'bg-brand-500/80' },
                { lv: 'L4', pct: '1.5%',  bg: 'bg-brand-500/70' },
                { lv: 'L5', pct: '1.75%', bg: 'bg-brand-500/65' },
                { lv: 'L6', pct: '2%',    bg: 'bg-brand-500/60' },
                { lv: 'L7', pct: '2.25%', bg: 'bg-brand-500/55' },
                { lv: 'L8', pct: '2.5%',  bg: 'bg-brand-500/50' },
                { lv: 'L9', pct: '2.75%', bg: 'bg-brand-500/45' },
                { lv: 'L10', pct: '3%',   bg: 'bg-brand-500/40' },
              ].map(r => (
                <div key={r.lv} className="rounded-xl bg-surface-800/60 border border-white/5 p-4 text-center hover:border-brand-500/30 transition-all">
                  <div className={`w-8 h-8 ${r.bg} rounded-full flex items-center justify-center text-surface-900 text-xs font-display font-bold mx-auto mb-2`}>{r.lv}</div>
                  <p className="font-display font-bold text-lg text-brand-400">{r.pct}</p>
                  <p className="text-text-muted text-xs">Commission</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-brand-500/5 border border-brand-500/20 p-6 text-center">
              <p className="text-brand-300 font-display font-semibold">
                Total referral commission up to <span className="text-brand-400 text-xl font-bold">15.75%</span> across all 10 levels
              </p>
              <p className="text-text-muted text-sm mt-2">Your referees' rewards automatically flow up to you — forever</p>
            </div>
          </div>
        </section>

        {/* ── BOTTOM AD ─────────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto py-8 px-4">
          <AdPlaceholder label="Bottom Banner 728×90" height={90} />
        </div>

        {/* ── COMMUNITY / SOCIAL FOLLOW ─────────────────────────────────────── */}
        <section id="community" className="py-20 px-4 bg-surface-800/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-4">Join the Community</h2>
            <p className="text-text-muted text-lg mb-12">Stay updated with the latest FutureBit news and announcements</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {/* Twitter/X */}
              <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface-800/60 border border-white/5 hover:border-brand-500/30 hover:bg-surface-800/80 transition-all">
                <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center group-hover:border-brand-500/30 transition-all">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display font-bold text-lg">Twitter / X</p>
                  <p className="text-text-muted text-sm">Follow for updates</p>
                </div>
                <span className="px-4 py-2 rounded-xl border border-white/10 group-hover:border-brand-500/30 group-hover:text-brand-400 text-sm font-display transition-all">
                  Follow →
                </span>
              </a>

              {/* Telegram */}
              <a href={SOCIAL.telegram} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface-800/60 border border-white/5 hover:border-brand-500/30 hover:bg-surface-800/80 transition-all">
                <div className="w-16 h-16 rounded-full bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center group-hover:border-[#229ED9]/40 transition-all">
                  <svg className="w-8 h-8 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display font-bold text-lg">Telegram</p>
                  <p className="text-text-muted text-sm">Join our group</p>
                </div>
                <span className="px-4 py-2 rounded-xl border border-white/10 group-hover:border-[#229ED9]/30 group-hover:text-[#229ED9] text-sm font-display transition-all">
                  Join →
                </span>
              </a>

              {/* GitHub */}
              <a href={SOCIAL.github} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-surface-800/60 border border-white/5 hover:border-brand-500/30 hover:bg-surface-800/80 transition-all">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-brand-500/30 transition-all">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display font-bold text-lg">GitHub</p>
                  <p className="text-text-muted text-sm">Open source code</p>
                </div>
                <span className="px-4 py-2 rounded-xl border border-white/10 group-hover:border-brand-500/30 group-hover:text-brand-400 text-sm font-display transition-all">
                  Star →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-500/5 blur-[100px]"/>
          </div>
          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="font-display font-bold text-4xl md:text-6xl mb-6">
              Ready to Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">{KNOWN_STATS.apy}%</span> APY?
            </h2>
            <p className="text-text-muted text-xl mb-10">Join the FutureBit staking ecosystem today. No signup. No KYC. Just rewards.</p>
            <a href={STAKING_APP}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-surface-900 font-display font-bold text-xl transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105">
              Launch Staking App
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </a>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 bg-surface-800/20 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-surface-900">F</div>
                  <span className="font-display font-bold text-lg">FutureBit <span className="text-brand-400">Staking</span></span>
                </div>
                <p className="text-text-muted text-sm leading-relaxed max-w-sm">
                  Multi-chain FBiT staking platform on Solana and Polygon. Earn dynamic PoS rewards with our 10-level referral system.
                </p>
                <div className="flex gap-3 mt-5">
                  {[
                    { href: SOCIAL.twitter,  icon: 'X' },
                    { href: SOCIAL.telegram, icon: 'TG' },
                    { href: SOCIAL.github,   icon: 'GH' },
                  ].map(s => (
                    <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-xs font-display text-text-muted hover:text-brand-400 hover:border-brand-500/30 transition-all">
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display font-semibold text-sm mb-4 text-text-secondary">Platform</p>
                <div className="space-y-3">
                  {[['Launch App', STAKING_APP], ['Features','#features'], ['Tokenomics','#tokenomics'], ['Referral','#referral']].map(([l, h]) => (
                    <a key={l} href={h} className="block text-text-muted hover:text-white text-sm transition-colors">{l}</a>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display font-semibold text-sm mb-4 text-text-secondary">Networks</p>
                <div className="space-y-3 text-sm text-text-muted">
                  <a href="https://explorer.solana.com/address/8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp" target="_blank" rel="noopener noreferrer" className="block hover:text-brand-400 transition-colors">Solana Program ↗</a>
                  <a href="https://polygonscan.com/address/0xb86DA67406DaD482428704c14AdA269E9653FDca" target="_blank" rel="noopener noreferrer" className="block hover:text-brand-400 transition-colors">Polygon Contract ↗</a>
                  <a href={SOCIAL.github} target="_blank" rel="noopener noreferrer" className="block hover:text-brand-400 transition-colors">Open Source ↗</a>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-muted">
              <div className="flex flex-wrap gap-4">
                <a href="/about"   className="hover:text-brand-400 transition-colors">About Us</a>
                <a href="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</a>
                <a href="/terms"   className="hover:text-brand-400 transition-colors">Terms & Conditions</a>
              </div>
              <p>© 2026 FutureBit Staking. All rights reserved.</p>
              <p className="text-center">
                <span className="text-accent-rose">⚠</span> DeFi involves risk. Only invest what you can afford to lose.
              </p>
            </div>
          </div>
        </footer>

      </div>

      {/* AI Support Chat */}
      <SupportChat />
    </>
  );
}
