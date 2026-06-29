import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

async function prepareWindowForSettings(userDataDir?: string) {
  const result = await launchApp(userDataDir);
  const page = await result.app.firstWindow();

  await result.app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      return;
    }
    win.setSize(1440, 960);
    win.center();
    win.focus();
  });

  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByRole('heading', { name: 'Worlds', exact: true, level: 1 }),
  ).toBeVisible();

  return { ...result, page };
}

async function openSettings(page: Page) {
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

test('@critical @ux settings persist theme choice across restart', async () => {
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let userDataDir: string | undefined;

  try {
    ({ app, page, userDataDir } = await prepareWindowForSettings());
    await openSettings(page);

    await page.getByLabel('Theme').selectOption('light');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('versevault-light');

    await closeApp(app, userDataDir, { preserveUserDataDir: true });

    ({ app, page } = await prepareWindowForSettings(userDataDir));
    await openSettings(page);

    await expect(page.getByLabel('Theme')).toHaveValue('light');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('versevault-light');
  } finally {
    if (app && userDataDir) {
      await closeApp(app, userDataDir);
    }
  }
});

test('@critical @ux settings persist custom theme palette across restart', async () => {
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let userDataDir: string | undefined;

  try {
    ({ app, page, userDataDir } = await prepareWindowForSettings());
    await openSettings(page);

    await page.getByLabel('Theme').selectOption('custom');
    await expect(page.getByRole('heading', { name: 'Theme preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Custom color' }).click();
    await page.getByLabel('Theme color custom hex color').fill('#ff44aa');
    await expect(page.getByLabel('Theme color custom hex color')).toHaveValue('#ff44aa');

    await closeApp(app, userDataDir, { preserveUserDataDir: true });

    ({ app, page } = await prepareWindowForSettings(userDataDir));
    await openSettings(page);

    await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('custom');
    await expect(page.getByLabel('Theme color custom hex color')).toHaveValue('#ff44aa');
  } finally {
    if (app && userDataDir) {
      await closeApp(app, userDataDir);
    }
  }
});
