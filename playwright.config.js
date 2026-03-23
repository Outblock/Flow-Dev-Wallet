// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun next dev -p 3003',
      url: 'http://localhost:3003',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'cd /Users/hao/outblock/fcl-next-harness && bun next dev -p 3002',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'cd /Users/hao/outblock/flow-evm-rainbow && bun next dev -p 3004',
      url: 'http://localhost:3004',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
