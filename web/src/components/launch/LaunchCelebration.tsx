'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTokenPrice } from '@/hooks/useTokenPrice';

const TOTAL_SUPPLY = 250_000_000;
const FBIT_MINT = '5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME';
const JUPITER_URL = `https://jup.ag/swap/SOL-${FBIT_MINT}`;
const METEORA_URL = 'https://app.meteora.ag/dammv2/ECUsT6sdz9rAj7tPfHnnHwxdkLaDcafHEfWZEdzc7hQx';

// New FBiT/SOL DAMM v2 pool (ECUsT6sdz9rAj7tPfHnnHwxdkLaDcafHEfWZEdzc7hQx) — read directly from
// its on-chain Pool account: activation_type=1 (timestamp), activation_point=1788416999.
// Trading on this specific pool cannot happen before this moment (Meteora's own on-chain
// enforcement) — this is NOT the same as the existing pool referenced above, which already
// trades today; this countdown is for the new pool only.
const POOL_LAUNCH_TIMESTAMP_MS = 1788416999 * 1000;

function getCountdown(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now());
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { diff, days, hours, minutes, seconds };
}

function LaunchCountdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return null; // avoid SSR/client mismatch on the ticking value

  const { diff, days, hours, minutes, seconds } = getCountdown(POOL_LAUNCH_TIMESTAMP_MS);
  const launched = diff <= 0;

  return (
    <div className="glass-card w-full mb-8 py-6 px-6">
      <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-pulse" />
        {launched ? 'New Liquidity Pool' : 'New Liquidity Pool Launching In'}
      </p>
      {launched ? (
        <p className="font-display font-bold text-lg text-brand-400">🎉 Live now on Meteora</p>
      ) : (
        <div className="flex items-center justify-center gap-3 sm:gap-5 font-mono">
          {[
            { v: days, label: 'Days' },
            { v: hours, label: 'Hrs' },
            { v: minutes, label: 'Min' },
            { v: seconds, label: 'Sec' },
          ].map((u) => (
            <div key={u.label} className="flex flex-col items-center">
              <span className="font-display font-black text-2xl sm:text-3xl">{String(u.v).padStart(2, '0')}</span>
              <span className="text-text-muted text-[10px] uppercase tracking-wider">{u.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const SHARE_TEXT = encodeURIComponent('FutureBit Staking ($FBiT) is live on Solana — dynamic PoS APY up to 300%, 10-level referrals, non-custodial. 🚀');
const SHARE_URL = 'https://futurebit.in/launch';
const TWEET_URL = `https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${encodeURIComponent(SHARE_URL)}`;

const CONFETTI_COLORS = ['#00E676', '#14F195', '#9945FF', '#fbbf24', '#22d3ee', '#fb7185'];

function formatPrice(n: number): string {
  return n < 0.01 ? `$${n.toPrecision(3)}` : `$${n.toFixed(4)}`;
}
function formatCompactUsd(n: number): string {
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)}`;
}

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.6,
      duration: 2.6 + Math.random() * 1.8,
      size: 6 + Math.random() * 7,
      isCircle: Math.random() > 0.5,
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-5%] animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LaunchCelebration() {
  const { pairs, isLoading } = useTokenPrice();
  const [showConfetti, setShowConfetti] = useState(true);
  const pair = pairs[0];

  const price     = pair ? parseFloat(pair.priceUsd) : null;
  const change    = pair ? pair.priceChange24h : null;
  const marketCap = price != null ? price * TOTAL_SUPPLY : null;

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center relative overflow-hidden">
      {showConfetti && <Confetti />}

      {/* Ambient glow background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(50% 40% at 50% 15%, rgba(0,230,118,0.16) 0%, transparent 70%), radial-gradient(40% 35% at 80% 80%, rgba(153,69,255,0.14) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/30 mb-6 animate-fade-in">
          🎉 Now Live on Solana Mainnet
        </span>

        <h1 className="font-display font-black text-4xl sm:text-6xl leading-tight mb-4 animate-fade-in">
          <span className="bg-linear-to-r from-white via-brand-400 to-[#9945FF] bg-clip-text text-transparent">
            FutureBit Staking
          </span>
          <br />
          Is Live.
        </h1>

        <p className="text-text-muted text-base sm:text-lg max-w-lg mb-10 animate-fade-in">
          Stake FBiT, earn dynamic Proof-of-Stake APY up to 300%, and build a 10-level referral network — non-custodial, on Solana.
        </p>

        <LaunchCountdown />

        {/* Live price hero */}
        <div className="glass-card w-full mb-8 py-8 px-6">
          <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" /> Live FBiT Price
          </p>
          <p className={`font-display font-black text-5xl sm:text-6xl mb-3 ${isLoading ? 'animate-pulse opacity-50' : ''}`}>
            {price != null ? formatPrice(price) : '—'}
          </p>
          <div className="flex items-center justify-center gap-5 text-sm">
            {change != null && (
              <span className={`font-mono font-semibold ${change >= 0 ? 'text-brand-400' : 'text-accent-rose'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% (24h)
              </span>
            )}
            {marketCap != null && (
              <span className="font-mono text-text-muted">
                MCap <span className="text-text-primary font-semibold">{formatCompactUsd(marketCap)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Buy CTAs */}
        <div className="grid sm:grid-cols-2 gap-3 w-full mb-6">
          <a
            href={JUPITER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-6 py-3.5"
          >
            Buy on Jupiter ↗
          </a>
          <a
            href={METEORA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm px-6 py-3.5"
          >
            Buy on Meteora ↗
          </a>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/app" className="text-sm font-display text-text-secondary hover:text-text-primary transition-colors">
            Launch App →
          </Link>
          <span className="text-white/15">·</span>
          <a
            href={TWEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-display text-text-secondary hover:text-text-primary transition-colors"
          >
            Share on X ↗
          </a>
          <span className="text-white/15">·</span>
          <Link href="/" className="text-sm font-display text-text-secondary hover:text-text-primary transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
