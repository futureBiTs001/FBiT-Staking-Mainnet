import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'export' removed — API routes (bot-assess + future server functions) require
  // a Node.js runtime. Vercel handles hybrid static+serverless natively.
  trailingSlash: true,
  images: { unoptimized: true },

  turbopack: {
    root: __dirname,
  },

  devIndicators: {
    position: 'bottom-right',
  },

  // Clickjacking / MIME-sniffing protection — important for a wallet-connect dApp,
  // where framing the page invisibly could trick a user into approving a malicious
  // transaction. No CSP here: Reown AppKit's wallet modal loads WalletConnect relay
  // iframes/scripts from domains that would need careful allowlisting to avoid
  // silently breaking wallet connect.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // Keep webpack config for `next build --webpack` and dev fallback
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      os: false,
      path: false,
      crypto: false,
      net: false,
      tls: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
    };
    return config;
  },
};

export default nextConfig;
