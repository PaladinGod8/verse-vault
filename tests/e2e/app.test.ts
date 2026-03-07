import { expect, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

// Requires `yarn package` to have been run first so that
// .vite/build/main.js and .vite/renderer/main_window/ exist.

test('app launches and shows worlds landing shell', async () => {
  const { app, userDataDir } = await launchApp();

  const window = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      return;
    }
    win.setSize(1440, 960);
    win.center();
    win.focus();
  });
  await window.bringToFront();
  await window.waitForLoadState('domcontentloaded');

  await expect(
    window.getByRole('heading', { name: 'Worlds', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    window.getByRole('button', { name: 'Create world' }),
  ).toBeVisible();

  await window.waitForFunction(() => {
    const hasEmptyState = Array.from(document.querySelectorAll('h2')).some(
      (heading) => heading.textContent?.trim() === 'No worlds yet',
    );
    const hasWorldCard = document.querySelector('article[role="button"][aria-label^="Open "]')
      !== null;

    return hasEmptyState || hasWorldCard;
  });

  const emptyStateHeading = window.getByRole('heading', {
    name: 'No worlds yet',
  });
  const firstWorldCard = window
    .locator('article[role="button"][aria-label^="Open "]')
    .first();

  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
  } else {
    await expect(firstWorldCard).toBeVisible();
  }

  await closeApp(app, userDataDir);
});
