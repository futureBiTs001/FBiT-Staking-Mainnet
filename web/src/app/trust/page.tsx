import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import TrustPage from '@/components/trust/TrustPage';

export const metadata: Metadata = {
  title: 'Trust & Verification',
  description: 'Verify FutureBit Staking yourself — live on-chain stats, a renounced mint authority, open-source contracts, and a tool to check any wallet\'s real staking history.',
  alternates: { canonical: '/trust/' },
};

export default function Page() {
  return (
    <div className="min-h-screen landing-page" style={{ backgroundColor: '#050505' }}>
      <LandingHeader />
      <TrustPage />
    </div>
  );
}
