/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Public (exposed to browser)
    host: process.env.host || 'http://localhost:3003',
    network: process.env.network || 'testnet',
    flowindexUrl: process.env.flowindexUrl || 'https://flowindex.io/api',
    emulatorAddress: process.env.emulatorAddress || 'http://localhost:8888',
    emulatorDiscoveryWallet: process.env.emulatorDiscoveryWallet || 'http://localhost:8701/fcl/authn',
    emulatorServiceAddress: process.env.emulatorServiceAddress || '0xf8d6e0586b0a20c7',
    // Note: apikey, payerPrivateKey, emulatorPrivateKey are NOT exposed here.
    // They are only available server-side via process.env in API routes.
  },
  webpack(config, { nextRuntime, isServer, dev }) {
    // as of Next.js latest versions, the nextRuntime is preferred over `isServer`, because of edge-runtime
    if (typeof nextRuntime === "undefined") {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    //   config.output.webassemblyModuleFilename =
    //   isServer && !dev
    //     ? '../static/wasm/[modulehash].wasm'
    //     : 'static/wasm/[modulehash].wasm'

    // // Since Webpack 5 doesn't enable WebAssembly by default, we should do it manually
    // config.experiments = { ...config.experiments, asyncWebAssembly: true }

    const experiments = config.experiments || {};
    config.experiments = { ...experiments, asyncWebAssembly: true };
    config.output.assetModuleFilename = `static/[hash][ext]`;
    config.output.publicPath = `/_next/`;
    config.module.rules.push({
      test: /\.wasm/,
      type: "asset/resource",
    });

    return config;
  },
};

module.exports = nextConfig;
