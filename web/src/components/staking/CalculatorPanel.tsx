'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useContract } from '@/hooks/useContract';
import StakingCalculator from '@/components/staking/StakingCalculator';

export default function CalculatorPanel() {
  const { selectedNetwork, platformStats } = useAppStore();
  const contract = useContract();

  // platformStats (live emission/APY figures the projections below are based on)
  // is no longer persisted across reloads and this panel never fetched it itself —
  // same missing-sync bug already found and fixed in AdminPanel/ReferralPanel.
  // syncPlatformStats() is a read-only on-chain fetch, so it works with no wallet
  // connected too, matching this panel's "no wallet required" design.
  useEffect(() => {
    if (!contract.isLive) return;
    contract.syncPlatformStats().catch(() => {});
    const id = setInterval(() => { contract.syncPlatformStats().catch(() => {}); }, 60_000);
    return () => clearInterval(id);
  }, [contract.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold">Staking Calculator</h2>
        <p className="text-text-secondary text-sm mt-1">
          Project your FBiT staking rewards before you commit — no wallet connection required.
        </p>
      </div>
      <StakingCalculator network={selectedNetwork} stats={platformStats} />
    </div>
  );
}
