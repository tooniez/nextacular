module.exports = {
  images: {
    domains: [''],
    // Disable image optimization to save memory
    unoptimized: true,
  },
  reactStrictMode: true,
  // Ottimizzazioni per ridurre uso memoria
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Limita il numero di worker per ridurre memoria
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  // Optimize on-demand entries for better performance
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Keep pages in memory for 60s (was 15s)
    pagesBufferLength: 5, // Keep 5 pages in buffer (was 1) - improves navigation speed
  },
  // Enable webpack cache in development for faster compilation
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      // Enable filesystem cache for faster rebuilds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    // Only apply webpack config if not using Turbopack
    if (!isServer && !dev) {
      // Reduce client-side bundle size
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Only create one vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,
};
