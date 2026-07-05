'use client';

import { useEffect } from 'react';
import { getAdConfig, type AdConfig } from '@/lib/adConfig';

declare global {
  interface Window {
    aclib?: {
      runBanner:     (opts: { zoneId: string }) => void;
      runInPagePush: (opts: { zoneId: string }) => void;
    };
  }
}

function removeScript(id: string) {
  document.getElementById(id)?.remove();
}

// ── Coinzilla ─────────────────────────────────────────────────────────────────
function loadCoinzilla(cfg: AdConfig['coinzilla']) {
  removeScript('czilla-banner-script');
  removeScript('czilla-sticky-script');
  removeScript('czilla-native-script');
  document.getElementById('czilla-banner-slot')?.remove();
  document.getElementById('czilla-sticky-slot')?.remove();
  document.getElementById('czilla-native-slot')?.remove();

  if (cfg.banner.enabled && cfg.banner.zoneId) {
    const slot = document.createElement('div');
    slot.id = 'czilla-banner-slot';
    slot.setAttribute('data-zone', cfg.banner.zoneId);
    document.body.appendChild(slot);

    const s = document.createElement('script');
    s.id  = 'czilla-banner-script';
    s.src = `https://coinzilla.io/coinzilla.js`;
    s.async = true;
    s.setAttribute('data-zone', cfg.banner.zoneId);
    document.head.appendChild(s);
  }

  if (cfg.sticky.enabled && cfg.sticky.zoneId) {
    // Sticky bottom bar
    const slot = document.createElement('div');
    slot.id = 'czilla-sticky-slot';
    Object.assign(slot.style, {
      position: 'fixed', bottom: '0', left: '0', width: '100%',
      display: 'flex', justifyContent: 'center', zIndex: '9999',
      background: 'transparent', pointerEvents: 'auto',
    });
    document.body.appendChild(slot);

    const s = document.createElement('script');
    s.id  = 'czilla-sticky-script';
    s.src = `https://coinzilla.io/coinzilla.js`;
    s.async = true;
    s.setAttribute('data-zone', cfg.sticky.zoneId);
    slot.appendChild(s);
  }

  if (cfg.native.enabled && cfg.native.zoneId) {
    const s = document.createElement('script');
    s.id  = 'czilla-native-script';
    s.src = `https://cdn.czilladx.com/serve/native.php?z=${cfg.native.zoneId}`;
    s.async = true;
    document.head.appendChild(s);
  }
}

// ── Adcash ────────────────────────────────────────────────────────────────────
function loadAdcash(cfg: AdConfig['adcash']) {
  document.getElementById('adcash-banner')?.remove();

  const needsLib = cfg.displayBanner.enabled || cfg.inPagePush.enabled;
  if (!needsLib) {
    removeScript('aclib-script');
    return;
  }

  const inject = () => {
    if (!window.aclib) return;
    if (cfg.inPagePush.enabled && cfg.inPagePush.zoneId) {
      window.aclib.runInPagePush({ zoneId: cfg.inPagePush.zoneId });
    }
    if (cfg.displayBanner.enabled && cfg.displayBanner.zoneId) {
      let banner = document.getElementById('adcash-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'adcash-banner';
        Object.assign(banner.style, {
          position: 'fixed', bottom: '0', left: '0',
          width: '100%', display: 'flex', justifyContent: 'center',
          minHeight: '90px', zIndex: '9998', background: 'transparent',
        });
        document.body.appendChild(banner);
      }
      window.aclib.runBanner({ zoneId: cfg.displayBanner.zoneId });
    }
  };

  if (document.getElementById('aclib-script')) { inject(); return; }

  const s = document.createElement('script');
  s.id  = 'aclib-script';
  s.src = 'https://cdn.adcash.com/script/aclib.js';
  s.async = true;
  s.setAttribute('data-cfasync', 'false');
  s.onload = inject;
  document.head.appendChild(s);
}

// ── Main component ────────────────────────────────────────────────────────────
// Ad config is static per deploy (env vars, not runtime-editable) so this only
// ever needs to apply once on mount.
export default function AdsManager() {
  useEffect(() => {
    const cfg = getAdConfig();
    loadCoinzilla(cfg.coinzilla);
    loadAdcash(cfg.adcash);
  }, []);

  return null;
}
