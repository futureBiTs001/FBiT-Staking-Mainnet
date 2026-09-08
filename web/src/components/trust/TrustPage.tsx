'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/landing/Reveal';
import type { PlatformStats, UserAccount } from '@/types';

const FBIT_MINT = '5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME';
const PROGRAM_ID = '8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp';
const GITHUB_URL = 'https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet';
const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Rounding a genuinely-small-but-nonzero amount (e.g. 0.0757 FBiT burned so far,
// on a platform with very little claim volume yet) to 0 decimals reads as "0" —
// which looks like burning isn't working, when it actually is. Show more
// precision for sub-1 amounts so a real, working mechanism doesn't look broken.
function formatFBiT(v: number): string {
  if (v > 0 && v < 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function StatCard({ icon, value, label, loading }: { icon: string; value: string; label: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/10 px-5 py-6 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <p className={`font-display font-bold text-2xl sm:text-3xl text-text-primary ${loading ? 'animate-pulse opacity-50' : ''}`}>
        {value}
      </p>
      <p className="text-text-muted text-[11px] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

const CHECKLIST = [
  {
    icon: '🔒',
    title: 'Mint Authority Renounced',
    desc: 'No one — not even the FutureBit team — can ever mint new FBiT. 250,000,000 is the permanent, final supply.',
    href: `https://solscan.io/token/${FBIT_MINT}`,
    linkLabel: 'Verify mint on Solscan',
  },
  {
    icon: '📜',
    title: 'Contract Is Open-Source',
    desc: 'Every line of the staking program is public. Anyone can read it, compile it, and check that it matches what\'s deployed.',
    href: GITHUB_URL,
    linkLabel: 'Read the source on GitHub',
  },
  {
    icon: '🔑',
    title: 'Non-Custodial, Always',
    desc: 'Your FBiT never leaves your wallet. Staking, claiming, and unstaking are direct wallet-to-contract transactions — we never take custody.',
    href: `https://solscan.io/account/${PROGRAM_ID}`,
    linkLabel: 'Verify program on Solscan',
  },
];

export default function TrustPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [query, setQuery] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'notfound' | 'invalid'>('idle');
  const [lookupResult, setLookupResult] = useState<UserAccount | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { solanaFetchPlatformStats } = await import('@/lib/contracts/solana');
        setStats(await solanaFetchPlatformStats());
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const addr = query.trim();
    if (!SOLANA_ADDR_RE.test(addr)) {
      setLookupState('invalid');
      setLookupResult(null);
      return;
    }
    setLookupState('loading');
    setLookupResult(null);
    try {
      const { solanaGetUserAccount } = await import('@/lib/contracts/solana');
      const acc = await solanaGetUserAccount(addr);
      if (acc) {
        setLookupResult(acc);
        setLookupState('idle');
      } else {
        setLookupState('notfound');
      }
    } catch {
      setLookupState('notfound');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      {/* Hero */}
      <Reveal>
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/30 mb-6">
            ✓ Verified On-Chain
          </span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight mb-4">
            <span className="bg-linear-to-r from-white via-brand-400 to-[#9945FF] bg-clip-text text-transparent">
              Nothing Here Requires Trust.
            </span>
            <br />
            Only Verification.
          </h1>
          <p className="text-text-muted text-base sm:text-lg max-w-xl mx-auto">
            Is FBiT staking safe? Judge for yourself — every number on this page is read live from
            the Solana blockchain, not a database we control or a claim we're making.
          </p>
        </div>
      </Reveal>

      {/* Live stats */}
      <Reveal delay={80}>
        <div className="glass-card mb-8 py-8">
          <p className="text-text-muted text-[11px] font-display uppercase tracking-wider text-center mb-6 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" /> Live From the Blockchain
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon="👥"
              loading={loadingStats}
              value={stats ? stats.totalUsers.toLocaleString() : '—'}
              label="Registered Stakers"
            />
            <StatCard
              icon="🪙"
              loading={loadingStats}
              value={stats ? formatFBiT(stats.totalStaked) : '—'}
              label="FBiT Currently Staked"
            />
            <StatCard
              icon="💸"
              loading={loadingStats}
              value={stats ? formatFBiT(stats.totalEmissionReleased) : '—'}
              label="FBiT Released to Reward Pool"
            />
            <StatCard
              icon="🔥"
              loading={loadingStats}
              value={stats ? formatFBiT(stats.totalBurned) : '—'}
              label="FBiT Burned Forever"
            />
          </div>
        </div>
      </Reveal>

      {/* Trust checklist */}
      <Reveal delay={140}>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {CHECKLIST.map((c) => (
            <div key={c.title} className="glass-card">
              <div className="text-2xl mb-3">{c.icon}</div>
              <h3 className="font-display font-semibold text-base mb-1.5">{c.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed mb-4">{c.desc}</p>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 text-xs font-display font-semibold inline-flex items-center gap-1 transition-colors"
              >
                {c.linkLabel} ↗
              </a>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Bytecode verification */}
      <Reveal delay={170}>
        <div className="glass-card mb-8">
          <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-1.5">Prove It Yourself</p>
          <h2 className="font-display font-bold text-xl sm:text-2xl mb-2">Program Bytecode, Independently Verified</h2>
          <p className="text-text-muted text-sm mb-4 leading-relaxed">
            The deployed program was compared byte-for-byte against a fresh build of{' '}
            <a href={`${GITHUB_URL}/tree/54af6e8`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">
              this exact commit
            </a>{' '}
            of the open-source code — not just similar, not just &quot;looks right,&quot; but an identical match confirmed via SHA-256 hash of the actual bytecode pulled live from Solana Mainnet.
          </p>
          <div className="rounded-xl bg-surface-900/80 border border-white/5 p-4 font-mono text-xs space-y-2 mb-4">
            <div>
              <span className="text-text-muted">SHA-256 (on-chain, first 473,128 bytes):</span>
              <p className="text-brand-400 break-all mt-0.5">82a657037dcd4c64a7911893449cdd9fa8945c39fc88eadc13394dc06275999a</p>
            </div>
            <div>
              <span className="text-text-muted">SHA-256 (built from source):</span>
              <p className="text-brand-400 break-all mt-0.5">82a657037dcd4c64a7911893449cdd9fa8945c39fc88eadc13394dc06275999a</p>
            </div>
          </div>
          <p className="text-text-muted text-xs leading-relaxed mb-3">
            You don&apos;t have to take our word for it — anyone can reproduce this: run{' '}
            <code className="text-text-secondary">solana program dump {PROGRAM_ID} chain.so --url mainnet-beta</code>,
            build the program from the GitHub source above, and compare <code className="text-text-secondary">sha256sum</code> output.
            (An automated &quot;Verified Build&quot; badge on Solscan/Solana Explorer isn&apos;t showing yet — their
            registry hasn&apos;t published a build image for the newer Solana CLI version this program was compiled
            with. This manual, reproducible check is the same underlying proof that badge would represent.)
          </p>
          <a
            href={`https://solscan.io/account/${PROGRAM_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 text-xs font-display font-semibold inline-flex items-center gap-1 transition-colors"
          >
            View program on Solscan ↗
          </a>
        </div>
      </Reveal>

      {/* Wallet lookup tool */}
      <Reveal delay={200}>
        <div className="glass-card mb-8">
          <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-1.5">Prove It Yourself</p>
          <h2 className="font-display font-bold text-xl sm:text-2xl mb-2">Check Any Wallet's Real Staking History</h2>
          <p className="text-text-muted text-sm mb-6">
            Paste any Solana wallet address — including your own — and see exactly what it has staked and earned, read directly from the on-chain program. No login, no connection required.
          </p>

          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLookupState('idle'); }}
              placeholder="Paste a Solana wallet address…"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 transition-colors"
            />
            <button type="submit" className="btn-primary text-sm px-6 py-3 shrink-0">
              Check Wallet
            </button>
          </form>

          {lookupState === 'invalid' && (
            <p className="text-accent-rose text-xs mt-3">That doesn't look like a valid Solana address.</p>
          )}
          {lookupState === 'loading' && (
            <p className="text-text-muted text-xs mt-3 animate-pulse">Reading on-chain data…</p>
          )}
          {lookupState === 'notfound' && (
            <p className="text-text-muted text-xs mt-3">No FutureBit Staking account found for this wallet — it has never staked FBiT.</p>
          )}

          {lookupResult && (
            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="font-display font-bold text-lg">{lookupResult.totalStaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">Currently Staked</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-lg text-brand-400">{lookupResult.totalRewardsEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">Rewards Claimed</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-lg text-accent-cyan">{lookupResult.totalReferralRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">Referral Earned</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-lg">{lookupResult.referralCount}</p>
                <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">Referrals</p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Footer verify links */}
      <Reveal delay={260}>
        <div className="text-center">
          <p className="text-text-muted text-xs mb-3">Or verify the raw on-chain accounts directly:</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-display">
            <a href={`https://solscan.io/token/${FBIT_MINT}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 transition-colors">FBiT Mint ↗</a>
            <span className="text-white/15">·</span>
            <a href={`https://solscan.io/account/${PROGRAM_ID}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 transition-colors">Staking Program ↗</a>
            <span className="text-white/15">·</span>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 transition-colors">Source Code ↗</a>
            <span className="text-white/15">·</span>
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors">Back to Home</Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
