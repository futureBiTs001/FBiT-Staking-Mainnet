'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '#stats',      label: 'Stats' },
  { href: '#token',      label: 'Token' },
  { href: '#rewards',    label: 'Rewards' },
  { href: '#tokenomics', label: 'Tokenomics' },
  { href: '#security',   label: 'Security' },
  { href: '#roadmap',    label: 'Roadmap' },
  { href: '#faq',        label: 'FAQ' },
];

const WHITEPAPER_URL = 'https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet/blob/main/WHITEPAPER.md';
const FBIT_MINT      = '5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME';
const VERIFY_URL     = `https://solscan.io/token/${FBIT_MINT}`;

export default function LandingHeader() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo — links home from any page that reuses this header (e.g. /guide) */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative inline-flex shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FBiT logo" className="w-9 h-9 rounded-full object-cover" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-surface-900 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg leading-tight">FutureBit</h1>
              <p className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Solana Protocol</p>
            </div>
          </Link>

          {/* Desktop Nav — full row only at xl; below that everything moves into the
              hamburger menu, so the extra Guide/Whitepaper/Verify links can't overflow. */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg font-display text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <a
              href={VERIFY_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Verify the FBiT token contract on Solscan"
              className="hidden xl:inline-flex items-center gap-1.5 text-sm font-display px-3 py-2 rounded-lg border border-[#9945FF]/30 text-[#9945FF] hover:bg-[#9945FF]/10 hover:border-[#14F195]/50 hover:text-[#14F195] transition-all"
            >
              <span>🛡</span> Verify Token
            </a>
            <Link
              href="/guide"
              className="hidden xl:inline-block text-sm font-display text-text-secondary hover:text-text-primary transition-colors px-2"
            >
              Guide
            </Link>
            <a
              href={WHITEPAPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-block text-sm font-display text-text-secondary hover:text-text-primary transition-colors px-2"
            >
              Whitepaper
            </a>
            <Link href="/app" className="btn-primary text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5">
              Launch App
            </Link>

            {/* Menu toggle — covers everything below xl */}
            <button
              type="button"
              title="Toggle menu"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="xl:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-0.5 bg-text-secondary transition-all ${showMobileMenu ? 'rotate-45 translate-y-1.75' : ''}`} />
                <span className={`block h-0.5 bg-text-secondary transition-all ${showMobileMenu ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-text-secondary transition-all ${showMobileMenu ? '-rotate-45 -translate-y-1.75' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {showMobileMenu && (
          <nav className="xl:hidden pb-4 animate-slide-up">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className="px-4 py-3 rounded-xl font-display text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
                >
                  {item.label}
                </a>
              ))}
              <a
                href={VERIFY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-3 rounded-xl font-display text-sm text-[#9945FF] hover:bg-[#9945FF]/10 transition-all flex items-center gap-2"
              >
                🛡 Verify Token
              </a>
              <Link
                href="/guide"
                onClick={() => setShowMobileMenu(false)}
                className="px-4 py-3 rounded-xl font-display text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
              >
                Guide
              </Link>
              <a
                href={WHITEPAPER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl font-display text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
              >
                Whitepaper
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
