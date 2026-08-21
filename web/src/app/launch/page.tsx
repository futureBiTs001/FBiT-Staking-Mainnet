import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LaunchCelebration from '@/components/launch/LaunchCelebration';

export const metadata: Metadata = {
  title: 'We\'re Live!',
  description: 'FutureBit Staking (FBiT) is now live on Solana Mainnet — stake, earn dynamic APY, and track the live price.',
  alternates: {
    canonical: '/launch/',
  },
};

export default function LaunchPage() {
  return (
    <>
      <LandingHeader />
      <LaunchCelebration />
    </>
  );
}
