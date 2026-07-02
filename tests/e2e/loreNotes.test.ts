import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

test('@critical @ux lore notes can be created with tags, searched, tagged via autocomplete, edited, and deleted', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const noteName = `Founding Myth ${Date.now()}`;
    const secondNoteName = `Trade Ledger ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/lore-notes`);
    await expect(page.getByRole('button', { name: 'New Lore Note' })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'New Lore Note' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Lore Note' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(noteName);
    await createDialog.getByLabel('Content').fill('The city was founded on a trade pact.');
    await createDialog.getByLabel('Tags').fill('Economics');
    await createDialog.getByLabel('Tags').press('Enter');
    await expect(createDialog.getByText('Economics')).toBeVisible();
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${noteName}` })).toBeVisible();
    await expect(page.getByText('The city was founded on a trade pact.')).toBeVisible();

    const searchInput = page.getByPlaceholder(/search lore notes/i);
    await searchInput.fill('#Economics');
    await expect(page.getByRole('button', { name: `Open ${noteName}` })).toBeVisible();

    await searchInput.fill('#NoSuchTag');
    await expect(page.getByText('No lore notes match your search.')).toBeVisible();
    await searchInput.fill('');

    await page.getByRole('button', { name: 'New Lore Note' }).click();
    const secondCreateDialog = page.getByRole('dialog', { name: 'New Lore Note' });
    await secondCreateDialog.getByLabel('Name *').fill(secondNoteName);
    await secondCreateDialog.getByLabel('Tags').fill('Econ');
    await expect(secondCreateDialog.getByText('Economics')).toBeVisible();
    await secondCreateDialog.getByText('Economics').click();
    await secondCreateDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${secondNoteName}` })).toBeVisible();

    await page.getByRole('button', { name: `Open ${noteName}` }).click();
    await expect(page.getByRole('heading', { name: noteName, level: 1 })).toBeVisible();
    await expect(page.getByText('The city was founded on a trade pact.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Lore Note' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Content').fill('The founding pact still governs trade law.');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('The founding pact still governs trade law.')).toBeVisible();

    await page.goto(`${baseUrl}#/world/${worldId}/lore-notes`);
    const card = page.locator('article[role="button"]').filter({ hasText: noteName }).first();
    await card.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: `Delete "${noteName}"?` });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('button', { name: `Open ${noteName}` })).not.toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
