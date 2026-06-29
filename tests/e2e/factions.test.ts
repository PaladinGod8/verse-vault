import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createCharacter, createWorld, launchElectronApp } from './helpers';

test('@critical @ux factions support types, filtering, detail editing, membership, and deletion', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId, worldName } = await createWorld(page);
    const { characterName } = await createCharacter(page, worldId, {
      name: `Faction Member ${Date.now()}`,
      isPlayerCharacter: true,
      owner: 'Gator',
    });
    const baseUrl = page.url().split('#')[0];
    const factionName = `Night Watch ${Date.now()}`;
    const updatedFactionName = `${factionName} Prime`;

    await page.goto(`${baseUrl}#/world/${worldId}/factions`);
    await expect(page.getByRole('heading', { name: worldName, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Manage Types' }).click();
    const typesDialog = page.getByRole('dialog', { name: 'Manage Faction Types' });
    await expect(typesDialog).toBeVisible();
    await typesDialog.getByLabel('New type name').fill('Company');
    await typesDialog.getByRole('button', { name: 'Add Type' }).click();
    await expect(typesDialog.locator('input[type="text"]').first()).toHaveValue('Company');
    await typesDialog.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'New Faction' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Faction' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(factionName);
    await createDialog.getByLabel('Type').selectOption({ label: 'Company' });
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: `Open ${factionName}` })).toBeVisible();

    await page.getByLabel('Filter by type').selectOption({ label: 'Company' });
    await page.getByPlaceholder('Search factions by any field, or a parent faction name...').fill(
      'Night Watch',
    );
    await expect(page.getByRole('button', { name: `Open ${factionName}` })).toBeVisible();

    await page.getByRole('button', { name: `Open ${factionName}` }).click();
    await expect(page.getByRole('heading', { name: factionName, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Faction' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Name *').fill(updatedFactionName);
    await editDialog.getByLabel('Profile').fill('City defense guild.');
    await editDialog.getByRole('button', { name: 'Add Member' }).click();
    const memberCombobox = editDialog.getByRole('combobox', { name: 'Member character' });
    await memberCombobox.click();
    await memberCombobox.fill(characterName);
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: characterName }).click();
    await editDialog.getByLabel('Member role').fill('founder');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: updatedFactionName, level: 1 })).toBeVisible();
    await expect(page.getByText('City defense guild.')).toBeVisible();
    await expect(page.getByText('Founders')).toBeVisible();
    await expect(page.getByRole('link', { name: characterName })).toBeVisible();

    await page.getByRole('link', { name: 'Back to factions' }).click();
    await expect(page.getByRole('button', { name: `Open ${updatedFactionName}` })).toBeVisible();

    const card = page.locator('article[role="button"]').filter({ hasText: updatedFactionName })
      .first();
    await card.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: `Delete "${updatedFactionName}"?` });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No factions yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
