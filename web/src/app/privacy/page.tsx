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

export default function PrivacyPage() {
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
        <h1 className="font-display font-bold text-4xl md:text-5xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Privacy Policy</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: June 28, 2026</p>

        <div className="space-y-10 text-text-secondary leading-relaxed text-sm">

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">1. Introduction</h2>
            <p>FutureBit Staking ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect information when you use our decentralized staking platform at <strong className="text-text-primary">stake.futurebit.in</strong> and related services.</p>
            <p className="mt-2">As a decentralized platform, we collect minimal user data. Your crypto assets remain in your own wallet at all times — we never have custody of your funds.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">2. Information We Collect</h2>
            <h3 className="text-text-primary font-semibold mb-2">2.1 Blockchain Data (Public)</h3>
            <p>All staking transactions, wallet addresses, and on-chain activity are publicly visible on Solana and Polygon blockchains. This data is inherently public and not controlled by us.</p>

            <h3 className="text-text-primary font-semibold mb-2 mt-4">2.2 Automatically Collected Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Browser type and version</li>
              <li>IP address (used only for rate limiting and bot detection)</li>
              <li>Pages visited and time spent on our platform</li>
              <li>Referral codes used (stored only on blockchain)</li>
            </ul>

            <h3 className="text-text-primary font-semibold mb-2 mt-4">2.3 Data We Do NOT Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email, or personal identification</li>
              <li>Private keys or seed phrases (never share these with anyone)</li>
              <li>KYC documents</li>
              <li>Payment card information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">3. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Security:</strong> IP addresses are used temporarily for bot detection and rate limiting to protect platform integrity.</li>
              <li><strong className="text-text-primary">Analytics:</strong> Anonymous usage data helps us improve platform performance and user experience.</li>
              <li><strong className="text-text-primary">AI Support:</strong> Messages sent to our AI chat support are processed by Anthropic's Claude API. Conversations are not permanently stored by us.</li>
              <li><strong className="text-text-primary">Advertising:</strong> We use Google AdSense which may use cookies to show relevant ads. See Google's Privacy Policy for details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">4. Cookies</h2>
            <p>We use minimal cookies for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Session management and security</li>
              <li>Google AdSense advertising (third-party cookies)</li>
              <li>Analytics and performance monitoring</li>
            </ul>
            <p className="mt-3">You can disable cookies in your browser settings, though this may affect some platform features.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">5. Third-Party Services</h2>
            <p>Our platform integrates with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-text-primary">Solana / Polygon RPC nodes:</strong> For blockchain interactions. Your wallet address is transmitted to complete transactions.</li>
              <li><strong className="text-text-primary">GeckoTerminal:</strong> For real-time token price data. No personal data is shared.</li>
              <li><strong className="text-text-primary">Helius (Solana RPC):</strong> For fast, reliable Solana blockchain reads.</li>
              <li><strong className="text-text-primary">Anthropic Claude AI:</strong> For AI support chat. Messages are processed per Anthropic's privacy policy.</li>
              <li><strong className="text-text-primary">Google AdSense:</strong> For advertising. Subject to Google's privacy policies.</li>
              <li><strong className="text-text-primary">WalletConnect / Reown:</strong> For wallet connections. Subject to their privacy policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures including HTTPS encryption, rate limiting, and bot detection systems. However, no internet transmission is 100% secure. Use our platform at your own risk.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">7. Your Rights</h2>
            <p>Since we collect minimal personal data, there is little to delete or modify. For any privacy concerns:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Contact us via our Telegram community</li>
              <li>You may request any data we hold related to your IP address</li>
              <li>On-chain data is permanent and cannot be deleted (blockchain is immutable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">8. Children's Privacy</h2>
            <p>Our platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the platform constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-white font-display font-bold text-xl mb-3">10. Contact</h2>
            <p>For privacy-related questions, contact us through:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Telegram: <a href="https://t.me/FutureBiTToken" className="text-brand-400 hover:underline">t.me/FutureBiTToken</a></li>
              <li>Twitter/X: <a href="https://x.com/FutureBiT_Token" className="text-brand-400 hover:underline">@FutureBiT_Token</a></li>
              <li>GitHub: <a href="https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet" className="text-brand-400 hover:underline">futurebitsmaxx/FBiT-Staking-Mainnet</a></li>
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
