import { expect, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
  'base64',
);

test('@critical @offline airplane-mode smoke keeps core local flows working', async () => {
  const { app, userDataDir } = await launchApp();

  try {
    const page = await app.firstWindow();
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

    await page.bringToFront();
    await page.waitForLoadState('domcontentloaded');
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
    await expect(createDialog.getByText('offline.png')).toBeVisible();
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
    await closeApp(app, userDataDir);
  }
});
