import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LaunchCelebration from '@/components/launch/LaunchCelebration';

export const metadata: Metadata = {
  title: 'We\'re Live!',
  description: 'FutureBit Staking (FBiT) is now live on Solana Mainnet — stake, earn dynamic APY, and track the live price.',
};

export default function LaunchPage() {
  return (
    <div className="min-h-screen landing-page" style={{ backgroundColor: '#050505' }}>
      <LandingHeader />
      <LaunchCelebration />
    </div>
  );
}
