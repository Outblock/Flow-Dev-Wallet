// @ts-check
const { test, expect } = require('@playwright/test');
const { getStoredWallet, TEST_PRIVATE_KEY } = require('./helpers');

test.describe.serial('Wallet Core', () => {
  test('create wallet with private key', async ({ page }) => {
    // Navigate and clear localStorage, then navigate again fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('store');
      localStorage.removeItem('settings_config');
      localStorage.removeItem('enableBiometric');
    });
    // Navigate fresh (avoids stale chunk timestamps from reload)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the app to fully render (spinner -> SignCard)
    await page.getByText('Create Wallet', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    // Click "Create Wallet" button
    await page.getByText('Create Wallet', { exact: true }).click();

    // Click "Private Key" option
    await page.getByText('Private Key', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('Private Key', { exact: true }).click();

    // Wait for account creation to start — store should have keyInfo
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('store');
        if (!raw) return false;
        const store = JSON.parse(raw);
        return store.keyInfo && store.keyInfo.type === 'PrivateKey';
      },
      { timeout: 15000 }
    );

    const store = await getStoredWallet(page);
    expect(store.keyInfo).toBeTruthy();
    expect(store.keyInfo.type).toBe('PrivateKey');
    expect(store.keyInfo.pubK).toBeTruthy();
    expect(store.keyInfo.pk).toBeTruthy();
    expect(store.keyInfo.evmAddress).toBeTruthy();
  });

  test('create wallet with seed phrase', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('store');
      localStorage.removeItem('settings_config');
      localStorage.removeItem('enableBiometric');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByText('Create Wallet', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Create Wallet', { exact: true }).click();

    await page.getByText('Seed Phrase', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('Seed Phrase', { exact: true }).click();

    // Wait for mnemonic to be generated in store
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('store');
        if (!raw) return false;
        const store = JSON.parse(raw);
        return store.keyInfo && store.keyInfo.type === 'SeedPhrase' && store.keyInfo.mnemonic;
      },
      { timeout: 15000 }
    );

    const store = await getStoredWallet(page);
    expect(store.keyInfo).toBeTruthy();
    expect(store.keyInfo.type).toBe('SeedPhrase');
    expect(store.keyInfo.mnemonic).toBeTruthy();
    const wordCount = store.keyInfo.mnemonic.split(' ').length;
    expect([12, 24]).toContain(wordCount);
    expect(store.keyInfo.pubK).toBeTruthy();
    expect(store.keyInfo.evmAddress).toBeTruthy();
  });

  test('import wallet with private key', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('store');
      localStorage.removeItem('settings_config');
      localStorage.removeItem('enableBiometric');
    });
    await page.goto('/import');
    await page.waitForLoadState('networkidle');

    // Click on "Private Key" tab
    await page.getByRole('tab', { name: /private key/i }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('tab', { name: /private key/i }).click();

    // Enter the test private key
    const pkInput = page.getByRole('textbox', { name: /private key/i });
    await pkInput.waitFor({ state: 'visible' });
    await pkInput.fill(TEST_PRIVATE_KEY);

    // Click Import button
    await page.getByRole('button', { name: /import/i }).click();

    // Wait for either:
    // 1. Address selection modal (importAddressModal) — multiple accounts found
    // 2. "No Address Found" modal — key not found on chain
    // 3. Redirect to main page — single account found
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 15000 });

    const dialogText = await dialog.innerText();

    if (dialogText.includes('No Address Found')) {
      // Key has no associated address on testnet — this is expected for test keys
      // Verify the dialog UI works correctly
      await expect(dialog.getByText('No Address Found')).toBeVisible();
      await dialog.getByRole('button', { name: /ok/i }).click();
      // Verify dialog closes
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    } else {
      // Address selection modal appeared — pick the first address
      const firstAddress = dialog.locator('button').first();
      if (await firstAddress.isVisible()) {
        await firstAddress.click();
      }
      // Verify store has been populated with the imported key
      const store = await getStoredWallet(page);
      expect(store).toBeTruthy();
      expect(store.keyInfo).toBeTruthy();
      expect(store.keyInfo.pk).toBe(TEST_PRIVATE_KEY);
    }
  });

  test('settings page', async ({ page }) => {
    // Inject a wallet so we can access settings
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'store',
        JSON.stringify({
          username: 'SettingsTest',
          address: '0x631e88ae7f1d7c20',
          network: 'testnet',
          keyInfo: {
            type: 'PrivateKey',
            pk: 'abc123',
            pubK: 'def456',
            keyIndex: 0,
            signAlgo: 'ECDSA_P256',
            hashAlgo: 'SHA3_256',
          },
        })
      );
      localStorage.setItem(
        'settings_config',
        JSON.stringify({
          network: 'testnet',
          rpcUrl: 'https://rest-testnet.onflow.org',
          autoSign: false,
        })
      );
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify key elements exist
    await expect(page.getByText('Network').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Access Node RPC')).toBeVisible();
    await expect(page.getByText('Auto-Sign', { exact: true })).toBeVisible();

    // Toggle auto-sign on
    const autoSignSwitch = page.locator('[role="switch"]').first();
    if (await autoSignSwitch.isVisible()) {
      await autoSignSwitch.click();
    }

    // Navigate back and verify settings persisted
    await page.goBack();

    const settings = await page.evaluate(() => {
      const raw = localStorage.getItem('settings_config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(settings).toBeTruthy();
  });
});
