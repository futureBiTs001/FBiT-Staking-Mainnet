'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { shortenAddress } from '@/lib/utils';
import Reveal from './Reveal';

const FBIT_MINT = '5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME';
const SOLSCAN_TOKEN_URL = `https://solscan.io/token/${FBIT_MINT}`;

function copyMint() {
  navigator.clipboard.writeText(FBIT_MINT);
  toast.success('Mint address copied!');
}

const STATS = [
  { icon: '🪙', label: 'Total Supply',   value: '250M',       sub: 'FBiT, fixed forever' },
  { icon: '🔢', label: 'Decimals',       value: '9',          sub: 'SPL token precision' },
  { icon: '🔒', label: 'Mint Authority', value: 'Renounced',  sub: 'No new tokens, ever' },
  { icon: '💧', label: 'Liquidity',      value: '100%',       sub: 'Locked / burned' },
];

export default function LandingToken() {
  return (
    <section id="token" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Reveal>
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Token Details</h2>
          <p className="text-text-muted text-sm">
            Everything here is verifiable on-chain — check it yourself before you stake.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="glass-card overflow-hidden">
          {/* Identity strip */}
          <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="FBiT logo" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-xl">FutureBit</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-display font-bold bg-brand-500/15 text-brand-400 border border-brand-500/30">
                  FBiT
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" /> Solana Mainnet
                </span>
                <span className="text-white/15">·</span>
                <span>SPL Token</span>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/3 border border-white/10 px-4 py-3.5 text-center">
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="font-display font-bold text-base sm:text-lg text-text-primary">{s.value}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
                <p className="text-text-muted/70 text-[10px] mt-0.5 leading-tight hidden sm:block">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Mint address + verify */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-1.5">
                Mint Address
              </p>
              <button
                type="button"
                onClick={copyMint}
                className="font-mono text-sm text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5"
                title="Copy full address"
              >
                <span className="sm:hidden">{shortenAddress(FBIT_MINT)}</span>
                <span className="hidden sm:inline break-all">{FBIT_MINT}</span>
                <span className="text-xs shrink-0">⧉</span>
              </button>
            </div>
            <a
              href={SOLSCAN_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm px-5 py-2.5 text-center shrink-0"
            >
              Verify on Solscan ↗
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
