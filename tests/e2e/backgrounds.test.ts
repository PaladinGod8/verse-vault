import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

test('@critical @ux backgrounds can be created, searched, opened, and edited', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const backgroundName = `Royal Guard ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/backgrounds`);
    await expect(page.getByRole('button', { name: 'New Background' })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'New Background' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Background' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(backgroundName);
    await createDialog.getByLabel('Description').fill('Elite city soldiers');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${backgroundName}` })).toBeVisible();
    await expect(page.getByText('Elite city soldiers')).toBeVisible();

    const searchInput = page.getByPlaceholder('Search backgrounds by name or description...');
    await searchInput.fill('soldiers');
    await expect(page.getByRole('button', { name: `Open ${backgroundName}` })).toBeVisible();

    await page.getByRole('button', { name: `Open ${backgroundName}` }).click();
    await expect(page.getByRole('heading', { name: backgroundName, level: 1 })).toBeVisible();
    await expect(page.getByText('Elite city soldiers')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Background' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Description').fill('Royal bodyguards and city watch');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Royal bodyguards and city watch')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
