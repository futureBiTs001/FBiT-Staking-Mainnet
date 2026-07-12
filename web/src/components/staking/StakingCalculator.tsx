'use client';

import React, { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/utils';
import UsdValue from '@/components/ui/UsdValue';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import type { NetworkType, PlatformStats } from '@/types';

// Whitepaper §6.1 dynamic APY bounds (basis points).
const APY_BOUNDS: Record<NetworkType, { min: number; max: number }> = {
  solana:  { min: 1_000, max: 30_000 }, // 10%–300%
  polygon: { min: 6_000, max: 25_000 }, // 60%–250%
};

const INTERVALS_PER_DAY = 4;         // one claim/compound window every 6h
const INTERVALS_PER_YEAR = 1_460;    // 4 * 365 — matches the on-chain reward formula
const DURATION_OPTIONS = [
  { label: '30D',  days: 30 },
  { label: '90D',  days: 90 },
  { label: '180D', days: 180 },
  { label: '365D', days: 365 },
];
const AMOUNT_PRESETS = [1_000, 10_000, 100_000];

interface Props {
  network: NetworkType;
  stats: PlatformStats;
}

export default function StakingCalculator({ network, stats }: Props) {
  const bounds = APY_BOUNDS[network];
  const liveApyBps = Math.min(bounds.max, Math.max(bounds.min, stats.effectiveAPY || bounds.min));
  const burnBps = stats.burnBps ?? 1_000; // default 10%, matches the rest of the dashboard
  const { pairs: pricePairs } = useTokenPrice();
  const fbitPriceUsd = pricePairs[0]?.priceUsd ? Number(pricePairs[0].priceUsd) : null;

  const [amount, setAmount] = useState('10000');
  const [apyBps, setApyBps] = useState(liveApyBps);
  const [durationDays, setDurationDays] = useState(365);

  const result = useMemo(() => {
    const principal = Number(amount);
    if (!Number.isFinite(principal) || principal <= 0) return null;

    const netMultiplier = (10_000 - burnBps) / 10_000;
    const perIntervalRate = apyBps / 10_000 / INTERVALS_PER_YEAR;
    const totalIntervals = Math.round(durationDays * INTERVALS_PER_DAY);

    // Claim-only: reward is withdrawn every interval, principal never grows.
    const claimOnlyReward = principal * perIntervalRate * totalIntervals * netMultiplier;

    // Compounding: net reward is reinvested into the principal each interval,
    // mirroring compoundRewards() — fee is deducted before adding to principal.
    let compounded = principal;
    for (let i = 0; i < totalIntervals; i++) {
      compounded += compounded * perIntervalRate * netMultiplier;
    }
    const compoundReward = compounded - principal;

    const dailyEstimate = principal * perIntervalRate * INTERVALS_PER_DAY * netMultiplier;

    return { claimOnlyReward, compoundReward, dailyEstimate };
  }, [amount, apyBps, durationDays, burnBps]);

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm">Staking Calculator</h3>
          <p className="text-text-muted text-[11px] mt-0.5">
            Explore projected rewards — {network === 'solana' ? '10%–300%' : '60%–250%'} dynamic APY
          </p>
        </div>
        <span className="text-2xl">🧮</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Stake Amount</label>
            <div className="flex items-center gap-2 rounded-xl bg-surface-800/60 border border-white/5 px-3 py-2.5">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent font-mono font-semibold outline-none min-w-0"
              />
              <span className="text-xs text-text-muted shrink-0">FBiT</span>
            </div>
            <UsdValue amount={Number(amount) || 0} priceUsd={fbitPriceUsd} className="text-[11px] block mt-1" />
            <div className="flex gap-1.5 mt-1.5">
              {AMOUNT_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="px-2 py-1 rounded-lg text-[11px] font-mono bg-surface-800/60 border border-white/5 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {formatNumber(p, 0)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-muted">APY</label>
              <span className="text-xs font-mono text-brand-400 font-semibold">{(apyBps / 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              aria-label="APY"
              min={bounds.min}
              max={bounds.max}
              step={100}
              value={apyBps}
              onChange={e => setApyBps(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-text-muted font-mono mt-0.5">
              <span>{(bounds.min / 100).toFixed(0)}%</span>
              <button
                type="button"
                onClick={() => setApyBps(liveApyBps)}
                className="text-brand-400 hover:text-brand-300"
              >
                Use current ({(liveApyBps / 100).toFixed(0)}%)
              </button>
              <span>{(bounds.max / 100).toFixed(0)}%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1.5">Duration</label>
            <div className="flex gap-1.5">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    durationDays === d.days
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-800/60 text-text-muted border border-white/5 hover:text-text-secondary'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl bg-linear-to-br from-brand-500/5 to-accent-purple/5 border border-brand-500/10 p-4 flex flex-col justify-center gap-3">
          {result ? (
            <>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider">Daily estimate</p>
                <p className="font-mono font-semibold text-text-secondary">{formatNumber(result.dailyEstimate, 4)} FBiT</p>
                <UsdValue amount={result.dailyEstimate} priceUsd={fbitPriceUsd} className="text-[11px]" />
              </div>
              <div className="h-px bg-white/5" />
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider">If claimed only ({durationDays}d)</p>
                <p className="font-mono font-semibold text-lg text-text-primary">{formatNumber(result.claimOnlyReward, 4)} FBiT</p>
                <UsdValue amount={result.claimOnlyReward} priceUsd={fbitPriceUsd} className="text-[11px]" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider">If compounded every 6h ({durationDays}d)</p>
                <p className="font-mono font-bold text-lg text-brand-400">{formatNumber(result.compoundReward, 4)} FBiT</p>
                <UsdValue amount={result.compoundReward} priceUsd={fbitPriceUsd} className="text-[11px]" />
                <p className="text-[11px] text-accent-cyan mt-0.5">
                  +{formatNumber(result.compoundReward - result.claimOnlyReward, 4)} FBiT more than claim-only
                </p>
              </div>
            </>
          ) : (
            <p className="text-text-muted text-sm text-center">Enter an amount to see projections.</p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-text-muted mt-3">
        Estimate only — includes the current {(burnBps / 100).toFixed(1)}% burn fee, excludes referral/team
        bonuses. Actual APY is dynamic and adjusts on-chain as total staked changes.
      </p>
    </div>
  );
}
