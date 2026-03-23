import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['recharts'],
  },
  images: {
    domains: ['finnhub.io', 'static2.finnhub.io'],
  },
}

export default nextConfig
