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

// Ad placements are configured via NEXT_PUBLIC_ADS_* env vars (set in Vercel project
// settings, redeploy to apply) rather than a runtime admin toggle — this app has no
// backend database, so a "live" admin-editable setting would only ever affect the
// admin's own browser (localStorage), never other visitors. A zone ID being present
// is what enables that placement.
function zone(envVar: string | undefined): { enabled: boolean; zoneId: string } {
  const zoneId = (envVar ?? '').trim();
  return { enabled: !!zoneId, zoneId };
}

export const AD_CONFIG: AdConfig = {
  coinzilla: {
    banner: zone(process.env.NEXT_PUBLIC_ADS_COINZILLA_BANNER_ZONE),
    sticky: zone(process.env.NEXT_PUBLIC_ADS_COINZILLA_STICKY_ZONE),
    native: zone(process.env.NEXT_PUBLIC_ADS_COINZILLA_NATIVE_ZONE),
  },
  adcash: {
    displayBanner: zone(process.env.NEXT_PUBLIC_ADS_ADCASH_BANNER_ZONE),
    inPagePush:    zone(process.env.NEXT_PUBLIC_ADS_ADCASH_PUSH_ZONE),
  },
};

export function getAdConfig(): AdConfig {
  return AD_CONFIG;
}
