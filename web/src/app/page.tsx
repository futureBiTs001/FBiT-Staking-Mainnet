'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  FaBolt, FaUsers, FaShield, FaCoins, FaArrowRight,
  FaCheck, FaChevronDown, FaRocket, FaFire, FaGlobe,
  FaLock, FaChartLine, FaLayerGroup, FaRotate,
} from 'react-icons/fa6';
import { SiSolana, SiPolygon } from 'react-icons/si';

// ─── Animated number counter ──────────────────────────────────────────────────

function useCounter(target: number, active: boolean, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const pct = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(target * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return val;
}

// ─── Intersection observer hook ────────────────────────────────────────────────

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Stat card (hero floating cards) ─────────────────────────────────────────

function StatCard({ label, value, suffix = '', delay = 0 }: {
  label: string; value: string; suffix?: string; delay?: number;
}) {
  return (
    <div
      className="glass-card text-center animate-float"
      style={{ animationDelay: `${delay}s`, minWidth: 130 }}
    >
      <p className="stat-value text-2xl font-display font-bold">{value}{suffix}</p>
      <p className="text-text-muted text-xs mt-1 font-body">{label}</p>
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="glass-card !p-0 overflow-hidden cursor-pointer"
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <span className="font-display font-semibold text-text-primary text-sm sm:text-base">{q}</span>
        <FaChevronDown
          className="shrink-0 text-brand-500 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? 200 : 0 }}
      >
        <p className="px-6 pb-5 text-text-secondary text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, accent = '#00E676' }: {
  icon: React.ReactNode; title: string; desc: string; accent?: string;
}) {
  return (
    <div
      className="glass-card group flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-300"
      style={{ '--hover-accent': accent } as React.CSSProperties}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      <h3 className="font-display font-bold text-text-primary">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,230,118,0.15), rgba(6,182,212,0.15))',
          border: '1px solid rgba(0,230,118,0.25)',
          color: '#00E676',
        }}
      >
        {n}
      </div>
      <h3 className="font-display font-bold text-lg text-text-primary">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}

// ─── Referral level row ───────────────────────────────────────────────────────

