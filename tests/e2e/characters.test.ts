import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, deleteWorld, launchElectronApp } from './helpers';

test('@critical @ux player characters can be created and found by player-character search and owner', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId, worldName } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const characterName = `PC Hero ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/characters`);
    await expect(page.getByRole('heading', { name: worldName, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Character' })).toBeVisible();

    await page.getByRole('button', { name: 'New Character' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Character' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(characterName);
    await createDialog.locator('input[type="checkbox"]').check();
    await createDialog.getByLabel('Owner *').fill('Gator');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${characterName}` })).toBeVisible();
    await expect(page.getByText('Player Character')).toBeVisible();
    await expect(page.getByText('Owner: Gator')).toBeVisible();

    const searchInput = page.getByPlaceholder(
      'Search characters by any field (e.g. weight, faction)...',
    );
    await searchInput.fill('player character');
    await expect(page.getByRole('button', { name: `Open ${characterName}` })).toBeVisible();

    await searchInput.fill('Gator');
    await expect(page.getByRole('button', { name: `Open ${characterName}` })).toBeVisible();

    await deleteWorld(page, worldId);
  } finally {
    await cleanupElectronApp(context);
  }
});
