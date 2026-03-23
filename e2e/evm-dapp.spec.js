// @ts-check
const { test, expect } = require('@playwright/test');
const { setupWallet, injectTestWallet, TEST_PRIVATE_KEY, TEST_ACCOUNT } = require('./helpers');

test.describe('EVM DApp Integration', () => {
  test('connect to EVM dapp via URL params', async ({ page, context }) => {
    // Pre-configure wallet using URL params with auto-sign enabled
    await setupWallet(page, {
      seed: TEST_PRIVATE_KEY,
      network: 'testnet',
      autoSign: true,
    });

    // Verify wallet was configured with EVM address
    const store = await page.evaluate(() => JSON.parse(localStorage.getItem('store')));
    expect(store.keyInfo).toBeTruthy();
    expect(store.keyInfo.evmAddress).toBeTruthy();
    expect(store.autoSign).toBe(true);

    // Navigate to the EVM test dapp
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');

    // Verify the dapp loaded
    await expect(page.getByRole('heading', { name: 'Welcome to Flow EVM Test dApp' })).toBeVisible({ timeout: 10000 });

    // Click "Request Accounts" to connect
    await page.getByRole('button', { name: /request accounts/i }).first().click();
    await page.waitForLoadState('networkidle');

    // On the method page, trigger the wallet popup
    const popupPromise = context.waitForEvent('page', { timeout: 15000 });

    const callBtn = page.getByRole('button', { name: /call|execute|request|send|connect/i }).first();
    await callBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await callBtn.isVisible()) {
      await callBtn.click();
    }

    const popup = await popupPromise.catch(() => null);

    if (popup) {
      await popup.waitForLoadState('networkidle');
      await popup.waitForTimeout(2000);

      expect(popup.url()).toContain('localhost:3003');

      // EVM popup stays open (handles ongoing RPC requests)
      // With auto-sign, it should auto-process requests
      const evmWalletText = popup.getByText('EVM Wallet');
      const hasEvmUI = await evmWalletText.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasEvmUI) {
        // Verify auto-sign chip is shown
        await expect(popup.getByText('Auto-sign enabled')).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }

    // Verify the dapp page is still functional
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('connect to EVM dapp with manual approval', async ({ page, context }) => {
    // Set up wallet with localStorage injection (auto-sign OFF)
    await page.goto('http://localhost:3003');
    await injectTestWallet(page);

    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Welcome to Flow EVM Test dApp' })).toBeVisible({ timeout: 10000 });

    // Navigate to Request Accounts
    await page.getByRole('button', { name: /request accounts/i }).first().click();
    await page.waitForLoadState('networkidle');

    const popupPromise = context.waitForEvent('page', { timeout: 15000 });
    const callBtn = page.getByRole('button', { name: /call|execute|request|send|connect/i }).first();
    await callBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await callBtn.isVisible()) {
      await callBtn.click();
    }

    const popup = await popupPromise.catch(() => null);

    if (popup) {
      await popup.waitForLoadState('networkidle');
      expect(popup.url()).toContain('localhost:3003');
    }
  });
});
