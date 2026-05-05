'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getBotGuard } from '@/lib/botManagement';

interface Props {
  riskLevel: 'medium' | 'high';
  onSolved: () => void;
  onDismiss: () => void;
}

// Vibrant colours that read well on a dark background
const CELL_COLOURS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = 'grid' | 'pow' | 'done';

export default function BotChallenge({ riskLevel, onSolved, onDismiss }: Props) {
  const guard = getBotGuard();

  // For medium risk skip the grid and go straight to PoW
  const [phase, setPhase]       = useState<Phase>(riskLevel === 'medium' ? 'pow' : 'grid');
  const [numbers]               = useState<number[]>(() => shuffle([1,2,3,4,5,6,7,8,9]));
  const [colours]               = useState<string[]>(() => shuffle(CELL_COLOURS));
  const [next, setNext]         = useState(1);          // next expected number
  const [solved, setSolved]     = useState<number[]>([]); // correctly clicked
  const [shake, setShake]       = useState(false);
  const [powPct, setPowPct]     = useState(0);
  const [failed, setFailed]     = useState(false);

  // Trap scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-start PoW when entering pow phase
  const powStarted = useRef(false);
  useEffect(() => {
    if (phase !== 'pow' || powStarted.current) return;
    powStarted.current = true;

    guard.newChallenge();
    guard.solveAndVerify((pct) => setPowPct(pct))
      .then(valid => {
        if (valid) {
          setPhase('done');
          setTimeout(onSolved, 600);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }, [phase, guard, onSolved]);

  const handleCellClick = useCallback((num: number) => {
    if (num === next) {
      const newSolved = [...solved, num];
      setSolved(newSolved);
      setNext(next + 1);
      if (newSolved.length === 9) {
        setPhase('pow');
      }
    } else {
      // Wrong — shake and reset
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setSolved([]);
        setNext(1);
      }, 600);
    }
  }, [next, solved]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(9,15,31,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: '#0f1f3a' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: riskLevel === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)' }}
          >
            {riskLevel === 'high' ? '🛡️' : '🔒'}
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight">Security Verification</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {riskLevel === 'high'
                ? 'Suspicious session detected — one-time check required'
                : 'Quick browser check to protect the platform'}
            </p>
          </div>
        </div>

        {/* ── Phase: Grid ── */}
        {phase === 'grid' && (
          <>
            <p className="text-center text-sm mb-4" style={{ color: '#cbd5e1' }}>
              Click the numbers <span className="font-bold text-white">1 → 9</span> in order
            </p>

            {/* Progress bar */}
            <div className="w-full h-1 rounded-full mb-4" style={{ background: '#1e3a5f' }}>
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${(solved.length / 9) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                }}
              />
            </div>

            {/* 3×3 grid */}
            <div
              className={`grid grid-cols-3 gap-3 transition-transform ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}
              style={{
                animation: shake ? 'shake 0.5s ease' : undefined,
              }}
            >
              {numbers.map((num, i) => {
                const isSolved = solved.includes(num);
                const isNext   = num === next && !isSolved;
                return (
                  <button
                    key={num}
                    onClick={() => !isSolved && handleCellClick(num)}
                    disabled={isSolved}
                    className="relative aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 select-none"
                    style={{
                      background: isSolved
                        ? 'rgba(34,197,94,0.2)'
                        : colours[i] + '26',
                      border: isSolved
                        ? '2px solid rgba(34,197,94,0.6)'
                        : isNext
                          ? `2px solid ${colours[i]}`
                          : '2px solid transparent',
                      color: isSolved ? '#22c55e' : '#fff',
                      boxShadow: isNext ? `0 0 16px ${colours[i]}66` : 'none',
                      cursor: isSolved ? 'default' : 'pointer',
                      transform: isNext ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {isSolved ? '✓' : num}
                    {/* colour dot hint */}
                    {!isSolved && (
                      <span
                        className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ background: colours[i] }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-center text-xs mt-3" style={{ color: '#64748b' }}>
              {solved.length}/9 completed
            </p>
          </>
        )}

        {/* ── Phase: PoW ── */}
        {phase === 'pow' && !failed && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }}
            />
            <p className="text-white font-semibold">Verifying your browser…</p>
            <div className="w-full h-1.5 rounded-full" style={{ background: '#1e3a5f' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${powPct}%`,
                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                }}
              />
            </div>
            <p className="text-xs" style={{ color: '#64748b' }}>
              This takes only a moment — please stay on the page
            </p>
          </div>
        )}

        {/* ── Phase: Done ── */}
        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
            >
              ✓
            </div>
            <p className="text-white font-semibold">Verified!</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>You can now proceed with your action.</p>
          </div>
        )}

        {/* ── Failed ── */}
        {failed && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-red-400 font-semibold text-center">Verification failed</p>
            <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
              Please reload the page and try again.
            </p>
            <button
              onClick={onDismiss}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dismiss button (only visible during grid phase) */}
        {phase === 'grid' && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
            style={{ color: '#64748b' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      {/* Shake keyframes injected inline */}
      <style>{`
        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%    { transform:translateX(-8px) }
          40%    { transform:translateX(8px) }
          60%    { transform:translateX(-6px) }
          80%    { transform:translateX(6px) }
        }
      `}</style>
    </div>
  );
}
