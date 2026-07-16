import type { NextConfig } from "next";
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];
const nextConfig: NextConfig = {
  allowedDevOrigins:allowedOrigins,
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
