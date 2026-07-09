import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['toddheadquarters'],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://api:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
