import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about FutureBit and the FBiT staking platform built on Solana.',
  alternates: {
    canonical: '/about/',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-dark)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #00E676, #00a855)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18, color: '#060d19',
            }}>F</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>FBiT Staking</span>
          </Link>
          <Link href="/app" style={{
            padding: '8px 20px', borderRadius: 8,
            background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)',
            color: '#00E676', textDecoration: 'none', fontSize: 14, fontWeight: 500,
          }}>
            Launch App
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg,#fff,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          About FutureBit
        </h1>
        <p style={{ color: '#00E676', fontSize: 15, marginBottom: 48, fontWeight: 500 }}>
          Solana DeFi Staking Platform
        </p>

        <Section title="Who We Are">
          FutureBit is a decentralized finance project built to bring transparent, high-yield staking to everyday crypto users.
          We launched the FBiT token on Solana — a fast, low-fee blockchain.
          Our mission is to make passive crypto income accessible without KYC, without custodians, and without complexity.
        </Section>

        <Section title="What We Do">
          FBiT Staking is a non-custodial staking platform where users lock FBiT on Solana to earn dynamic
          Proof-of-Stake rewards. The smart contract runs fully on-chain — we never hold your tokens. Every stake, unstake, and reward
          claim is a verifiable blockchain transaction.
        </Section>

        <Section title="Our Technology">
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-secondary)' }}>
            <li><b style={{ color: '#f1f5f9' }}>Solana Smart Contract</b> — written in Rust using the Anchor framework. Deployed on Solana Mainnet.</li>
            <li><b style={{ color: '#f1f5f9' }}>10-Level Referral System</b> — on-chain referral commissions auto-distributed to up to 10 levels of referrers.</li>
            <li><b style={{ color: '#f1f5f9' }}>Dynamic APY</b> — reward rate adjusts automatically based on total tokens staked (up to 300%).</li>
            <li><b style={{ color: '#f1f5f9' }}>10% Burn Mechanism</b> — a portion of fees is burned to reduce supply and increase token value over time.</li>
          </ul>
        </Section>

        <Section title="FBiT Token">
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-secondary)' }}>
            <li><b style={{ color: '#f1f5f9' }}>Name:</b> Future Bit Token</li>
            <li><b style={{ color: '#f1f5f9' }}>Symbol:</b> FBiT</li>
            <li><b style={{ color: '#f1f5f9' }}>Network:</b> Solana (SPL Token)</li>
            <li><b style={{ color: '#f1f5f9' }}>Solana Mint:</b> 5uJ8rkiqEs5uzERCqVw9a1eC6BkP54MZAF3D229dyoME</li>
            <li><b style={{ color: '#f1f5f9' }}>Use Case:</b> Staking, referral rewards, team target bonuses</li>
          </ul>
        </Section>

        <Section title="Our Vision">
          We believe decentralized finance should be simple, fair, and open. FutureBit is building a community-powered ecosystem where
          everyone — from first-time investors to experienced DeFi users — can earn real rewards by participating in the network.
          The 10-level referral system means that as you grow your network, you earn more — creating a sustainable, viral growth model.
        </Section>

        <Section title="Contact & Community">
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-secondary)' }}>
            <li><b style={{ color: '#f1f5f9' }}>Website:</b> <a href="https://futurebit.in" style={{ color: '#00E676' }}>futurebit.in</a></li>
            <li><b style={{ color: '#f1f5f9' }}>Twitter/X:</b> <a href="https://x.com/FutureBiT_Token" style={{ color: '#00E676' }}>@FutureBiT_Token</a></li>
            <li><b style={{ color: '#f1f5f9' }}>Telegram:</b> <a href="https://t.me/FutureBiTToken" style={{ color: '#00E676' }}>t.me/FutureBiTToken</a></li>
            <li><b style={{ color: '#f1f5f9' }}>GitHub:</b> <a href="https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet" style={{ color: '#00E676' }}>FBiT-Staking-Mainnet</a></li>
          </ul>
        </Section>

        {/* Footer links */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>Terms & Conditions</Link>
          <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>Privacy Policy</Link>
          <Link href="/app" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>Launch App</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 4, height: 22, background: '#00E676', borderRadius: 2, display: 'inline-block' }} />
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}
