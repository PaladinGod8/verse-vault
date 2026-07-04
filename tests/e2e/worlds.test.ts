import { expect, test } from '@playwright/test';
import { cleanupElectronApp, launchElectronApp } from './helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
  'base64',
);

test('@critical @ux worlds create, edit, and delete through home page', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const worldName = `World ${Date.now()}`;
    const updatedWorldName = `${worldName} Prime`;

    await page.getByRole('button', { name: 'Create world' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name').fill(worldName);
    await createDialog.getByLabel('Short description (optional)').fill('Created in e2e.');
    await createDialog.getByRole('button', { name: 'Create world' }).click();

    await expect(page.getByRole('button', { name: `Open ${worldName}` })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit world' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Name').fill(updatedWorldName);
    await editDialog.getByLabel('Short description (optional)').fill('Updated in e2e.');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByRole('button', { name: `Open ${updatedWorldName}` })).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: `Delete "${updatedWorldName}"?` });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'No worlds yet' })).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});

test('@ux worlds persist thumbnail upload, replacement, and clearing', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const worldName = `Thumbnail World ${Date.now()}`;

    await page.getByRole('button', { name: 'Create world' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name').fill(worldName);
    await createDialog.locator('input[type="file"]').setInputFiles({
      name: 'first.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await page
      .getByRole('dialog', { name: 'Crop world thumbnail' })
      .getByRole('button', { name: 'Apply' })
      .click();
    await createDialog.getByRole('button', { name: 'Create world' }).click();

    const cardImage = page.getByRole('img', { name: `${worldName} thumbnail` });
    await expect(cardImage).toBeVisible();
    const firstSrc = await cardImage.getAttribute('src');

    await page.getByRole('button', { name: 'Edit' }).click();
    let editDialog = page.getByRole('dialog', { name: 'Edit world' });
    await expect(editDialog.getByRole('img', { name: 'Current world thumbnail' })).toBeVisible();
    await editDialog.locator('input[type="file"]').setInputFiles({
      name: 'second.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await page
      .getByRole('dialog', { name: 'Crop world thumbnail' })
      .getByRole('button', { name: 'Apply' })
      .click();
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(cardImage).toBeVisible();
    await expect
      .poll(async () =>
        page.getByRole('img', { name: `${worldName} thumbnail` }).getAttribute('src')
      )
      .not.toBe(firstSrc);

    await page.getByRole('button', { name: 'Edit' }).click();
    editDialog = page.getByRole('dialog', { name: 'Edit world' });
    await editDialog.getByRole('button', { name: 'Clear image on save' }).click();
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('No thumbnail')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    editDialog = page.getByRole('dialog', { name: 'Edit world' });
    await expect(editDialog.getByRole('img', { name: 'Current world thumbnail' })).toHaveCount(0);
  } finally {
    await cleanupElectronApp(context);
  }
});
