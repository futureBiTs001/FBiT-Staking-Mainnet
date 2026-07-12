'use client';

import React from 'react';

interface Props {
  /** FBiT/WFBIT amount to convert. */
  amount: number;
  /** Current FBiT/WFBIT price in USD (from useTokenPrice's best pair), or null/undefined while loading. */
  priceUsd: number | null | undefined;
  className?: string;
}

/** Renders "≈ $12.34" next to a token amount. Silently renders nothing if price isn't available yet. */
export default function UsdValue({ amount, priceUsd, className = '' }: Props) {
  if (!priceUsd || !Number.isFinite(amount) || amount <= 0) return null;

  const usd = amount * priceUsd;
  const formatted = usd >= 1
    ? usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : `$${usd.toFixed(usd >= 0.01 ? 4 : 6)}`;

  return (
    <span
      className={`text-text-muted font-mono ${className}`}
      title="Estimated from live DEX price — FBiT's pool has thin liquidity, so this can be volatile."
    >
      ≈ {formatted}
    </span>
  );
}
