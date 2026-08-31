'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@/context/WalletContext';
import { formatNumber } from '@/lib/utils';
import { checkRateLimit, sanitizeErrorMessage } from '@/lib/security';
import { getExplorerTxUrl } from '@/lib/config';
import {
  solanaLiquidityGetDepositQuote,
  solanaLiquidityDeposit,
  getAllowedLockTypes,
  MIN_DEPOSIT_SOL,
  type LiquidityDepositQuote,
  type LockType,
} from '@/lib/contracts/liquidity';

const SLIPPAGE_OPTIONS = [50, 100, 300]; // bps: 0.5% / 1% / 3%
const QUOTE_DEBOUNCE_MS = 500;
const HIGH_IMPACT_PCT = 3;

// Deposit-size tiers — mirrors DEPOSIT_TIERS in liquidity.ts. Shown as a reference
// table so the lock duration for any amount is clear before the user commits.
const TIER_TABLE = [
  { range: '1 – 10 SOL',    months: 12 },
  { range: '10 – 50 SOL',   months: 24 },
  { range: '50 – 100 SOL',  months: 36 },
  { range: '100 – 250 SOL', months: 48 },
  { range: '250 – 500 SOL', months: 60 },
  { range: '500+ SOL',      months: 72 },
];

const LOCK_OPTION_COPY: Record<LockType, { label: string; desc: string }> = {
  '12m':      { label: '12-Month Lock', desc: 'Principal unlocks automatically after 12 months' },
  '24m':      { label: '24-Month Lock', desc: 'Principal unlocks automatically after 24 months' },
  '36m':      { label: '36-Month Lock', desc: 'Principal unlocks automatically after 36 months' },
  '48m':      { label: '48-Month Lock', desc: 'Principal unlocks automatically after 48 months' },
  '60m':      { label: '60-Month Lock', desc: 'Principal unlocks automatically after 60 months' },
  '72m':      { label: '72-Month Lock', desc: 'Principal unlocks automatically after 72 months' },
  permanent:  { label: 'Permanent Lock', desc: 'Principal can never be withdrawn — irreversible' },
};

interface Props {
  onDeposited: () => void;
}

