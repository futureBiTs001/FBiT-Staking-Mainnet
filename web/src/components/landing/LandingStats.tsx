'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { formatNumber } from '@/lib/utils';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import type { PlatformStats } from '@/types';
import Reveal from './Reveal';

/** Animates from 0 to `target` over `duration`ms (ease-out) whenever `target` changes. */
function useCountUp(target: number | null, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setValue(from + (target - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function StatTile({ label, target, suffix, prefix, color, loading, formatValue }: {
  label: string;
  target: number | null;
  suffix?: string;
  prefix?: string;
  color: string;
  loading: boolean;
  /** Overrides the default abbreviated formatting (used for price, which needs real precision). */
  formatValue?: (n: number) => string;
}) {
  const animated = useCountUp(target);
  const display = target == null
    ? '—'
    : `${prefix ?? ''}${(formatValue ?? ((n: number) => formatNumber(n, 2)))(animated)}${suffix ?? ''}`;

  return (
    <div className="glass-card text-center py-6">
      <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-display font-bold text-2xl sm:text-3xl ${loading ? 'animate-pulse opacity-50' : ''} ${color}`}>
        {display}
      </p>
    </div>
  );
}

export default function LandingStats() {
  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared with LiveTicker — a page load previously fired two independent
  // GeckoTerminal requests for the same FBiT/SOL pool (one here, one in
  // useTokenPrice), which made it easy to trip GeckoTerminal's rate limit
  // on a cold, uncached visit (e.g. a first-time crawl).
  const { pairs, isLoading: priceLoading } = useTokenPrice();
  const priceUsd = pairs[0] ? parseFloat(pairs[0].priceUsd) : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { solanaFetchPlatformStats } = await import('@/lib/contracts/solana');
      setStats(await solanaFetchPlatformStats().catch(() => null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = stats;
  const apyPct  = current ? Math.round(current.effectiveAPY / 100) : null;

  const tiles = [
    {
      label: 'FBiT Price',
      target: priceUsd,
      prefix: '$',
      color: 'text-text-primary',
      formatValue: (n: number) => (n < 0.01 ? n.toPrecision(3) : n.toFixed(4)),
      loading: priceLoading,
    },
    { label: 'Total Staked',  target: current ? current.totalStaked : null, suffix: ' FBiT', color: 'text-brand-400', loading },
    { label: 'Current APY',   target: apyPct,                                suffix: '%',     color: 'text-accent-amber', loading },
    { label: 'Total Stakers', target: current ? current.totalUsers : null,   suffix: '',       color: 'text-accent-cyan', loading },
    { label: 'Total Burned',  target: current ? current.totalBurned : null,  suffix: ' FBiT', color: 'text-accent-rose', loading },
  ];

  return (
    <section id="stats" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-8">
          <h2 className="gradient-text font-display font-extrabold text-3xl sm:text-4xl mb-2">Live Protocol Stats</h2>
          <p className="text-text-muted text-sm sm:text-base">
            Live FBiT market price plus on-chain protocol data — refreshed on every visit.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 80}>
            <StatTile {...t} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
