import { expect, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

test('statblocks page navigates from sidebar and shows empty state', async () => {
  const { app, userDataDir } = await launchApp();

  try {
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

    const unique = Date.now().toString();
    const worldName = `E2E StatBlock World ${unique}`;

    // Create a world
    await window.getByRole('button', { name: 'Create world' }).click();
    const worldDialog = window.getByRole('dialog', { name: 'Create world' });
    await expect(worldDialog).toBeVisible();
    await worldDialog.getByLabel('Name').fill(worldName);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();
    await expect(
      window.getByRole('button', { name: `Open ${worldName}` }),
    ).toBeVisible();

    // Open the world
    await window.getByRole('button', { name: `Open ${worldName}` }).click();
    await expect(
      window.getByRole('heading', { name: 'World Overview', level: 1 }),
    ).toBeVisible();

    // Navigate to StatBlocks via sidebar
    await window.getByRole('link', { name: 'StatBlocks' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();

    // Empty state
    await expect(window.getByText('No statblocks yet.')).toBeVisible();

    // New StatBlock button is present (scaffold)
    await expect(
      window.getByRole('button', { name: 'New StatBlock' }),
    ).toBeVisible();
  } finally {
    await closeApp(app, userDataDir);
  }
});
