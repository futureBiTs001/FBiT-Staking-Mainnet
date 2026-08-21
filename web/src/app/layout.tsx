import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import ExtensionErrorSuppressor from '@/components/ExtensionErrorSuppressor';
import DataMigration from '@/components/DataMigration';
import { warnMissingEnv } from '@/lib/security';
import AdsManager from '@/components/ads/AdsManager';
import SupportChat from '@/components/chat/SupportChat';

warnMissingEnv();

const BASE_URL = 'https://stake.futurebit.in';

// ── Google Analytics 4 — replace G-XXXXXXXXXX with your real Measurement ID ──
const GA_ID = 'G-3B36D0CW8F';

// ── Schema.org structured data ────────────────────────────────────────────────
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'FutureBit Staking',
      alternateName: ['FBiT Staking', 'FBiT'],
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.svg`,
      },
      sameAs: [
        'https://x.com/FutureBiT_Token',
        'https://t.me/FutureBiTToken',
        'https://github.com/futurebitsmaxx/FBiT-Staking-Mainnet',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'FutureBit Staking',
      alternateName: 'FBiT Staking',
      description: 'FBiT token staking platform on Solana',
      publisher: { '@id': `${BASE_URL}/#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${BASE_URL}/#app`,
      name: 'FutureBit Staking Platform',
      url: BASE_URL,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web Browser',
      description:
        'Stake FBiT tokens on Solana. Earn dynamic PoS APY (up to 300%, adjusts automatically with total staked) with 10-level referral commissions. Non-custodial, no KYC.',
      offers: {
        '@type': 'Offer',
        description: 'Stake FBiT and earn dynamic APY up to 300%',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Dynamic PoS APY (up to 300%)',
        '10-Level Referral System',
        '10% Burn Mechanism',
        'Team Target Bonuses',
        'Built on Solana',
        'Non-Custodial',
        'No KYC Required',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is FBiT token?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'FBiT is the native utility token of the FutureBit staking platform. It is a Solana SPL token used for staking to earn dynamic Proof-of-Stake rewards.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much APY can I earn staking FBiT?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'FBiT staking offers a dynamic APY of up to 300% that adjusts automatically based on total tokens staked — when fewer tokens are staked, APY increases, and vice versa, down to a 10% floor. Check the Live Stats section on the home page for the current rate.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which blockchain does FutureBit Staking run on?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'FutureBit Staking runs on Solana Mainnet — stake FBiT tokens using Phantom, Solflare, or any Solana wallet.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the referral commission in FBiT staking?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'FutureBit Staking offers a 10-level referral system. Total commission across all levels is 30%: Level 1: 0.25%, Level 2: 0.5%, Level 3: 1.25%, up to Level 10: 8%. Commissions are paid automatically on-chain.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is FBiT staking safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'FutureBit Staking is non-custodial — your tokens never leave your wallet. The smart contracts are open-source and verifiable on Solana Explorer. No KYC or personal data is required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is FutureBit Staking the same company as FutureBit (Apollo Bitcoin miners)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. FutureBit Staking (ticker FBiT) at stake.futurebit.in is an independent Solana DeFi staking protocol and is not affiliated with FutureBit LLC, the maker of Apollo Bitcoin mining hardware. The two are separate, unrelated projects that happen to share a similar name.',
          },
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'FutureBit Staking (FBiT) — Earn Dynamic APY on Solana',
    template: '%s | FutureBit Staking',
  },
  description:
    'Stake FBiT tokens on Solana. Earn dynamic Proof-of-Stake APY up to 300%, build a 10-level referral network, and get Team Target Bonuses. Non-custodial, open-source, no KYC.',

  keywords: [
    'FBiT staking', 'FutureBit token', 'Solana staking',
    'DeFi staking', 'crypto staking', 'high APY staking',
    '10 level referral crypto', 'passive crypto income', 'FBiT token',
    'non-custodial staking', 'stake and earn',
    'crypto passive income India', 'best staking platform 2026',
    'solana defi', 'FutureBit staking',
  ],

  authors: [{ name: 'FutureBit', url: BASE_URL }],
  creator: 'FutureBit',
  publisher: 'FutureBit',

  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'FutureBit Staking',
    title: 'FutureBit Staking (FBiT) — Earn Dynamic APY on Solana',
    description:
      'Stake FBiT on Solana. Dynamic APY up to 300%, 10-level referrals, deflationary burn. Non-custodial & open-source.',
    images: [
      {
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'FutureBit Staking — Solana DeFi Platform',
      },
    ],
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    site: '@FutureBiT_Token',
    creator: '@FutureBiT_Token',
    title: 'FutureBit Staking (FBiT) — Earn Dynamic APY on Solana',
    description:
      'Stake FBiT on Solana. Dynamic APY up to 300%, 10-level referrals, deflationary burn.',
    images: [`${BASE_URL}/opengraph-image`],
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
    google: [
      'BxzT8iTO3x-tAefZfNaA4H9Z0JC8edGS61YFWRw4ca4',
      '9luXnlk5ESpDm2a3zgJGB5URsqbPkzQIkysnpSzq49g',
    ],
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

        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">

        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true
            });
          `}
        </Script>

        <AdsManager />
        <ExtensionErrorSuppressor />
        <DataMigration />
        <div className="bg-mesh fixed inset-0" />
        <div className="grid-pattern fixed inset-0" />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
        <SupportChat />
      </body>
    </html>
  );
}
