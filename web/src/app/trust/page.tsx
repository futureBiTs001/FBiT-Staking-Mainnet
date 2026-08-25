import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import TrustPage from '@/components/trust/TrustPage';

export const metadata: Metadata = {
  title: 'Trust & Verification',
  description: 'Verify FutureBit Staking yourself — live on-chain stats, a renounced mint authority, open-source contracts, and a tool to check any wallet\'s real staking history.',
};

export default function Page() {
  return (
    <>
      <LandingHeader />
      <TrustPage />
    </>
  );
}
