/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
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
};

module.exports = nextConfig;
