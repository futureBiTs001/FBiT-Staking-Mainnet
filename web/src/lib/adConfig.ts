export interface AdConfig {
  coinzilla: {
    banner: {
      enabled: boolean;
      zoneId: string;
    };
    sticky: {
      enabled: boolean;
      zoneId: string;
    };
    native: {
      enabled: boolean;
      zoneId: string;
    };
  };
  adcash: {
    displayBanner: {
      enabled: boolean;
      zoneId: string;
    };
    inPagePush: {
      enabled: boolean;
      zoneId: string;
    };
  };
}

const STORAGE_KEY = 'fbit-ad-config';

export const DEFAULT_AD_CONFIG: AdConfig = {
  coinzilla: {
    banner: { enabled: false, zoneId: '' },
    sticky: { enabled: false, zoneId: '' },
    native: { enabled: false, zoneId: '' },
  },
  adcash: {
    displayBanner: { enabled: false, zoneId: '' },
    inPagePush:    { enabled: false, zoneId: '' },
  },
};

export function getAdConfig(): AdConfig {
  if (typeof window === 'undefined') return DEFAULT_AD_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AD_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      coinzilla: {
        banner: { ...DEFAULT_AD_CONFIG.coinzilla.banner, ...parsed.coinzilla?.banner },
        sticky: { ...DEFAULT_AD_CONFIG.coinzilla.sticky, ...parsed.coinzilla?.sticky },
        native: { ...DEFAULT_AD_CONFIG.coinzilla.native, ...parsed.coinzilla?.native },
      },
      adcash: {
        displayBanner: { ...DEFAULT_AD_CONFIG.adcash.displayBanner, ...parsed.adcash?.displayBanner },
        inPagePush:    { ...DEFAULT_AD_CONFIG.adcash.inPagePush,    ...parsed.adcash?.inPagePush    },
      },
    };
  } catch {
    return DEFAULT_AD_CONFIG;
  }
}

export function saveAdConfig(config: AdConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Notify AdsManager to reload
  window.dispatchEvent(new CustomEvent('fbit-ad-config-changed'));
}
