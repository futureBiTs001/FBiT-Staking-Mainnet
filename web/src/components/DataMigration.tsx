'use client';

import { useEffect, useRef, useState } from 'react';

const OLD_DOMAIN = 'https://stake-futurebit.vercel.app';
const STORAGE_KEY = 'fbit-staking-v6';

export default function DataMigration() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'empty'>('idle');

  useEffect(() => {
    // Only run on the new domain and only when local data is empty
    if (typeof window === 'undefined') return;
    const isNewDomain = window.location.hostname === 'stake.futurebit.in';
    const hasData = !!localStorage.getItem(STORAGE_KEY);
    const alreadyMigrated = !!sessionStorage.getItem('fbit-migrated');

    if (!isNewDomain || hasData || alreadyMigrated) return;

    setStatus('loading');

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== OLD_DOMAIN) return;
      if (event.data?.type !== 'fbit-migrate') return;

      const { data } = event.data;
      if (data) {
        localStorage.setItem(STORAGE_KEY, data);
        sessionStorage.setItem('fbit-migrated', '1');
        setStatus('done');
        // Reload after short delay so store picks up the data
        setTimeout(() => window.location.reload(), 1200);
      } else {
        sessionStorage.setItem('fbit-migrated', '1');
        setStatus('empty');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    window.addEventListener('message', handleMessage);
    // Timeout: if iframe doesn't respond in 6s, give up
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      sessionStorage.setItem('fbit-migrated', '1');
      setStatus('idle');
    }, 6000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <>
      {/* Hidden iframe loads old domain export page */}
      {status === 'loading' && (
        <iframe
          ref={iframeRef}
          src={`${OLD_DOMAIN}/export-data`}
          style={{ display: 'none' }}
          title="data-migration"
          sandbox="allow-scripts allow-same-origin"
        />
      )}

      {/* Status toast */}
      {(status === 'loading' || status === 'done' || status === 'empty') && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: status === 'done' ? '#16a34a' : status === 'empty' ? '#6b7280' : '#1d4ed8',
          color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 9999,
          fontSize: 14, fontFamily: 'sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {status === 'loading' && '⏳ Migrating your stake data…'}
          {status === 'done' && '✓ Stake data restored! Refreshing…'}
          {status === 'empty' && 'No previous stake data found on old site.'}
        </div>
      )}
    </>
  );
}
