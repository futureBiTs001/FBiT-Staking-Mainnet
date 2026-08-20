'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { formatNumber } from '@/lib/utils';
import { PINNED_FBIT_POOL } from '@/hooks/useTokenPrice';
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

/** Price is a token-level figure (always the FBiT/SOL pool), independent of the
 *  per-chain protocol-stats toggle below — so it is fetched separately here rather
 *  than via useTokenPrice(), which follows the app store's selected network. */
async function fetchFbitPriceUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${PINNED_FBIT_POOL}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = Number(json?.data?.attributes?.base_token_price_usd);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export default function LandingStats() {
  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { solanaFetchPlatformStats } = await import('@/lib/contracts/solana');
      const [sol, price] = await Promise.all([
        solanaFetchPlatformStats().catch(() => null),
        fetchFbitPriceUsd(),
      ]);
      setStats(sol);
      setPriceUsd(price);
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
    },
    { label: 'Total Staked',  target: current ? current.totalStaked : null, suffix: ' FBiT', color: 'text-brand-400' },
    { label: 'Current APY',   target: apyPct,                                suffix: '%',     color: 'text-accent-amber' },
    { label: 'Total Stakers', target: current ? current.totalUsers : null,   suffix: '',       color: 'text-accent-cyan' },
    { label: 'Total Burned',  target: current ? current.totalBurned : null,  suffix: ' FBiT', color: 'text-accent-rose' },
  ];

  return (
    <section id="stats" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Live Protocol Stats</h2>
          <p className="text-text-muted text-sm">
            Live FBiT market price plus on-chain protocol data — refreshed on every visit.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 80}>
            <StatTile {...t} loading={loading} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
