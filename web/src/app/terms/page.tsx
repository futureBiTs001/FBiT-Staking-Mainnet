import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and Conditions for using the FutureBit Staking platform. Read before using our DeFi staking services.',
};

const EFFECTIVE_DATE = 'June 29, 2026';
const CONTACT_EMAIL = 'contact@futurebit.in';

export default function TermsPage() {
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

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg,#fff,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Terms & Conditions
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 48 }}>
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Acceptance of Terms">
          By accessing or using the FBiT Staking platform at futurebit.in or stake.futurebit.in (the &quot;Platform&quot;),
          you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.
          We reserve the right to update these terms at any time; continued use constitutes acceptance.
        </Section>

        <Section title="2. Nature of the Platform">
          FBiT Staking is a <b style={{ color: '#f1f5f9' }}>non-custodial, decentralized</b> staking platform. This means:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li>Your tokens are locked in on-chain smart contracts, not held by us.</li>
            <li>We have no ability to freeze, recover, or move your tokens.</li>
            <li>All transactions are irreversible once confirmed on the blockchain.</li>
            <li>You interact directly with blockchain smart contracts through your own wallet.</li>
          </ul>
        </Section>

        <Section title="3. Eligibility">
          You must:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li>Be at least 18 years old (or the age of legal majority in your jurisdiction).</li>
            <li>Not be a resident of any country where DeFi/crypto activities are prohibited.</li>
            <li>Have the legal right to own and transfer cryptocurrency in your jurisdiction.</li>
            <li>Not be acting on behalf of a sanctioned entity or person.</li>
          </ul>
        </Section>

        <Section title="4. Financial Risk Disclosure">
          <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <b style={{ color: '#fb7185' }}>WARNING:</b> Cryptocurrency staking involves significant financial risk. You may lose some or all of your staked tokens.
          </div>
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>APY rates are dynamic and are not guaranteed to remain at any specific level.</li>
            <li>Token values can decrease significantly or go to zero.</li>
            <li>Smart contracts may contain undiscovered bugs despite best efforts.</li>
            <li>Blockchain network congestion or failures may affect your ability to unstake.</li>
            <li>Only stake what you can afford to lose entirely.</li>
          </ul>
        </Section>

        <Section title="5. No Financial Advice">
          Nothing on this Platform constitutes financial, investment, legal, or tax advice. FutureBit is not a registered
          financial advisor, broker, or investment firm. You should consult a qualified financial advisor before making
          any investment decision.
        </Section>

        <Section title="6. Platform Fees">
          The Platform charges the following fees:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li><b style={{ color: '#f1f5f9' }}>Staking Fee:</b> 1% of staked amount at time of staking.</li>
            <li><b style={{ color: '#f1f5f9' }}>Burn:</b> 10% of collected fees are burned (permanently destroyed).</li>
            <li><b style={{ color: '#f1f5f9' }}>Referral Commissions:</b> Up to 17.75% of rewards distributed to referrers (10 levels).</li>
            <li><b style={{ color: '#f1f5f9' }}>Blockchain Gas Fees:</b> You are responsible for all network transaction fees (SOL).</li>
          </ul>
        </Section>

        <Section title="7. Prohibited Activities">
          You agree not to:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li>Use bots, scripts, or automated systems to manipulate the platform.</li>
            <li>Attempt to exploit, hack, or attack the smart contracts or website.</li>
            <li>Use the platform for money laundering, fraud, or any illegal activity.</li>
            <li>Create fake referral networks using self-referrals through multiple wallets.</li>
            <li>Misrepresent the platform&apos;s returns or features when recruiting referrals.</li>
          </ul>
        </Section>

        <Section title="8. Intellectual Property">
          All content on this website — including the interface, design, text, graphics, and code — is the property of FutureBit
          and protected by applicable intellectual property laws. The underlying smart contracts are open-source (MIT licensed)
          and available on GitHub.
        </Section>

        <Section title="9. Disclaimer of Warranties">
          The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied.
          We do not warrant that the Platform will be error-free, uninterrupted, or that smart contracts are free from bugs.
          Use of the Platform is entirely at your own risk.
        </Section>

        <Section title="10. Limitation of Liability">
          To the maximum extent permitted by law, FutureBit and its team members shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the Platform, including but not limited to
          loss of tokens, loss of profits, or loss of data — even if advised of the possibility of such damages.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved
          through good-faith negotiation. By using the Platform, you waive any right to a jury trial or class-action lawsuit.
        </Section>

        <Section title="12. Contact">
          For any questions regarding these Terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00E676' }}>{CONTACT_EMAIL}</a>
        </Section>

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>About Us</Link>
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
