import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

test('@critical @ux levels create, edit, and delete through levels page', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId, worldName } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];

    await page.goto(`${baseUrl}#/world/${worldId}/levels`);
    await expect(page.getByRole('heading', { name: worldName, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Level' })).toBeVisible();

    await page.getByRole('button', { name: 'New Level' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Level' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name').fill('Sky Fortress');
    await createDialog.getByLabel('Category').fill('Aerial');
    await createDialog.getByRole('button', { name: 'Create level' }).click();

    const row = page.locator('tr').filter({ hasText: 'Sky Fortress' }).first();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Level' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Name').fill('Sky Fortress Prime');
    await editDialog.getByLabel('Category').fill('Boss Arena');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    const updatedRow = page.locator('tr').filter({ hasText: 'Sky Fortress Prime' }).first();
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Delete "Sky Fortress Prime"?' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No levels yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
