'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import StakingCalculator from '@/components/staking/StakingCalculator';

export default function CalculatorPanel() {
  const { selectedNetwork, platformStats } = useAppStore();

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
