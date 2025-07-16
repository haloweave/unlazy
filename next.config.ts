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

  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
