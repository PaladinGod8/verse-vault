import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

test('@critical @ux items can be created, searched, opened, and edited', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const itemName = `Sunblade ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/items`);
    await expect(page.getByRole('button', { name: 'New Item' })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'New Item' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Item' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(itemName);
    await createDialog.getByLabel('Description').fill('Radiant relic');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${itemName}` })).toBeVisible();
    await expect(page.getByText('Radiant relic')).toBeVisible();

    const searchInput = page.getByPlaceholder('Search items by name or description...');
    await searchInput.fill('radiant');
    await expect(page.getByRole('button', { name: `Open ${itemName}` })).toBeVisible();

    await page.getByRole('button', { name: `Open ${itemName}` }).click();
    await expect(page.getByRole('heading', { name: itemName, level: 1 })).toBeVisible();
    await expect(page.getByText('Radiant relic')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Item' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Description').fill('Radiant relic of lost empire');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Radiant relic of lost empire')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
