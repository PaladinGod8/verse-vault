import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

// Requires `yarn package` to have been run first so that
// .vite/build/main.js and .vite/renderer/main_window/ exist.
const mainJs = path.join(__dirname, '../../.vite/build/main.js');

test('app launches and shows worlds landing shell', async () => {
  // Unset ELECTRON_RUN_AS_NODE (inherited from VS Code/terminals) so Electron
  // initializes as a proper GUI app rather than a plain Node.js process.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({ args: [mainJs], env });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await expect(
    window.getByRole('heading', { name: 'Worlds', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(window.getByRole('button', { name: 'Create world' })).toBeVisible();

  await window.waitForFunction(() => {
    const hasEmptyState = Array.from(document.querySelectorAll('h2')).some(
      (heading) => heading.textContent?.trim() === 'No worlds yet',
    );
    const hasWorldCard =
      document.querySelector('article[role="button"][aria-label^="Open "]') !==
      null;

    return hasEmptyState || hasWorldCard;
  });

  const emptyStateHeading = window.getByRole('heading', { name: 'No worlds yet' });
  const firstWorldCard = window.locator(
    'article[role="button"][aria-label^="Open "]',
  ).first();

  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
  } else {
    await expect(firstWorldCard).toBeVisible();
  }

  await app.close();
});
