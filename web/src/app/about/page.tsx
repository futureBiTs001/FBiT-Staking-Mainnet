'use client';
import SupportChat from '@/components/ui/SupportChat';
import Link from 'next/link';

const NAV = [
  { label: 'Home',            href: '/landing' },
  { label: 'About Us',        href: '/about' },
  { label: 'Privacy Policy',  href: '/privacy' },
  { label: 'Terms',           href: '/terms' },
  { label: 'Launch App',      href: 'https://stake.futurebit.in' },
];

function PageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-900 text-white font-body">
      <nav className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-surface-900">F</div>
            <span className="font-display font-bold">Future<span className="text-brand-400">Bit</span></span>
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-display text-text-muted">
            {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-white transition-colors">{n.label}</a>)}
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display font-bold text-4xl md:text-5xl mb-10 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">{title}</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
          {children}
        </div>
      </main>
      <footer className="border-t border-white/5 py-8 px-6 text-center text-text-muted text-xs">
        <div className="flex justify-center gap-6 mb-3">
          {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-brand-400 transition-colors">{n.label}</a>)}
        </div>
        © 2026 FutureBit Staking. All rights reserved.
      </footer>
      <SupportChat />
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageLayout title="About FutureBit">

      <section>
        <h2 className="text-white font-display font-bold text-2xl mb-3">Our Mission</h2>
        <p>FutureBit is a next-generation, multi-chain decentralized staking platform built to make passive crypto income accessible to everyone. We believe in a future where financial freedom is not limited by geography, background, or capital size.</p>
        <p>Our platform allows users to stake FBiT tokens on Solana and WFBIT on Polygon — earning dynamic Proof-of-Stake rewards with full transparency, no custodianship, and no middlemen.</p>
      </section>

      <section>
        <h2 className="text-white font-display font-bold text-2xl mb-3">What We Built</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
          {[
            { icon: '⚡', title: 'Multi-Chain Staking',    desc: 'Stake on Solana (ultra-low fees) or Polygon (EVM compatible). One ecosystem, two powerful blockchains.' },
            { icon: '📈', title: 'Dynamic PoS APY',        desc: 'Our self-adjusting APY (currently ~247%) increases as staking decreases and decreases as it grows — perfectly fair.' },
            { icon: '👥', title: '10-Level Referrals',     desc: 'Earn commissions from 10 referral levels. Build a network and earn passive income from your entire downline forever.' },
            { icon: '🔥', title: 'Deflationary Burn',      desc: '10% of every staking reward is permanently burned — reducing total supply over time and adding scarcity to FBiT.' },
            { icon: '🏆', title: 'Team Target Bonuses',    desc: 'Unlock up to 10% additional bonus based on your team\'s total staked amount across 10 progressive tiers.' },
            { icon: '🔒', title: 'Non-Custodial Security', desc: 'Your funds are always in your wallet. Our open-source, audited contracts ensure complete transparency and safety.' },
          ].map(f => (
            <div key={f.title} className="rounded-xl bg-surface-800/50 border border-white/5 p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-display font-bold text-white mb-1">{f.title}</h3>
              <p className="text-text-muted text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-white font-display font-bold text-2xl mb-3">Our Technology</h2>
        <p>FutureBit is built on battle-tested blockchain technology:</p>
        <ul className="list-disc pl-5 space-y-1 text-text-muted text-sm">
          <li><strong className="text-text-primary">Solana Program:</strong> Written in Rust using the Anchor framework. Program ID: <code className="text-brand-400 text-xs">8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp</code></li>
          <li><strong className="text-text-primary">Polygon Contract:</strong> Solidity smart contract using OpenZeppelin standards. Verified on Polygonscan. Address: <code className="text-brand-400 text-xs">0xb86DA67406DaD482428704c14AdA269E9653FDca</code></li>
          <li><strong className="text-text-primary">Frontend:</strong> Next.js 16 with TypeScript — blazing fast, SEO-optimized</li>
          <li><strong className="text-text-primary">Wallet Support:</strong> Phantom (Solana), MetaMask, WalletConnect (Polygon)</li>
          <li><strong className="text-text-primary">AI Support:</strong> Claude AI (Anthropic) for intelligent user assistance</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-display font-bold text-2xl mb-3">Token Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose text-sm">
          <div className="rounded-xl bg-surface-800/50 border border-white/5 p-5 space-y-2">
            <p className="font-display font-bold text-white">FBiT (Solana)</p>
            <p className="text-text-muted text-xs font-mono break-all">CuubBzUTnQ4H2D2fHJCVWGEUEod2fJzq4nAPwfx8UGTu</p>
            <p className="text-text-muted">Decimals: 6 | Network: Solana Mainnet</p>
          </div>
          <div className="rounded-xl bg-surface-800/50 border border-white/5 p-5 space-y-2">
            <p className="font-display font-bold text-white">WFBIT (Polygon)</p>
            <p className="text-text-muted text-xs font-mono break-all">0xa31b5A95268CAd709e6691Ec2F2F107A3F36D945</p>
            <p className="text-text-muted">Decimals: 6 | Network: Polygon Mainnet</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-white font-display font-bold text-2xl mb-3">Transparency & Open Source</h2>
        <p>All FutureBit smart contracts are open-source and publicly verifiable:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><a href="https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">GitHub Repository ↗</a></li>
          <li><a href="https://explorer.solana.com/address/8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Solana Explorer ↗</a></li>
          <li><a href="https://polygonscan.com/address/0xb86DA67406DaD482428704c14AdA269E9653FDca" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Polygonscan ↗</a></li>
        </ul>
      </section>

      <div className="not-prose pt-4">
        <a href="https://stake.futurebit.in" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-900 font-display font-bold transition-all">
          Start Staking →
        </a>
      </div>
    </PageLayout>
  );
}
