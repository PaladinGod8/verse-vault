import { test, expect } from '@playwright/test';
import { launchApp, closeApp } from './helpers/launchApp';

test('statblocks full CRUD flow works end to end', async () => {
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
    const worldName = `E2E StatBlock CRUD ${unique}`;
    const sbName = `Goblin Warrior ${unique}`;
    const sbDesc = 'A fierce goblin fighter';
    const sbUpdatedName = `${sbName} (Updated)`;

    // Create world
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

    // Open world
    await window.getByRole('button', { name: `Open ${worldName}` }).click();
    await expect(
      window.getByRole('heading', { name: 'World Overview', level: 1 }),
    ).toBeVisible();

    // Navigate to StatBlocks
    await window.getByRole('link', { name: 'StatBlocks' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await expect(window.getByText('No statblocks yet.')).toBeVisible();

    // --- CREATE ---
    await window.getByRole('button', { name: 'New StatBlock' }).click();
    const createDialog = window.getByRole('dialog', { name: 'New StatBlock' });
    await expect(createDialog).toBeVisible();

    await createDialog.getByLabel('Name').fill(sbName);
    await createDialog.getByLabel('Description (optional)').fill(sbDesc);
    await createDialog
      .getByRole('button', { name: 'Create statblock' })
      .click();
    await expect(createDialog).not.toBeVisible();

    // Card appears in list
    await expect(
      window.getByRole('heading', { name: sbName, exact: true }),
    ).toBeVisible();
    await expect(window.getByText(sbDesc)).toBeVisible();
    await expect(window.getByText('No statblocks yet.')).not.toBeVisible();

    // Success toast
    await expect(
      window
        .getByRole('status')
        .filter({ hasText: 'StatBlock created.' })
        .first(),
    ).toBeVisible();

    // --- UPDATE ---
    await window.getByRole('button', { name: 'Edit' }).click();
    const editDialog = window.getByRole('dialog', { name: 'Edit StatBlock' });
    await expect(editDialog).toBeVisible();

    await editDialog.getByLabel('Name').fill(sbUpdatedName);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(editDialog).not.toBeVisible();

    await expect(
      window.getByRole('heading', { name: sbUpdatedName, exact: true }),
    ).toBeVisible();
    await expect(
      window.getByRole('heading', { name: sbName, exact: true }),
    ).not.toBeVisible();

    // Update toast
    await expect(
      window
        .getByRole('status')
        .filter({ hasText: 'StatBlock updated.' })
        .first(),
    ).toBeVisible();

    // --- DELETE ---
    await window.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = window.getByRole('dialog', {
      name: `Delete "${sbUpdatedName}"?`,
    });
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByText('This cannot be undone.'),
    ).toBeVisible();

    await confirmDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(confirmDialog).not.toBeVisible();

    await expect(
      window.getByRole('heading', { name: sbUpdatedName, exact: true }),
    ).not.toBeVisible();

    // Delete toast
    await expect(
      window
        .getByRole('status')
        .filter({ hasText: 'StatBlock deleted.' })
        .first(),
    ).toBeVisible();

    // Back to empty state
    await expect(window.getByText('No statblocks yet.')).toBeVisible();
  } finally {
    await closeApp(app, userDataDir);
  }
});

test('statblocks create dialog submit is disabled when name is empty', async () => {
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
    const worldName = `E2E StatBlock Validation ${unique}`;

    // Create world and navigate to statblocks
    await window.getByRole('button', { name: 'Create world' }).click();
    const worldDialog = window.getByRole('dialog', { name: 'Create world' });
    await worldDialog.getByLabel('Name').fill(worldName);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();
    await window.getByRole('button', { name: `Open ${worldName}` }).click();
    await window.getByRole('link', { name: 'StatBlocks' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();

    // Open create dialog
    await window.getByRole('button', { name: 'New StatBlock' }).click();
    const createDialog = window.getByRole('dialog', { name: 'New StatBlock' });
    await expect(createDialog).toBeVisible();

    // Submit button disabled when name is empty
    const submitBtn = createDialog.getByRole('button', {
      name: 'Create statblock',
    });
    await expect(submitBtn).toBeDisabled();

    // Type invalid JSON in config — error message appears
    await createDialog.getByLabel('Config (JSON)').fill('invalid json');
    await expect(
      createDialog.locator('p', { hasText: 'Invalid JSON' }),
    ).toBeVisible();

    // Cancel closes dialog without creating
    await createDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(createDialog).not.toBeVisible();
    await expect(window.getByText('No statblocks yet.')).toBeVisible();
  } finally {
    await closeApp(app, userDataDir);
  }
});

test('statblocks error states: invalid world id and world not found', async () => {
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

    // Navigate to statblocks with non-numeric world id
    await window.evaluate(() => {
      self.location.hash = '#/world/invalid/statblocks';
    });
    await expect(window.getByText('Invalid world id.')).toBeVisible();

    // Navigate to statblocks for a world that doesn't exist
    await window.evaluate(() => {
      self.location.hash = '#/world/999999/statblocks';
    });
    await expect(window.getByText('World not found.')).toBeVisible();
  } finally {
    await closeApp(app, userDataDir);
  }
});
