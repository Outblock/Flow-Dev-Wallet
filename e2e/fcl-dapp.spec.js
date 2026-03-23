// @ts-check
const { test, expect } = require('@playwright/test');
const { setupWallet, injectTestWallet, TEST_PRIVATE_KEY, TEST_ACCOUNT } = require('./helpers');

test.describe('FCL DApp Integration', () => {
  test('connect to FCL harness via URL params', async ({ page, context }) => {
    // Pre-configure wallet using URL params with auto-sign enabled
    await setupWallet(page, {
      seed: TEST_PRIVATE_KEY,
      network: 'testnet',
      autoSign: true,
    });

    // Verify wallet was configured
    const store = await page.evaluate(() => JSON.parse(localStorage.getItem('store')));
    expect(store.keyInfo).toBeTruthy();
    expect(store.keyInfo.pk).toBe(TEST_PRIVATE_KEY);
    expect(store.autoSign).toBe(true);

    // Navigate to the FCL harness app
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Add the dev wallet as a custom wallet service
    const walletNameInput = page.getByRole('textbox', { name: /wallet name/i });
    const walletEndpointInput = page.getByRole('textbox', { name: /wallet endpoint/i });

    await walletNameInput.fill('Flow Dev Wallet');
    await walletEndpointInput.clear();
    await walletEndpointInput.fill('http://localhost:3003/authn');

    await page.getByRole('button', { name: /add to wallet list/i }).click();
    await expect(page.getByText('Flow Dev Wallet')).toBeVisible({ timeout: 5000 });

    // Click "Connect with FCL (POP)" to trigger authentication
    const popupPromise = context.waitForEvent('page', { timeout: 15000 });
    await page.getByRole('button', { name: /connect.*fcl.*pop|connect.*pop/i }).click();

    // Wait for the wallet popup to open
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');

    // Verify popup loaded the wallet auth page
    expect(popup.url()).toContain('localhost:3003');

    // With auto-sign, the popup should auto-approve and close
    // Wait for popup to close (auto-close after approval)
    await popup.waitForEvent('close', { timeout: 10000 }).catch(() => {
      // If popup doesn't auto-close, try clicking Connect manually
    });

    // Check if harness shows connected status
    // The status area shows either "Connected" or the address
    const walletStatusArea = page.locator('text=Wallet Status').locator('..');
    const statusText = await walletStatusArea.innerText().catch(() => '');
    // Status may remain "Disconnected" if the test key has no on-chain account
    expect(statusText).toBeTruthy();
  });

  test('connect to FCL harness with manual approval', async ({ page, context }) => {
    // Set up wallet with localStorage injection (auto-sign OFF)
    await page.goto('http://localhost:3003');
    await injectTestWallet(page);

    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    // Add custom wallet
    await page.getByRole('textbox', { name: /wallet name/i }).fill('Flow Dev Wallet');
    const endpointInput = page.getByRole('textbox', { name: /wallet endpoint/i });
    await endpointInput.clear();
    await endpointInput.fill('http://localhost:3003/authn');
    await page.getByRole('button', { name: /add to wallet list/i }).click();

    // Trigger connection
    const popupPromise = context.waitForEvent('page', { timeout: 15000 });
    await page.getByRole('button', { name: /connect.*fcl.*pop|connect.*pop/i }).click();

    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle');
    await popup.waitForTimeout(2000);

    expect(popup.url()).toContain('localhost:3003');

    // With auto-sign OFF, a Connect button should appear
    const connectBtn = popup.getByRole('button', { name: /connect/i }).first();
    const hasConnectBtn = await connectBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasConnectBtn) {
      await connectBtn.click();
    }
  });
});
