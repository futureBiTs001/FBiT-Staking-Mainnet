'use client';

import { useEffect } from 'react';

// ── Replace these with your real Adcash Zone IDs from adcash.com dashboard ──
const ADCASH_DISPLAY_ZONE = '0000000';    // Display Banner zone ID
const ADCASH_IPP_ZONE     = '0000000';    // In-Page Push zone ID

declare global {
  interface Window {
    aclib?: {
      runBanner: (opts: { zoneId: string }) => void;
      runInPagePush: (opts: { zoneId: string }) => void;
    };
  }
}

export default function AdcashAds() {
  useEffect(() => {
    // Load Adcash library once
    if (document.getElementById('aclib-script')) return;

    const script = document.createElement('script');
    script.id = 'aclib-script';
    script.src = 'https://cdn.adcash.com/script/aclib.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    script.onload = () => {
      if (!window.aclib) return;

      // In-Page Push — runs automatically (no visible element needed)
      window.aclib.runInPagePush({ zoneId: ADCASH_IPP_ZONE });

      // Display Banner — triggers banner in the #adcash-banner div
      window.aclib.runBanner({ zoneId: ADCASH_DISPLAY_ZONE });
    };

    document.head.appendChild(script);
  }, []);

  return (
    <>
      {/* Display Banner slot — shows at bottom of page */}
      <div
        id="adcash-banner"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          minHeight: 90,
          background: 'transparent',
          position: 'fixed',
          bottom: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      />
    </>
  );
}
