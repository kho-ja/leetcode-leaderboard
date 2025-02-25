/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // This will allow all image sources
      },
    ],
    domains: ['assets.leetcode.com', 'leetcode.com'],
  },
}

module.exports = nextConfig
