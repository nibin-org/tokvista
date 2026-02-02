/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nibin-org/tokens'],
  output: 'export',
  trailingSlash: true,
  basePath: '/tokens',
  assetPrefix: '/tokens',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig