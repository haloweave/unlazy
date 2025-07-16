import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ensure dictionary files are properly bundled
    if (isServer) {
      config.externals = config.externals || [];
      // Don't externalize dictionary packages
      config.externals.push({
        'dictionary-en': false,
      });
    }
    
    // Handle .aff and .dic files used by dictionary packages
    config.module.rules.push({
      test: /\.(aff|dic)$/,
      type: 'asset/resource',
    });

    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
