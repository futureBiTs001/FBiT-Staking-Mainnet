import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for FBiT Staking platform. Learn how we handle data on our non-custodial DeFi staking platform.',
};

const EFFECTIVE_DATE = 'June 29, 2026';
const CONTACT_EMAIL = 'parthkurrey740@gmail.com';

export default function PrivacyPage() {
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
          <Link href="/" style={{
            padding: '8px 20px', borderRadius: 8,
            background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)',
            color: '#00E676', textDecoration: 'none', fontSize: 14, fontWeight: 500,
          }}>
            Launch App
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg,#fff,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 48 }}>
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Introduction">
          FutureBit (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the FBiT Staking platform at futurebit.in and stake.futurebit.in.
          This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
          By using our platform, you agree to the practices described in this policy.
        </Section>

        <Section title="2. Information We Collect">
          <b style={{ color: '#f1f5f9' }}>a) Blockchain Data (Public)</b>
          <p style={{ marginTop: 8, marginBottom: 16 }}>
            All staking transactions occur on public blockchains (Solana and Polygon). Your wallet address, transaction amounts,
            and staking history are publicly visible on-chain. We do not collect or store this data separately — it is inherently public.
          </p>
          <b style={{ color: '#f1f5f9' }}>b) Usage Data (Analytics)</b>
          <p style={{ marginTop: 8, marginBottom: 16 }}>
            We use Google Analytics 4 to collect anonymized usage data including: pages visited, time spent, device type,
            browser, approximate location (country/city level), and referral source. IP addresses are anonymized.
          </p>
          <b style={{ color: '#f1f5f9' }}>c) Advertising Data</b>
          <p style={{ marginTop: 8 }}>
            We display advertisements via Google AdSense. Google may use cookies to show personalized ads based on your browsing history.
            You can opt out at <a href="https://adssettings.google.com" style={{ color: '#00E676' }}>adssettings.google.com</a>.
          </p>
        </Section>

        <Section title="3. What We Do NOT Collect">
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>We do <b style={{ color: '#f1f5f9' }}>not</b> collect your name, email, phone number, or any personal identity information.</li>
            <li>We do <b style={{ color: '#f1f5f9' }}>not</b> require KYC (Know Your Customer) verification.</li>
            <li>We do <b style={{ color: '#f1f5f9' }}>not</b> store your private keys or seed phrases — ever.</li>
            <li>We do <b style={{ color: '#f1f5f9' }}>not</b> have access to your wallet funds.</li>
          </ul>
        </Section>

        <Section title="4. Cookies">
          We use the following types of cookies:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li><b style={{ color: '#f1f5f9' }}>Essential:</b> Required for the app to function (wallet connection state, chain selection).</li>
            <li><b style={{ color: '#f1f5f9' }}>Analytics:</b> Google Analytics 4 cookies (_ga, _gid) — help us understand how users interact with the platform.</li>
            <li><b style={{ color: '#f1f5f9' }}>Advertising:</b> Google AdSense cookies — used to display relevant ads.</li>
          </ul>
          You can disable cookies in your browser settings at any time.
        </Section>

        <Section title="5. Third-Party Services">
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li><b style={{ color: '#f1f5f9' }}>Google Analytics 4</b> — website analytics. <a href="https://policies.google.com/privacy" style={{ color: '#00E676' }}>Google Privacy Policy</a></li>
            <li><b style={{ color: '#f1f5f9' }}>Google AdSense</b> — advertising. <a href="https://policies.google.com/technologies/ads" style={{ color: '#00E676' }}>AdSense Policy</a></li>
            <li><b style={{ color: '#f1f5f9' }}>Vercel</b> — hosting provider. May log server-side request metadata.</li>
            <li><b style={{ color: '#f1f5f9' }}>Helius RPC / Alchemy</b> — blockchain node providers used to read on-chain data.</li>
            <li><b style={{ color: '#f1f5f9' }}>Phantom / MetaMask / WalletConnect</b> — third-party wallet providers with their own privacy policies.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          We do not store personal data on our servers. Analytics data is retained by Google Analytics for 14 months (default).
          Blockchain transaction data is permanent and public by the nature of the blockchain.
        </Section>

        <Section title="7. Children's Privacy">
          Our platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.
          Cryptocurrency investments carry risk; users must be of legal age in their jurisdiction to use this platform.
        </Section>

        <Section title="8. Your Rights">
          Since we do not collect personal data, there is no personal profile to delete. For analytics data managed by Google,
          you can exercise your rights via <a href="https://myaccount.google.com" style={{ color: '#00E676' }}>myaccount.google.com</a>.
          For any questions or concerns, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00E676' }}>{CONTACT_EMAIL}</a>.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. Changes will be reflected by updating the Effective Date above.
          Continued use of the platform after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="10. Contact">
          For privacy-related questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00E676' }}>{CONTACT_EMAIL}</a>
        </Section>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>About Us</Link>
          <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>Terms & Conditions</Link>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>Launch App</Link>
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
