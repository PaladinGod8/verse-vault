import { expect, test } from '@playwright/test';
import { cleanupElectronApp, launchElectronApp } from './helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
  'base64',
);

test('@critical @offline airplane-mode smoke keeps core local flows working', async () => {
  // Uses launchElectronApp (not the raw launchApp helper) because it resizes,
  // centers, and focuses the window. Without a real composited frame, the
  // image cropper's shadow-DOM <img> (used by the "Create world" thumbnail
  // crop step below) never fires its load event, so the crop dialog never
  // closes and every click after it hangs until the test times out.
  const context = await launchElectronApp();
  const { page } = context;

  try {
    const networkRequests: string[] = [];

    await page.context().route('http://**/*', async (route) => {
      networkRequests.push(route.request().url());
      await route.abort();
    });
    await page.context().route('https://**/*', async (route) => {
      networkRequests.push(route.request().url());
      await route.abort();
    });
    await page.context().setOffline(true);

    await expect(
      page.getByRole('heading', { name: 'Worlds', exact: true, level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Create world' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name').fill('Offline Realm');
    await createDialog.locator('input[type="file"]').setInputFiles({
      name: 'offline.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await page
      .getByRole('dialog', { name: 'Crop world thumbnail' })
      .getByRole('button', { name: 'Apply' })
      .click();
    await createDialog.getByRole('button', { name: 'Create world' }).click();

    await expect(
      page.getByRole('button', { name: 'Open Offline Realm' }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Offline Realm thumbnail' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    await page.getByLabel('Theme').selectOption('light');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('versevault-light');

    expect(networkRequests).toEqual([]);
  } finally {
    await cleanupElectronApp(context);
  }
});
