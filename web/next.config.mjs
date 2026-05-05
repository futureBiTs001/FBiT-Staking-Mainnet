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
