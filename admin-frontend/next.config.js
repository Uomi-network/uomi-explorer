/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.admin.explorer-finney.uomi.ai',
  },
  // Ensure images from Auth0 domains can be displayed
  images: {
    domains: ['s.gravatar.com', 'lh3.googleusercontent.com', 'github.com'],
  },
}

module.exports = nextConfig
