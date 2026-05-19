'use client';

import { useEffect } from 'react';

const NEW_DOMAIN = 'https://stake.futurebit.in';
const STORAGE_KEY = 'fbit-staking-v6';

export default function ExportDataPage() {
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (window.opener) {
      // Opened via window.open — send data back to opener
      window.opener.postMessage({ type: 'fbit-migrate', data }, NEW_DOMAIN);
      window.close();
    } else if (window.parent !== window) {
      // Inside iframe — send data to parent
      window.parent.postMessage({ type: 'fbit-migrate', data }, NEW_DOMAIN);
    }
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 32, textAlign: 'center' }}>
      <p>Migrating data… please wait.</p>
    </div>
  );
}