export default function DepositPanel({ onDeposited }: Props) {
  const { solanaAddress } = useWallet();
  const [amount, setAmount] = useState('');
  const [lockType, setLockType] = useState<LockType>('12m');
  const [slippageBps, setSlippageBps] = useState(SLIPPAGE_OPTIONS[1]);
  const [quote, setQuote] = useState<LiquidityDepositQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0 = idle, 1 = swapping, 2 = creating position
  const [permanentConfirmText, setPermanentConfirmText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n < MIN_DEPOSIT_SOL) {
      setQuote(null);
      setQuoteError(n > 0 && n < MIN_DEPOSIT_SOL ? `Minimum deposit is ${MIN_DEPOSIT_SOL} SOL.` : null);
      return;
    }
    setQuoting(true);
    setQuoteError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = await solanaLiquidityGetDepositQuote(n, slippageBps);
        setQuote(q);
      } catch (e) {
        setQuote(null);
        setQuoteError(sanitizeErrorMessage(e));
      } finally {
        setQuoting(false);
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [amount, slippageBps]);

  const amountNum = Number(amount) || 0;
  const allowedLockTypes = getAllowedLockTypes(amountNum);

  // If the entered amount crosses a tier boundary, swap the selected lock type
  // to whichever option is actually valid for the new tier instead of leaving
  // an invalid choice selected.
  useEffect(() => {
    if (!allowedLockTypes.includes(lockType)) {
      setLockType(allowedLockTypes[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedLockTypes.join(',')]);

  const handleDeposit = async () => {
    if (!solanaAddress) { toast.error('Connect your wallet first.'); return; }
    if (!quote) return;
    if (lockType === 'permanent' && permanentConfirmText.trim().toUpperCase() !== 'PERMANENT') {
      toast.error('Type PERMANENT to confirm an irreversible lock.');
      return;
    }
    if (!checkRateLimit(`liquidity-deposit-${solanaAddress}`)) {
      toast.error('Too many attempts — please wait a moment.');
      return;
    }
    setDepositing(true);
    setStep(1);
    try {
      const n = Number(amount);
      const result = await solanaLiquidityDeposit(n, lockType, slippageBps);
      setStep(2);
      toast.success(
        (t) => (
          <span>
            Liquidity deposited and locked!{' '}
            <a href={getExplorerTxUrl('solana', result.positionTxHash)} target="_blank" rel="noopener noreferrer" className="underline">
              View transaction
            </a>
          </span>
        ),
        { duration: 8000 },
      );
      setAmount('');
      setQuote(null);
      setPermanentConfirmText('');
      onDeposited();
    } catch (e) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setDepositing(false);
      setStep(0);
    }
  };

  const fbitOut = quote ? Number(quote.estFbitOutLamports) / 1e9 : 0;
  const solKept = quote ? Number(quote.solKeptLamports.toString()) / 1e9 : 0;
  const highImpact = quote && quote.priceImpactPct > HIGH_IMPACT_PCT;

  return (
    <div className="glass-card p-5 sm:p-6">
      <h3 className="font-display font-semibold text-lg mb-1">Provide Liquidity</h3>
      <p className="text-text-muted text-xs mb-5">
        Deposit only SOL — half is swapped to FBiT automatically, both are added as locked liquidity to the FBiT/SOL pool.
      </p>

      <label className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-1.5 block">
        Amount (SOL)
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={MIN_DEPOSIT_SOL}
        step="0.1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Minimum ${MIN_DEPOSIT_SOL} SOL`}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono mb-1 focus:outline-none focus:border-brand-500/50"
      />
      {quoteError && <p className="text-accent-rose text-xs mb-3">{quoteError}</p>}

      <div className="flex items-center gap-2 mb-4 mt-3">
        <span className="text-text-muted text-[11px] font-display uppercase tracking-wider mr-1">Slippage</span>
        {SLIPPAGE_OPTIONS.map((bps) => (
          <button
            key={bps}
            onClick={() => setSlippageBps(bps)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              slippageBps === bps ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {(bps / 100).toFixed(1)}%
          </button>
        ))}
      </div>

      {quote && (
        <div className="bg-white/5 rounded-xl p-4 mb-4 text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-text-muted">Platform fee</span><span className="font-mono">0.2 SOL</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Stays as SOL</span><span className="font-mono">{formatNumber(solKept)} SOL</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Swapped to FBiT</span><span className="font-mono">≈ {formatNumber(fbitOut)} FBiT</span></div>
          <div className="flex justify-between">
            <span className="text-text-muted">Price impact</span>
            <span className={`font-mono ${highImpact ? 'text-accent-rose' : ''}`}>{quote.priceImpactPct.toFixed(2)}%</span>
          </div>
          {highImpact && (
            <p className="text-accent-rose text-xs pt-1">
              High price impact — FBiT liquidity is currently thin. Consider a smaller amount.
            </p>
          )}
        </div>
      )}

      <label className="text-text-muted text-[11px] font-display uppercase tracking-wider mb-1.5 block">
        Lock Type
      </label>
      <p className="text-text-muted text-[11px] mb-2">
        The timed-lock duration is set by deposit size (Permanent is always available too):
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-3 text-[11px] font-mono">
        {TIER_TABLE.map((t) => (
          <div key={t.range} className="flex justify-between text-text-muted">
            <span>{t.range}</span>
            <span className="text-text-primary">{t.months}mo</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {allowedLockTypes.map((lt) => (
          <button
            key={lt}
            onClick={() => setLockType(lt)}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              lockType === lt
                ? (lt === 'permanent' ? 'border-accent-rose/50 bg-accent-rose/10' : 'border-brand-500/50 bg-brand-500/10')
                : 'border-white/10 bg-white/5'
            }`}
          >
            <p className="font-display font-semibold text-sm">{LOCK_OPTION_COPY[lt].label}</p>
            <p className="text-text-muted text-[11px] mt-0.5">{LOCK_OPTION_COPY[lt].desc}</p>
          </button>
        ))}
      </div>

      {lockType === 'permanent' && (
        <div className="mb-4">
          <p className="text-accent-rose text-xs mb-2">
            Permanent lock is irreversible. You will never be able to withdraw this principal. Type PERMANENT to confirm.
          </p>
          <input
            type="text"
            value={permanentConfirmText}
            onChange={(e) => setPermanentConfirmText(e.target.value)}
            placeholder="Type PERMANENT"
            className="w-full bg-white/5 border border-accent-rose/40 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
          />
        </div>
      )}

      <button
        onClick={handleDeposit}
        disabled={!quote || quoting || depositing}
        className="btn-primary w-full text-sm py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {depositing
          ? (step === 1 ? 'Step 1/2: Swapping to FBiT…' : 'Step 2/2: Creating & locking position…')
          : quoting ? 'Fetching quote…'
          : 'Deposit & Lock Liquidity'}
      </button>
    </div>
  );
}
