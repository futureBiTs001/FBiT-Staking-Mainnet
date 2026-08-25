'use client';

import React, { useEffect, useState } from 'react';
import DepositPanel from './DepositPanel';
import MyPositions from './MyPositions';
import LiquidityRiskNotice from './LiquidityRiskNotice';
import { POOL_ACTIVATION_TIMESTAMP_MS } from '@/lib/contracts/liquidity';

function usePoolActive() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => setIsActive(Date.now() >= POOL_ACTIVATION_TIMESTAMP_MS);
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
  return isActive;
}

export default function LiquidityPanel() {
  const isActive = usePoolActive();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0">
      <div className="text-center mb-2">
        <h2 className="font-display font-bold text-xl sm:text-2xl mb-1.5">Provide Liquidity</h2>
        <p className="text-text-muted text-sm">
          Deposit SOL only — we handle the swap, the split, and the lock. Earn trading fees the whole time.
        </p>
      </div>

      {isActive === false && (
        <div className="glass-card p-4 text-center border border-amber-500/30">
          <p className="text-sm">
            <span className="text-amber-400 font-display font-semibold">Trading on this pool hasn&apos;t started yet</span>
            {' '}— deposits made now will queue as locked liquidity, but the swap leg won&apos;t execute until the pool activates. See the{' '}
            <a href="/launch" className="underline">launch countdown</a>.
          </p>
        </div>
      )}

      <DepositPanel onDeposited={() => setRefreshKey((k) => k + 1)} />

      <div>
        <p className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-3">My Positions</p>
        <MyPositions refreshKey={refreshKey} />
      </div>

      <LiquidityRiskNotice />
    </div>
  );
}
