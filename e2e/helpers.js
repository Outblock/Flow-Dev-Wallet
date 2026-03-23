// Test constants
export const TEST_PRIVATE_KEY =
  'a3f563dd0926199530ab89d35760009b7384a2f41ce4faaf663dc47e3c42c642';

export const TEST_ACCOUNT = {
  username: 'TestUser',
  address: '0x631e88ae7f1d7c20',
  network: 'testnet',
  keyInfo: {
    type: 'PrivateKey',
    pk: TEST_PRIVATE_KEY,
    pubK: 'd7228401279b1297984b6d9191af7f4352652dd91c4b68a408be88718e4d61012992864230934c27caf46d2dda8136010f3137ce75083638259b8beabc8f38a4',
    keyIndex: 0,
    signAlgo: 'ECDSA_P256',
    hashAlgo: 'SHA3_256',
    evmAddress: '0x1234567890abcdef1234567890abcdef12345678',
  },
};

export const TEST_SETTINGS = {
  network: 'testnet',
  rpcUrl: 'https://rest-testnet.onflow.org',
  autoSign: false,
};

/**
 * Set up the wallet using URL parameters.
 * Navigates to the wallet with ?seed=...&network=...&autoSign=... and waits for configuration.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {string} [options.seed] - Private key hex
 * @param {string} [options.network] - testnet | mainnet | emulator
 * @param {boolean} [options.autoSign] - Enable auto-sign mode
 * @param {number} [options.waitMs] - Time to wait for wallet setup (default 3000)
 */
export async function setupWallet(page, options = {}) {
  const params = new URLSearchParams();
  if (options.seed) params.set('seed', options.seed);
  if (options.network) params.set('network', options.network);
  if (options.autoSign != null) params.set('autoSign', String(options.autoSign));

  const url = `http://localhost:3003?${params.toString()}`;
  await page.goto(url);

  // Wait for the wallet to configure from URL params
  const waitMs = options.waitMs || 3000;
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('store');
      if (!raw) return false;
      const store = JSON.parse(raw);
      return store.keyInfo && store.keyInfo.pk;
    },
    { timeout: waitMs + 5000 }
  );
}

/**
 * Inject a pre-configured wallet into localStorage for the wallet app.
 * Must be called after navigating to a page on localhost:3003.
 */
export async function injectTestWallet(page) {
  await page.evaluate(
    ({ account, settings }) => {
      localStorage.setItem('store', JSON.stringify(account));
      localStorage.setItem('settings_config', JSON.stringify(settings));
    },
    { account: TEST_ACCOUNT, settings: TEST_SETTINGS }
  );
}

/**
 * Clear wallet state from localStorage.
 */
export async function clearWalletState(page) {
  await page.evaluate(() => {
    localStorage.removeItem('store');
    localStorage.removeItem('settings_config');
    localStorage.removeItem('enableBiometric');
  });
}

/**
 * Get the stored wallet data from localStorage.
 */
export async function getStoredWallet(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('store');
    return raw ? JSON.parse(raw) : null;
  });
}
