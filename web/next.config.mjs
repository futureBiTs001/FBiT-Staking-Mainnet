import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },

  // Dev-only proxy: routes /dev-rpc/solana → Solana mainnet RPC server-side
  // (public Solana RPCs block browser requests with Origin: localhost).
  // In production (static export) this rewrite is ignored; the deployed domain
  // is not blocked by Solana RPCs.
  async rewrites() {
    return [
      {
        source: '/dev-rpc/solana',
        destination: 'https://api.mainnet-beta.solana.com',
      },
    ];
  },

  turbopack: {
    root: __dirname,
  },

  devIndicators: {
    position: 'bottom-right',
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
