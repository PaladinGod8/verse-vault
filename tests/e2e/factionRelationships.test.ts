import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createFaction, createWorld, launchElectronApp } from './helpers';

test('@critical @ux faction relationships support add, cross-page orientation, edit, and delete', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const { factionId: silverHandId, factionName: silverHandName } = await createFaction(
      page,
      worldId,
      { name: `Silver Hand ${Date.now()}` },
    );
    const { factionName: ashenConcordName } = await createFaction(page, worldId, {
      name: `Ashen Concord ${Date.now()}`,
    });

    await page.goto(`${baseUrl}#/world/${worldId}/factions/${silverHandId}`);
    await expect(page.getByRole('heading', { name: silverHandName, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Add Relationship' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add Relationship' });
    await expect(addDialog).toBeVisible();
    await addDialog.getByLabel('Counterpart').selectOption({ label: ashenConcordName });
    await addDialog.getByLabel('This faction calls them').fill('Rival');
    await addDialog.getByLabel('They call this faction').fill('Rival');
    await addDialog.getByRole('button', { name: 'Create' }).click();

    await expect(addDialog).not.toBeVisible();
    const silverHandRow = page.locator('li').filter({ hasText: ashenConcordName }).first();
    await expect(silverHandRow.getByRole('link', { name: ashenConcordName })).toBeVisible();
    await expect(silverHandRow.getByText('(Rival)')).toBeVisible();

    await silverHandRow.getByRole('link', { name: ashenConcordName }).click();
    await expect(page.getByRole('heading', { name: ashenConcordName, level: 1 })).toBeVisible();
    const ashenConcordRow = page.locator('li').filter({ hasText: silverHandName }).first();
    await expect(ashenConcordRow.getByRole('link', { name: silverHandName })).toBeVisible();
    await expect(ashenConcordRow.getByText('(Rival)')).toBeVisible();

    await ashenConcordRow.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Relationship' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('This faction calls them').fill('Bitter Foe');
    await editDialog.getByLabel('They call this faction').fill('Nuisance');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(editDialog).not.toBeVisible();
    await expect(ashenConcordRow.getByText('(Bitter Foe)')).toBeVisible();

    await ashenConcordRow.getByRole('link', { name: silverHandName }).click();
    await expect(page.getByRole('heading', { name: silverHandName, level: 1 })).toBeVisible();
    const silverHandRowAfterEdit = page.locator('li').filter({ hasText: ashenConcordName })
      .first();
    await expect(silverHandRowAfterEdit.getByText('(Nuisance)')).toBeVisible();

    await silverHandRowAfterEdit.getByRole('button', { name: 'Remove' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Remove relationship' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('No tracked relationships yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
