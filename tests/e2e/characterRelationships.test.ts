import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createCharacter, createWorld, launchElectronApp } from './helpers';

test('@critical @ux character relationships support add, cross-page orientation, edit, and delete', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const { characterId: myraId, characterName: myraName } = await createCharacter(
      page,
      worldId,
      { name: `Myra ${Date.now()}` },
    );
    const { characterName: agnesName } = await createCharacter(page, worldId, {
      name: `Agnes ${Date.now()}`,
    });

    await page.goto(`${baseUrl}#/world/${worldId}/characters/${myraId}`);
    await expect(page.getByRole('heading', { name: myraName, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Add Relationship' }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add Relationship' });
    await expect(addDialog).toBeVisible();
    const counterpartCombobox = addDialog.getByRole('combobox', { name: 'Member character' });
    await counterpartCombobox.click();
    await counterpartCombobox.fill(agnesName);
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: agnesName }).click();
    await addDialog.getByLabel('This character calls them').fill('Mentor');
    await addDialog.getByLabel('They call this character').fill('Student');
    await addDialog.getByRole('button', { name: 'Create' }).click();

    await expect(addDialog).not.toBeVisible();
    const myraRow = page.locator('li').filter({ hasText: agnesName }).first();
    await expect(myraRow.getByRole('link', { name: agnesName })).toBeVisible();
    await expect(myraRow.getByText('(Mentor)')).toBeVisible();

    await myraRow.getByRole('link', { name: agnesName }).click();
    await expect(page.getByRole('heading', { name: agnesName, level: 1 })).toBeVisible();
    const agnesRow = page.locator('li').filter({ hasText: myraName }).first();
    await expect(agnesRow.getByRole('link', { name: myraName })).toBeVisible();
    await expect(agnesRow.getByText('(Student)')).toBeVisible();

    await agnesRow.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Relationship' });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByLabel('This character calls them')).toHaveValue('Student');
    await expect(editDialog.getByLabel('They call this character')).toHaveValue('Mentor');
    await editDialog.getByLabel('This character calls them').fill('Old Friend');
    await editDialog.getByLabel('They call this character').fill('Confidant');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(editDialog).not.toBeVisible();
    await expect(agnesRow.getByText('(Old Friend)')).toBeVisible();

    await agnesRow.getByRole('link', { name: myraName }).click();
    await expect(page.getByRole('heading', { name: myraName, level: 1 })).toBeVisible();
    const myraRowAfterEdit = page.locator('li').filter({ hasText: agnesName }).first();
    await expect(myraRowAfterEdit.getByText('(Confidant)')).toBeVisible();

    await myraRowAfterEdit.getByRole('button', { name: 'Remove' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Remove relationship' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('No tracked relationships yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
