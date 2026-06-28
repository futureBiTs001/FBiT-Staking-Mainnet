import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { WalletProvider } from '@/context/WalletContext';
import { AppKitProvider } from '@/providers/AppKitProvider';
import ExtensionErrorSuppressor from '@/components/ExtensionErrorSuppressor';
import DataMigration from '@/components/DataMigration';
import { warnMissingEnv } from '@/lib/security';

warnMissingEnv();

const BASE_URL = 'https://stake.futurebit.in';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'FBiT Staking — Earn 247% APY on Solana & Polygon',
    template: '%s | FBiT Staking',
  },
  description:
    'Stake FBiT tokens on Solana and WFBIT on Polygon. Earn up to 247% dynamic Proof-of-Stake APY, build a 10-level referral network, and get Team Target Bonuses. Non-custodial, open-source, no KYC.',

  keywords: [
    'FBiT staking', 'FutureBit token', 'Solana staking', 'Polygon staking',
    'WFBIT', 'DeFi staking', 'crypto staking', 'high APY staking',
    '10 level referral', 'passive crypto income', 'FBiT token',
    'multi-chain staking', 'non-custodial staking', 'stake and earn',
  ],

  authors: [{ name: 'FutureBit', url: BASE_URL }],
  creator: 'FutureBit',
  publisher: 'FutureBit',

  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'FBiT Staking',
    title: 'FBiT Staking — Earn 247% APY on Solana & Polygon',
    description:
      'Stake FBiT on Solana or WFBIT on Polygon. Up to 247% APY, 10-level referrals, deflationary burn. Non-custodial & open-source.',
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'FBiT Staking — Multi-Chain DeFi Platform',
      },
    ],
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    site: '@FutureBiT_Token',
    creator: '@FutureBiT_Token',
    title: 'FBiT Staking — Earn 247% APY on Solana & Polygon',
    description:
      'Stake FBiT on Solana or WFBIT on Polygon. Up to 247% APY, 10-level referrals, deflationary burn.',
    images: [`${BASE_URL}/og-image.png`],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },

  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },

  verification: {
    google: '15cb21c7066bda5e',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const suppressExtensionErrors = `(function(){
  function isExt(s){return s&&(s.includes('chrome-extension://')||s.includes('moz-extension://'));}
  var MSGS=['Origin not allowed','Extension context invalidated'];
  function isExtErr(r){if(!r)return false;var s=r.stack||'';var m=r.message||String(r);return isExt(s)||MSGS.some(function(x){return m.includes(x);});}
  window.addEventListener('unhandledrejection',function(e){if(isExtErr(e.reason)){e.preventDefault();e.stopImmediatePropagation();}},true);
  window.addEventListener('error',function(e){if(isExt(e.filename||'')||isExtErr(e.error)){e.preventDefault();e.stopImmediatePropagation();}},true);
  var _ce=console.error.bind(console);
  console.error=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==='string'?x:(x&&(x.stack||x.message))||String(x);}).join(' ');if(isExt(a)||MSGS.some(function(m){return a.includes(m);}))return;_ce.apply(console,arguments);};
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: suppressExtensionErrors }} />
      </head>
      <body className="antialiased">
        <ExtensionErrorSuppressor />
        <AppKitProvider>
          <WalletProvider>
            <DataMigration />
            <div className="bg-mesh fixed inset-0" />
            <div className="grid-pattern fixed inset-0" />
            <div className="relative z-10 min-h-screen">
              {children}
            </div>
          </WalletProvider>
        </AppKitProvider>
      </body>
    </html>
  );
}
