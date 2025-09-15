/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Für Production Build ESLint Warnings ignorieren
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Für Production Build TypeScript Errors ignorieren (temporär)
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'supabase.co', 'supabase.in'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
