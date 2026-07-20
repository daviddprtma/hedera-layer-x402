const path = require('path');
const dotenv = require('dotenv');

// Next.js doesn't automatically look for .env in the parent directory,
// so we explicitly load it from the monorepo root.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PAY_TO_ACCOUNT: process.env.PAY_TO_ACCOUNT,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    HEDERA_NETWORK: process.env.HEDERA_NETWORK,
    HEDERA_MIRROR_NODE_URL: process.env.HEDERA_MIRROR_NODE_URL,
    NEXT_PUBLIC_DEMO_CLIENT_ID: process.env.NEXT_PUBLIC_DEMO_CLIENT_ID,
    NEXT_PUBLIC_DEMO_CLIENT_KEY: process.env.NEXT_PUBLIC_DEMO_CLIENT_KEY,
  },
  // Next 14 way of excluding packages from Edge runtime bundling
  experimental: {
    serverComponentsExternalPackages: ['@hashgraph/sdk', 'long'],
  },
  // Webpack config for Hedera SDK compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only Hedera SDK in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
