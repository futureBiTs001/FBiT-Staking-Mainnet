import type { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import Reveal from '@/components/landing/Reveal';

export const metadata: Metadata = {
  title: 'How to Stake FBiT — Step-by-Step Guide',
  description: 'A complete, illustrated guide to staking FBiT on Solana — connecting your wallet, staking, and claiming rewards.',
};

const STEPS = [
  {
    n: 1,
    title: 'Visit the site',
    img: '/guide/01-landing.jpg',
    text: 'Go to the FBiT Staking home page. You can browse live stats, tokenomics, and security info here before connecting anything.',
  },
  {
    n: 2,
    title: 'Click "Launch App"',
    img: '/guide/02-dashboard.jpg',
    text: 'This opens the staking dashboard. You can look around — Dashboard, Swap, Stake, Referral, Calculator, History — without connecting a wallet yet.',
  },
  {
    n: 3,
    title: 'Click "Connect" and choose how to join',
    img: '/guide/03-connect-choose.jpg',
    text: 'If someone referred you, use their referral link/address (this is how the 10-level referral rewards are tracked). Already a member, or joining fresh as admin? Choose "I\'m already a member" to connect directly.',
  },
  {
    n: 4,
    title: 'Enter the referral address (if applicable)',
    img: '/guide/04-connect-referral.jpg',
    text: 'Paste the referrer\'s Solana wallet address. This only needs to be done once — it\'s saved permanently on-chain when you register.',
  },
  {
    n: 5,
    title: 'Approve the connection in your wallet',
    text: 'Your browser wallet (Phantom, Solflare, or Backpack) will pop up asking you to approve the connection. This does not move any funds — it just links your wallet to the site.',
  },
  {
    n: 6,
    title: 'Open the "Stake" tab',
    img: '/guide/05-stake-gate.jpg',
    text: 'Before connecting, this tab shows a "Connect to Stake" prompt (pictured). Once your wallet is connected, it turns into the actual staking form: an amount field, your live token balance, the current dynamic APY, and a "Stake" button.',
  },
  {
    n: 7,
    title: 'Enter an amount and confirm',
    text: 'Type how much FBiT you want to stake. The form shows the current APY and the 30-day lock period before you confirm. If it\'s your first stake, your wallet will first ask you to approve the contract to move your tokens (one-time), then to confirm the actual stake transaction.',
  },
  {
    n: 8,
    title: 'Track, claim, and compound',
    text: 'Your active stake now shows on the Dashboard and Stake tab. Rewards accrue every 6 hours — claim them to your wallet, or compound them back into your stake to grow it faster. After 30 days, you can unstake your full principal plus any unclaimed rewards.',
  },
];

export default function GuidePage() {
  return (
    <>
      <LandingHeader />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <Reveal>
          <div className="text-center mb-10">
            <h1 className="font-display font-extrabold text-3xl sm:text-5xl leading-tight mb-4">
              How to Stake <span className="gradient-text">FBiT</span>
            </h1>
            <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto">
              A step-by-step walkthrough of connecting your wallet and staking FBiT — with real
              screenshots of the actual interface.
            </p>
          </div>
        </Reveal>

        {/* Transparency callout — honest framing, no "zero risk" claims */}
        <Reveal delay={80}>
          <div className="glass-card border border-brand-500/20 mb-12">
            <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-brand-400">🔍</span> Full Transparency, Honestly Stated
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-3">
              FBiT Staking is <strong className="text-text-primary">open-source</strong> — the
              contract is publicly verifiable on Solana Explorer, and the full
              codebase is on GitHub. It's{' '}
              <strong className="text-text-primary">non-custodial</strong> (your tokens never
              leave your wallet), with{' '}
              <strong className="text-text-primary">100% of liquidity locked or burned</strong>{' '}
              and a <strong className="text-text-primary">fixed, un-mintable supply</strong>.
            </p>
            <p className="text-text-muted text-sm leading-relaxed">
              We won't tell you there's "no risk" — that wouldn't be honest for any staking
              protocol. Smart contracts can have bugs even when audited, and token prices move.
              What we can promise is that nothing here is hidden: you can verify every claim on
              this page yourself, on-chain, before you stake a single token.{' '}
              <a href="/guide#links" className="text-brand-400 hover:underline">See verification links below.</a>
            </p>
          </div>
        </Reveal>

        {/* Steps */}
        <div className="space-y-10">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={Math.min(i * 60, 300)}>
              <div className="glass-card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-400 font-display font-bold flex items-center justify-center shrink-0">
                    {step.n}
                  </span>
                  <h3 className="font-display font-semibold text-lg">{step.title}</h3>
                </div>
                {step.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full rounded-xl border border-white/10 mb-4"
                    loading="lazy"
                  />
                )}
                <p className="text-text-muted text-sm leading-relaxed">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Verification links */}
        <Reveal>
          <div id="links" className="glass-card mt-12">
            <h2 className="font-display font-semibold text-lg mb-4">Verify It Yourself</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  → Full source code on GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet/blob/main/WHITEPAPER.md" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  → Whitepaper (tokenomics, security, roadmap)
                </a>
              </li>
              <li>
                <a href="https://explorer.solana.com/address/8AYv6AAqYxHzLxARsFRsqGSbhDuEmbnsGoLExpdcP4pp" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                  → Solana staking program on Solana Explorer
                </a>
              </li>
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <div className="text-center mt-12">
            <Link href="/app" className="btn-primary text-base px-8 py-3.5 inline-block">
              Launch App →
            </Link>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FBiT logo" className="w-6 h-6 rounded-full object-cover" />
              <span className="font-display text-sm text-text-muted">FutureBit</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap justify-center">
              <Link href="/" className="hover:text-brand-400 transition-colors">Home</Link>
              <span>·</span>
              <Link href="/about" className="hover:text-brand-400 transition-colors">About</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
