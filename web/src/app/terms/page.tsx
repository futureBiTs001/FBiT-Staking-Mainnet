'use client';
import SupportChat from '@/components/ui/SupportChat';
import Link from 'next/link';

const NAV = [
  { label: 'Home',           href: '/landing' },
  { label: 'About Us',       href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms',          href: '/terms' },
  { label: 'Launch App',     href: 'https://stake.futurebit.in' },
];

export default function TermsPage() {
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
        <h1 className="font-display font-bold text-4xl md:text-5xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Terms & Conditions</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: June 28, 2026</p>

        <div className="space-y-10 text-text-secondary leading-relaxed text-sm">

          <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/20 p-5 text-accent-rose text-sm">
            <strong>⚠ Important Risk Warning:</strong> Cryptocurrency staking involves significant financial risk. The value of FBiT tokens can fluctuate dramatically. Only invest what you can afford to lose completely. This is not financial advice.
          </div>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the FutureBit Staking platform ("Platform") at stake.futurebit.in or any associated services, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">2. Platform Description</h2>
            <p>FutureBit Staking is a decentralized, non-custodial staking platform that allows users to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Stake FBiT tokens on Solana Mainnet</li>
              <li>Stake WFBIT tokens on Polygon Mainnet</li>
              <li>Earn staking rewards based on dynamic Proof-of-Stake APY</li>
              <li>Participate in a 10-level referral commission system</li>
              <li>Earn Team Target Bonuses based on network performance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">3. Eligibility</h2>
            <p>You may use the Platform only if:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>You are at least 18 years of age</li>
              <li>You are not located in a jurisdiction where cryptocurrency trading is prohibited</li>
              <li>You are not a sanctioned person or entity</li>
              <li>You have the legal right to use cryptocurrency in your jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">4. Non-Custodial Nature</h2>
            <p>The Platform is entirely non-custodial. This means:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>We never hold, control, or have access to your private keys</li>
              <li>Your tokens interact directly with smart contracts on the blockchain</li>
              <li>We cannot reverse, cancel, or modify any blockchain transactions</li>
              <li>You are solely responsible for the security of your wallet and private keys</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">5. Staking Terms</h2>
            <h3 className="text-text-primary font-semibold mb-2">5.1 Lock Period</h3>
            <p>Staked tokens are locked for a minimum of 30 days. You cannot unstake before the lock period expires without forfeiting staking rewards.</p>

            <h3 className="text-text-primary font-semibold mb-2 mt-4">5.2 APY</h3>
            <p>Annual Percentage Yield (APY) is dynamic and automatically adjusts based on total tokens staked in the pool. APY is not guaranteed and may increase or decrease. Current APY figures displayed on the Platform are estimates only.</p>

            <h3 className="text-text-primary font-semibold mb-2 mt-4">5.3 Fees</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Platform fee: 1% on all stake, unstake, claim, and compound operations</li>
              <li>Burn: 10% of every reward is permanently burned and cannot be recovered</li>
              <li>Blockchain gas fees: paid by user, subject to network conditions</li>
            </ul>

            <h3 className="text-text-primary font-semibold mb-2 mt-4">5.4 Referral System</h3>
            <p>Referral commissions are earned on-chain automatically. The referral relationship is permanent once registered and cannot be changed.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">6. Risk Disclosures</h2>
            <p>You acknowledge and accept the following risks:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-text-primary">Smart Contract Risk:</strong> Bugs or vulnerabilities in smart contracts could result in loss of funds, despite our security audits.</li>
              <li><strong className="text-text-primary">Market Risk:</strong> Token values can drop to zero. Staking rewards do not guarantee profit in fiat terms.</li>
              <li><strong className="text-text-primary">Liquidity Risk:</strong> The reward pool may become insufficient if participation significantly exceeds projections.</li>
              <li><strong className="text-text-primary">Regulatory Risk:</strong> Future regulations may impact the legality or availability of our services in your jurisdiction.</li>
              <li><strong className="text-text-primary">Network Risk:</strong> Blockchain network outages, congestion, or forks may affect your ability to stake or unstake.</li>
              <li><strong className="text-text-primary">Key Loss Risk:</strong> Loss of your private key means permanent loss of access to your staked funds.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">7. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use automated bots or scripts to manipulate the Platform</li>
              <li>Attempt to exploit smart contract vulnerabilities</li>
              <li>Use the Platform for money laundering or illegal activities</li>
              <li>Circumvent our bot detection or security systems</li>
              <li>Impersonate FutureBit team members or create fake referral schemes</li>
            </ul>
            <p className="mt-2">Violation may result in wallet blocking at the smart contract level.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">8. Disclaimer of Warranties</h2>
            <p>The Platform is provided "AS IS" without warranty of any kind. We do not warrant that:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>The Platform will be error-free or uninterrupted</li>
              <li>Any specific APY will be maintained</li>
              <li>The reward pool will be sufficient for all future claims</li>
              <li>Token prices will remain stable or increase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, FutureBit and its team shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the Platform, including loss of funds, profits, or data.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">10. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with applicable international blockchain and cryptocurrency regulations. Disputes shall be resolved through binding arbitration.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">11. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Updated terms will be posted on this page. Your continued use of the Platform after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">12. Contact</h2>
            <p>For questions about these Terms:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Telegram: <a href="https://t.me/FutureBiTToken" className="text-brand-400 hover:underline">t.me/FutureBiTToken</a></li>
              <li>Twitter/X: <a href="https://x.com/FutureBiT_Token" className="text-brand-400 hover:underline">@FutureBiT_Token</a></li>
            </ul>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-text-muted text-xs">
        <div className="flex justify-center flex-wrap gap-6 mb-3">
          {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-brand-400 transition-colors">{n.label}</a>)}
        </div>
        © 2026 FutureBit Staking. All rights reserved.
      </footer>

      <SupportChat />
    </div>
  );
}
