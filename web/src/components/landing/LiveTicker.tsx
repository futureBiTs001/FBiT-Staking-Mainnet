'use client';

import React from 'react';
import { useTokenPrice } from '@/hooks/useTokenPrice';

const TOTAL_SUPPLY = 250_000_000;

function formatPrice(n: number): string {
  return n < 0.01 ? `$${n.toPrecision(3)}` : `$${n.toFixed(4)}`;
}

function formatCompactUsd(n: number): string {
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)}`;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="text-text-muted tracking-wider">{label}</span>
      <span className="text-text-primary font-semibold">{children}</span>
    </span>
  );
}

function PriceChange({ pct }: { pct: number }) {
  const isPos = pct >= 0;
  return (
    <span className={isPos ? 'text-brand-400' : 'text-accent-rose'}>
      {isPos ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

/** Sticky bottom live-stats bar for the marketing homepage — price/24h/mcap/liquidity
 *  from the same GeckoTerminal-backed hook already used for the Stake/Swap tabs. */
export default function LiveTicker() {
  const { pairs, isLoading } = useTokenPrice();
  const pair = pairs[0];

  const price     = pair ? parseFloat(pair.priceUsd) : null;
  const change    = pair ? pair.priceChange24h : null;
  const liquidity = pair ? pair.liquidityUsd : null;
  const marketCap = price != null ? price * TOTAL_SUPPLY : null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-surface-dark/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center gap-5 sm:gap-7 overflow-x-auto text-[11px] sm:text-xs font-mono">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-brand-400 font-display font-semibold tracking-wider">LIVE</span>
        </span>

        <Stat label="MCAP">{marketCap != null ? formatCompactUsd(marketCap) : (isLoading ? '···' : '—')}</Stat>
        <Stat label="24H">{change != null ? <PriceChange pct={change} /> : (isLoading ? '···' : '—')}</Stat>
        <Stat label="PRICE">{price != null ? formatPrice(price) : (isLoading ? '···' : '—')}</Stat>
        <Stat label="LIQ">{liquidity != null ? formatCompactUsd(liquidity) : (isLoading ? '···' : '—')}</Stat>
      </div>
    </div>
  );
}
