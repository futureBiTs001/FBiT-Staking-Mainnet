'use client';

import React from 'react';
import Reveal from './Reveal';
import { REFERRAL_LEVELS, TEAM_TARGET_TIERS, type TeamTargetTier } from '@/types';
import { formatNumber } from '@/lib/utils';

type TierColor = TeamTargetTier['color'];

const tierColorMap: Record<TierColor, string> = {
  amber:  'text-accent-amber',
  slate:  'text-slate-400',
  yellow: 'text-yellow-400',
  cyan:   'text-accent-cyan',
  purple: 'text-accent-purple',
  rose:   'text-accent-rose',
  green:  'text-emerald-400',
  blue:   'text-blue-400',
  gray:   'text-gray-400',
  brand:  'text-brand-400',
};
const tierBgMap: Record<TierColor, string> = {
  amber:  'bg-accent-amber/20 border-accent-amber/30',
  slate:  'bg-slate-400/20 border-slate-400/30',
  yellow: 'bg-yellow-400/20 border-yellow-400/30',
  cyan:   'bg-accent-cyan/20 border-accent-cyan/30',
  purple: 'bg-accent-purple/20 border-accent-purple/30',
  rose:   'bg-accent-rose/20 border-accent-rose/30',
  green:  'bg-emerald-400/20 border-emerald-400/30',
  blue:   'bg-blue-400/20 border-blue-400/30',
  gray:   'bg-gray-400/20 border-gray-400/30',
  brand:  'bg-brand-400/20 border-brand-400/30',
};

const TOTAL_REFERRAL_PCT = REFERRAL_LEVELS.reduce((s, l) => s + l.percentage, 0);

export default function LandingRewards() {
  return (
    <section id="rewards" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Referrals & Team Bonus</h2>
          <p className="text-text-muted text-sm max-w-xl mx-auto">
            Two extra reward layers on top of base staking APY — both calculated and paid automatically on-chain, no manual claiming.
          </p>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── 10-Level Referral Program ── */}
        <Reveal delay={80}>
          <div className="glass-card h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold text-lg">10-Level Referral Program</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-display font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                {TOTAL_REFERRAL_PCT.toFixed(1)}% total
              </span>
            </div>
            <p className="text-text-muted text-xs mb-5 leading-relaxed">
              Refer a wallet once at registration — every one of their reward claims pays a commission up to
              10 levels deep in your downline, straight from the reward pool. Your referral never loses any
              of their own reward; the commission is paid on top.
            </p>

            <div className="space-y-1.5">
              {REFERRAL_LEVELS.map((l) => (
                <div key={l.level} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-mono text-text-muted">Level {l.level}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-cyan transition-all duration-700"
                      style={{ width: `${Math.max((l.percentage / TOTAL_REFERRAL_PCT) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs font-mono font-semibold text-text-primary">
                    {l.percentage.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Team Target Bonus ── */}
        <Reveal delay={140}>
          <div className="glass-card h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold text-lg">Team Target Bonus</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-display font-bold bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
                up to +10% APY
              </span>
            </div>
            <p className="text-text-muted text-xs mb-5 leading-relaxed">
              Grow your entire downline's total staked amount (all 10 levels combined) to unlock progressively
              higher bonus tiers — applied automatically on top of your base APY on every claim.
            </p>

            <div className="grid grid-cols-5 gap-1.5">
              {TEAM_TARGET_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  title={`${tier.label}: ${formatNumber(tier.minTeamStaked)} FBiT team stake → +${tier.bonusPercentage}%`}
                  className={`rounded-lg p-2 text-center border ${tierBgMap[tier.color]}`}
                >
                  <p className={`text-[9px] font-display font-bold leading-tight ${tierColorMap[tier.color]}`}>
                    {tier.label}
                  </p>
                  <p className="text-[10px] font-mono font-semibold mt-1 text-text-primary">
                    +{tier.bonusPercentage}%
                  </p>
                  <p className="text-[8px] font-mono text-text-muted mt-0.5 leading-none">
                    {formatNumber(tier.minTeamStaked)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
