/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nibin-org/tokens'],
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig