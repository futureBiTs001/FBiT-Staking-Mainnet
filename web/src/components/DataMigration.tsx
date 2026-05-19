'use client';

import { useEffect, useRef, useState } from 'react';

const OLD_ORIGIN = 'https://stake-futurebit.vercel.app';
const STORAGE_KEY = 'fbit-staking-v6';

export default function DataMigration() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'done' | 'empty'>('idle');
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only on new domain, only when localStorage is empty
    const isNewDomain = window.location.hostname === 'stake.futurebit.in';
    const hasData = !!localStorage.getItem(STORAGE_KEY);
    const alreadyDone = !!sessionStorage.getItem('fbit-migrated');

    if (!isNewDomain || hasData || alreadyDone) return;

    // Show the restore banner after a short delay
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleRestore = () => {
    if (status === 'waiting') return;
    setStatus('waiting');

    // Open popup — works because triggered by user click (won't be blocked)
    const popup = window.open(
      `${OLD_ORIGIN}/export-data`,
      'fbit-migrate',
      'width=300,height=200,left=200,top=200'
    );
    popupRef.current = popup;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== OLD_ORIGIN) return;
      if (event.data?.type !== 'fbit-migrate') return;

      window.removeEventListener('message', handleMessage);
      listenerRef.current = null;

      const { data } = event.data;
      if (data) {
        localStorage.setItem(STORAGE_KEY, data);
        sessionStorage.setItem('fbit-migrated', '1');
        setStatus('done');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        sessionStorage.setItem('fbit-migrated', '1');
        setStatus('empty');
        setTimeout(() => setShow(false), 3000);
      }

      popupRef.current?.close();
    };

    listenerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    // Timeout: if popup doesn't respond in 8s give up
    setTimeout(() => {
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
        listenerRef.current = null;
        sessionStorage.setItem('fbit-migrated', '1');
        setStatus('empty');
        popupRef.current?.close();
        setTimeout(() => setShow(false), 3000);
      }
    }, 8000);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#0f172a', border: '1px solid #334155',
      borderRadius: 12, padding: '14px 20px', zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'sans-serif', fontSize: 14, color: '#e2e8f0',
      minWidth: 320, maxWidth: 420,
    }}>
      <span style={{ fontSize: 20 }}>
        {status === 'done' ? '✅' : status === 'empty' ? '⚠️' : status === 'waiting' ? '⏳' : '📦'}
      </span>
      <div style={{ flex: 1 }}>
        {status === 'idle' && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Purane site ke stakes restore karo</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>stake-futurebit.vercel.app ka data yahan lao</div>
          </>
        )}
        {status === 'waiting' && <div>Data fetch ho raha hai… popup band mat karo</div>}
        {status === 'done' && <div style={{ color: '#4ade80', fontWeight: 600 }}>Stakes restore ho gaye! Page reload ho raha hai…</div>}
        {status === 'empty' && <div style={{ color: '#fbbf24' }}>Purane site pe koi data nahi mila.</div>}
      </div>

      {status === 'idle' && (
        <button
          type="button"
          onClick={handleRestore}
          style={{
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
          }}
        >
          Restore Karo
        </button>
      )}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => { sessionStorage.setItem('fbit-migrated', '1'); setShow(false); }}
          style={{
            background: 'transparent', color: '#64748b', border: 'none',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