const REFERRAL_LEVELS = [
  { level: 1, rate: '8.00%',  color: '#00E676' },
  { level: 2, rate: '6.00%',  color: '#06B6D4' },
  { level: 3, rate: '4.00%',  color: '#A855F7' },
  { level: 4, rate: '3.00%',  color: '#3B82F6' },
  { level: 5, rate: '2.50%',  color: '#F59E0B' },
  { level: 6, rate: '2.00%',  color: '#F43F5E' },
  { level: 7, rate: '1.50%',  color: '#06B6D4' },
  { level: 8, rate: '1.00%',  color: '#00E676' },
  { level: 9, rate: '0.50%',  color: '#A855F7' },
  { level: 10, rate: '0.25%', color: '#94a3b8' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main landing page
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  // Stats section counter trigger
  const statsSection = useInView(0.3);
  const tvl    = useCounter(2_480_000, statsSection.inView, 2000);
  const stakers = useCounter(1_247,    statsSection.inView, 1600);
  const burned  = useCounter(312_500,  statsSection.inView, 1800);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const fmtNum = (n: number, prefix = '') =>
    prefix + (n >= 1_000_000
      ? (n / 1_000_000).toFixed(2) + 'M'
      : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K'
      : n.toString());

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#060d19', color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Animated background ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.04) 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glowing orbs */}
        <div
          className="absolute rounded-full animate-pulse-slow"
          style={{ width: 700, height: 700, top: -200, left: -200,
            background: 'radial-gradient(circle, rgba(0,230,118,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <div
          className="absolute rounded-full animate-pulse-slow"
          style={{ width: 600, height: 600, bottom: -100, right: -100,
            background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', filter: 'blur(40px)',
            animationDelay: '2s' }}
        />
        <div
          className="absolute rounded-full animate-pulse-slow"
          style={{ width: 400, height: 400, top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', filter: 'blur(30px)',
            animationDelay: '1s' }}
        />
      </div>

      {/* ── Sticky nav ──────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(6,13,25,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(148,163,184,0.08)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#00E676,#06B6D4)', color: '#060d19' }}
            >F</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 18 }}>
              FBiT<span style={{ color: '#00E676' }}>Stake</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: '#94a3b8' }}>
            {[['features','Features'],['how-it-works','How It Works'],['networks','Networks'],['referral','Referral'],['faq','FAQ']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="hover:text-white transition-colors duration-200"
              >{label}</button>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg,#00E676,#00C853)',
                color: '#060d19',
                boxShadow: '0 4px 15px rgba(0,230,118,0.25)',
              }}
            >
              Launch App <FaArrowRight className="text-xs" />
            </Link>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex flex-col gap-1 p-2"
              onClick={() => setMenuOpen(o => !o)}
            >
              {[0,1,2].map(i => (
                <span
                  key={i}
                  className="block w-5 h-0.5 transition-all duration-300"
                  style={{ background: '#94a3b8' }}
                />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t py-4 px-4 flex flex-col gap-3"
            style={{ background: 'rgba(6,13,25,0.97)', borderColor: 'rgba(148,163,184,0.08)' }}
          >
            {[['features','Features'],['how-it-works','How It Works'],['networks','Networks'],['referral','Referral'],['faq','FAQ']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left py-2 text-sm"
                style={{ color: '#94a3b8' }}
              >{label}</button>
            ))}
            <Link
              href="/app"
              className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#00E676,#00C853)', color: '#060d19' }}
            >
              Launch App <FaArrowRight className="text-xs" />
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 pb-16">
        {/* Live badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00E676' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Now Live on Solana + Polygon Mainnet
        </div>

        {/* Headline */}
        <h1
          style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, lineHeight: 1.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl mb-6 max-w-4xl"
        >
          <span style={{ color: '#f1f5f9' }}>Stake FBiT.</span>{' '}
          <br className="sm:hidden" />
          <span
            style={{
              background: 'linear-gradient(135deg, #00E676 0%, #06B6D4 50%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Earn Up to 250% APY.
          </span>
        </h1>

        <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          A dual-chain DeFi staking platform with a 10-level referral system,
          automated PoS emission, and AI-powered bot protection.
          Available on <span style={{ color: '#A855F7' }}>Solana</span> and{' '}
          <span style={{ color: '#8247E5' }}>Polygon</span>.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/app"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-base transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg,#00E676,#00C853)',
              color: '#060d19',
              boxShadow: '0 6px 30px rgba(0,230,118,0.35)',
            }}
          >
            <FaRocket /> Launch App
          </Link>
          <a
            href="https://polygonscan.com/address/0xb86DA67406DaD482428704c14AdA269E9653FDca#code"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-semibold text-base transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'rgba(15,23,41,0.8)',
              border: '1px solid rgba(148,163,184,0.15)',
              color: '#f1f5f9',
            }}
          >
            <FaShield /> View Contract
          </a>
        </div>

        {/* Network badges */}
        <div className="flex items-center gap-3 mb-12">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#A855F7' }}
          >
            <SiSolana /> Solana
          </div>
          <span style={{ color: '#334155' }}>+</span>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(130,71,229,0.12)', border: '1px solid rgba(130,71,229,0.25)', color: '#8247E5' }}
          >
            <SiPolygon /> Polygon
          </div>
        </div>

        {/* Floating stat cards */}
        <div className="flex flex-wrap justify-center gap-4">
          <StatCard label="Max APY"         value="250"   suffix="%" delay={0}   />
          <StatCard label="Referral Levels" value="10"    suffix="x" delay={0.3} />
          <StatCard label="Claim Interval"  value="12"    suffix="h" delay={0.6} />
          <StatCard label="Burn on Rewards" value="10"    suffix="%" delay={0.9} />
        </div>
      </section>

      {/* ── LIVE STATS BAR ──────────────────────────────────────────────── */}
      <div
        ref={statsSection.ref}
        className="relative z-10 border-y py-10"
        style={{ borderColor: 'rgba(148,163,184,0.08)', background: 'rgba(15,23,41,0.5)', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Total Value Locked',  val: fmtNum(tvl, '$'),  accent: '#00E676' },
            { label: 'Active Stakers',      val: fmtNum(stakers),   accent: '#06B6D4' },
            { label: 'FBiT Burned',         val: fmtNum(burned),    accent: '#F43F5E' },
            { label: 'Referral Levels',     val: '10',              accent: '#A855F7' },
          ].map(({ label, val, accent }) => (
            <div key={label}>
              <p
                className="font-display font-bold text-3xl"
                style={{ color: accent }}
              >{val}</p>
              <p className="text-text-muted text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">Why FBiT Staking</p>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Outfit',sans-serif" }}
            >Built Different</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Every feature is designed to maximise your yield while keeping the platform fair,
              secure, and sustainable.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<FaBolt />}       title="Up to 250% APY"          accent="#00E676"
              desc="Dynamic PoS emission adapts to total staked supply, keeping rewards competitive and sustainable year-round." />
            <FeatureCard icon={<FaUsers />}      title="10-Level Referrals"       accent="#A855F7"
              desc="Earn passive income 10 levels deep. Your network grows, your rewards compound — all on-chain, fully transparent." />
            <FeatureCard icon={<FaGlobe />}      title="Dual Chain"               accent="#06B6D4"
              desc="Stake on Solana for lightning speed or Polygon for EVM compatibility. Same rewards, your preferred chain." />
            <FeatureCard icon={<FaRotate />}     title="Auto Compound"            accent="#F59E0B"
              desc="Compound your rewards back into your stake with a single click — no manual re-staking required." />
            <FeatureCard icon={<FaFire />}       title="Deflationary Burns"       accent="#F43F5E"
              desc="10% of every claimed or compounded reward is burned permanently, reducing supply and supporting long-term value." />
            <FeatureCard icon={<FaShield />}     title="AI Bot Protection"        accent="#3B82F6"
              desc="8-layer bot management with TF.js behavioural ML and Claude AI deep analysis guards every transaction." />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-24 px-4">
        <div
          className="max-w-5xl mx-auto rounded-3xl py-16"
          style={{ background: 'rgba(15,23,41,0.6)', border: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(20px)' }}
        >
          <div className="text-center mb-14 px-4">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Start Earning in 3 Steps
            </h2>
          </div>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-10 px-6 relative">
            {/* Connector lines (desktop) */}
            <div
              className="hidden sm:block absolute top-7 left-1/4 right-1/4 h-px"
              style={{ background: 'linear-gradient(90deg,rgba(0,230,118,0.3),rgba(6,182,212,0.3))' }}
            />
            <StepCard n={1} title="Connect Wallet"
              desc="Use MetaMask, Phantom, or any WalletConnect-compatible wallet. One click to connect on either chain." />
            <StepCard n={2} title="Stake FBiT"
              desc="Choose your amount (min 1 FBiT). Optionally enter a referral code to link your account to your referrer." />
            <StepCard n={3} title="Claim & Compound"
              desc="Rewards accrue every 12 hours. Claim to wallet or compound back into your stake — your choice, every time." />
          </div>
        </div>
      </section>

      {/* ── NETWORKS ────────────────────────────────────────────────────── */}
      <section id="networks" className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">Multi-Chain</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Choose Your Network
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto">
              Both chains run the same battle-tested staking logic with full feature parity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Solana */}
            <div
              className="rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300 hover:scale-[1.02]"
              style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}
                >
                  <SiSolana />
                </div>
                <div>
                  <p className="font-display font-bold text-lg" style={{ color: '#A855F7' }}>Solana</p>
                  <p className="text-text-muted text-xs">Lightning fast · Sub-cent fees</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {['Anchor program on Mainnet','SPL Token (FBiT)','Phantom & Solflare support','&lt;400ms finality','Permissionless halving trigger'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <FaCheck className="text-xs shrink-0" style={{ color: '#A855F7' }} />
                    <span dangerouslySetInnerHTML={{ __html: item }} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Polygon */}
            <div
              className="rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300 hover:scale-[1.02]"
              style={{ background: 'rgba(130,71,229,0.07)', border: '1px solid rgba(130,71,229,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'rgba(130,71,229,0.15)', color: '#8247E5' }}
                >
                  <SiPolygon />
                </div>
                <div>
                  <p className="font-display font-bold text-lg" style={{ color: '#8247E5' }}>Polygon</p>
                  <p className="text-text-muted text-xs">EVM compatible · MetaMask native</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {['Verified on Polygonscan (MIT)','WFBIT ERC-20 Token','MetaMask & WalletConnect','Auto chain-switch on connect','Multi-RPC fallback for reliability'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <FaCheck className="text-xs shrink-0" style={{ color: '#8247E5' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── REFERRAL ────────────────────────────────────────────────────── */}
      <section id="referral" className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">Referral Engine</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Outfit',sans-serif" }}>
              10-Level Deep Rewards
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Earn a share of your network's staking rewards — 10 levels deep,
              every 12 hours, fully on-chain.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Level table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(148,163,184,0.08)', background: 'rgba(15,23,41,0.6)' }}
            >
              <div
                className="px-5 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
                style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', color: '#64748b' }}
              >
                <span>Level</span>
                <span>Reward Rate</span>
                <span>Bar</span>
              </div>
              {REFERRAL_LEVELS.map(({ level, rate, color }) => {
                const pct = parseFloat(rate) / 8 * 100;
                return (
                  <div
                    key={level}
                    className="px-5 py-2.5 flex items-center justify-between gap-4"
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.05)' }}
                  >
                    <span className="font-mono text-sm font-semibold" style={{ color }}>L{level}</span>
                    <span className="font-display font-bold text-sm text-text-primary">{rate}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(148,163,184,0.1)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explainer */}
            <div className="flex flex-col gap-5">
              {[
                { icon: <FaUsers />, title: 'Passive Network Income', color: '#A855F7',
                  desc: 'Every time someone in your network (up to 10 levels deep) claims or compounds, you earn a percentage automatically credited to your account.' },
                { icon: <FaChartLine />, title: 'Compounds Naturally', color: '#00E676',
                  desc: 'Referral rewards accumulate alongside your staking rewards. Claim them together or compound — your choice, every 12 hours.' },
                { icon: <FaLayerGroup />, title: 'Scales With Your Network', color: '#06B6D4',
                  desc: 'A network of 100 active stakers across 5 levels can generate significant passive income — all on-chain with full transparency.' },
              ].map(({ icon, title, color, desc }) => (
                <div key={title} className="glass-card flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}18`, color }}
                  >{icon}</div>
                  <div>
                    <p className="font-display font-bold text-sm mb-1">{title}</p>
                    <p className="text-text-secondary text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">Protection</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Security First
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Multiple layers of protection keep the platform fair for everyone.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: <FaShield />, color: '#00E676', title: 'Smart Contract',
                items: ['MIT License (SPDX)', 'Verified on Polygonscan', 'Anchor verified (Solana)', 'Pausable emergency stop', 'Renounce-ownership model'] },
              { icon: <FaLock />, color: '#A855F7', title: '8-Layer Bot Guard',
                items: ['Browser fingerprinting', 'Behavioral ML (TF.js)', 'Claude AI deep analysis', 'SHA-256 PoW challenge', 'Sliding-window rate limits'] },
              { icon: <FaFire />, color: '#F43F5E', title: 'Economic Safety',
                items: ['10% burn on every claim', 'Pool reserve protection', '12h claim cooldown', 'Max stake per wallet cap', 'Annual emission schedule'] },
            ].map(({ icon, color, title, items }) => (
              <div
                key={title}
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{ background: `${color}08`, border: `1px solid ${color}22` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}15`, color }}
                  >{icon}</div>
                  <p className="font-display font-bold">{title}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                      <FaCheck className="text-[10px] shrink-0" style={{ color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative z-10 py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-500 text-sm font-semibold tracking-widest uppercase mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Common Questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            <FAQItem q="What is the minimum stake amount?"
              a="The minimum stake is 1 FBiT token. There is no fixed lock period — you can unstake at any time, though rewards accrue on a 12-hour interval." />
            <FAQItem q="How often can I claim rewards?"
              a="Rewards can be claimed once every 12 hours per stake. You can also compound your rewards (re-stake them) on the same 12-hour schedule." />
            <FAQItem q="What is the 10% burn mechanism?"
              a="When you claim or compound rewards, 10% of the reward amount is permanently burned (sent to the zero address). This reduces total supply over time, supporting long-term token value." />
            <FAQItem q="How does the referral system work?"
              a="When someone stakes using your referral link, they become Level 1 in your network. You earn 8% of their rewards. Their referrals are your Level 2 (6%), and so on — 10 levels deep." />
            <FAQItem q="Is the APY fixed at 250%?"
              a="The APY is dynamic. It's calculated as (Annual Emission ÷ Total Staked) × 10,000 bps. The platform clamps it between 60% minimum and 250% maximum to stay sustainable." />
            <FAQItem q="Are the contracts audited and open source?"
              a="Both contracts carry the SPDX MIT license, are fully open source, and are source-verified on Polygonscan (Polygon) and the Solana Explorer (Solana). Anyone can read the full code." />
            <FAQItem q="What wallets are supported?"
              a="On Polygon: MetaMask, WalletConnect, Coinbase Wallet, and any EVM wallet. On Solana: Phantom, Solflare, and other Solana wallet adapters." />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl p-12 relative overflow-hidden"
            style={{
              background: 'rgba(15,23,41,0.7)',
              border: '1px solid rgba(0,230,118,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 80px rgba(0,230,118,0.07)',
            }}
          >
            {/* Inner glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,230,118,0.08), transparent)' }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', color: '#00E676' }}
              >
                <FaRocket /> Start Earning Today
              </div>
              <h2
                className="text-3xl sm:text-5xl font-bold mb-4"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                Your Rewards Are{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg,#00E676,#06B6D4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Waiting
                </span>
              </h2>
              <p className="text-text-secondary mb-10 max-w-md mx-auto">
                Connect your wallet, stake FBiT, and watch your rewards grow — every 12 hours,
                automatically.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/app"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-base transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'linear-gradient(135deg,#00E676,#00C853)',
                    color: '#060d19',
                    boxShadow: '0 6px 30px rgba(0,230,118,0.35)',
                  }}
                >
                  <FaRocket /> Launch the App
                </Link>
                <a
                  href="https://polygonscan.com/address/0xb86DA67406DaD482428704c14AdA269E9653FDca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-semibold text-base transition-all duration-300"
                  style={{ border: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}
                >
                  <FaCoins /> Polygonscan
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 border-t py-12 px-4"
        style={{ borderColor: 'rgba(148,163,184,0.08)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#00E676,#06B6D4)', color: '#060d19' }}
                >F</div>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 18 }}>
                  FBiT<span style={{ color: '#00E676' }}>Stake</span>
                </span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed max-w-sm">
                A dual-chain DeFi staking platform delivering up to 250% APY
                with a 10-level referral engine and AI-powered bot protection.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <div className="network-badge solana"><SiSolana /> Solana</div>
                <div className="network-badge polygon"><SiPolygon /> Polygon</div>
              </div>
            </div>

            {/* Platform */}
            <div>
              <p className="font-display font-semibold text-sm mb-4 text-text-secondary uppercase tracking-wider">Platform</p>
              <ul className="flex flex-col gap-2 text-sm text-text-muted">
                {[['/app', 'Launch App'], ['/app', 'Start Staking'], ['/app', 'Referral Program'], ['/app', 'History']].map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white transition-colors duration-200">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contracts */}
            <div>
              <p className="font-display font-semibold text-sm mb-4 text-text-secondary uppercase tracking-wider">Contracts</p>
              <ul className="flex flex-col gap-2 text-sm text-text-muted">
                {[
                  ['https://polygonscan.com/address/0xb86DA67406DaD482428704c14AdA269E9653FDca#code', 'FBiTStaking (Polygon)'],
                  ['https://polygonscan.com/address/0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945#code', 'WFBIT Token'],
                ].map(([href, label]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors duration-200"
                    >{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
            style={{ borderTop: '1px solid rgba(148,163,184,0.06)', color: '#475569' }}
          >
            <p>© 2025 FBiT Staking. MIT License. All smart contract source code is public.</p>
            <p className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-brand-500"
                style={{ boxShadow: '0 0 6px #00E676' }}
              />
              Mainnet Live
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
