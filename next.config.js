/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  /**
   * On Windows (especially with OneDrive), file watchers sometimes fail and webpack
   * sits on "Compiling..." forever. If that happens, run dev with:
   *   set NEXT_WEBPACK_POLL=1&& npm run dev
   * (PowerShell: $env:NEXT_WEBPACK_POLL=1; npm run dev)
   */
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_WEBPACK_POLL === '1') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
