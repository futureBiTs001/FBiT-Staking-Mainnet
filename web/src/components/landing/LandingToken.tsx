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

const INFO_ROWS = [
  { label: 'Token Name',      value: 'FutureBit' },
  { label: 'Symbol',          value: 'FBiT' },
  { label: 'Network',         value: 'Solana Mainnet' },
  { label: 'Standard',        value: 'SPL Token' },
  { label: 'Total Supply',    value: '250,000,000 FBiT' },
  { label: 'Decimals',        value: '9' },
  { label: 'Mint Authority',  value: 'Renounced (fixed supply)' },
  { label: 'Liquidity',       value: '100% locked / burned' },
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
        <div className="glass-card">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {INFO_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-text-muted">{row.label}</span>
                <span className="font-mono text-text-secondary text-right">{row.value}</span>
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
