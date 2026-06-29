import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createFaction, createWorld, launchElectronApp } from './helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
  'base64',
);

test('@critical @ux character detail supports edit, image persistence, and primary faction flow', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId, worldName } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const characterName = `PC Hero ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/characters`);
    await expect(page.getByRole('heading', { name: worldName, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'New Character' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Character' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(characterName);
    await createDialog.getByLabel('Profile').fill('First draft profile.');
    await createDialog.locator('input[type="checkbox"]').check();
    await createDialog.getByLabel('Owner *').fill('Gator');
    await createDialog.getByLabel('Author').fill('GamingGator');
    await createDialog.getByRole('button', { name: 'Create' }).click();

    await page.getByRole('button', { name: `Open ${characterName}` }).click();
    await expect(page.getByRole('heading', { name: characterName, level: 1 })).toBeVisible();

    const characterUrlMatch = page.url().match(/\/characters\/(\d+)/);
    const characterId = Number(characterUrlMatch?.[1]);
    if (!Number.isInteger(characterId) || characterId <= 0) {
      throw new Error('Unable to resolve created character id from URL.');
    }

    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Character' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Profile').fill('Updated dragonborn profile.');
    await editDialog.getByLabel('Author').fill('Storykeeper');
    await editDialog.getByLabel('Background').fill('Exiled from old tribe.');
    await editDialog.locator('input[type="file"]').setInputFiles({
      name: 'character.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Updated dragonborn profile.')).toBeVisible();
    await expect(page.getByText('Author: Storykeeper')).toBeVisible();
    await expect(page.getByText('Exiled from old tribe.')).toBeVisible();
    await expect(page.getByRole('img', { name: characterName })).toBeVisible();

    const { factionId: firstFactionId, factionName: firstFactionName } = await createFaction(
      page,
      worldId,
      {
        name: `First Faction ${Date.now()}`,
      },
    );
    const { factionId: secondFactionId, factionName: secondFactionName } = await createFaction(
      page,
      worldId,
      {
        name: `Second Faction ${Date.now()}`,
      },
    );

    // Seed memberships here so this spec can exercise character-detail primary-faction UI
    // without duplicating full faction CRUD setup.
    await page.evaluate(
      async ({ nextCharacterId, nextFirstFactionId, nextSecondFactionId }) => {
        await window.db.factionMembers.setForFaction(nextFirstFactionId, [
          { character_id: nextCharacterId, role: 'founder' },
        ]);
        await window.db.factionMembers.setForFaction(nextSecondFactionId, [
          { character_id: nextCharacterId, role: 'member' },
        ]);
      },
      {
        nextCharacterId: characterId,
        nextFirstFactionId: firstFactionId,
        nextSecondFactionId: secondFactionId,
      },
    );

    await page.reload();
    await expect(page.getByRole('heading', { name: characterName, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: firstFactionName })).toBeVisible();
    await expect(page.getByRole('link', { name: secondFactionName })).toBeVisible();

    await page.getByRole('button', { name: `Make primary (${secondFactionName})` }).click();
    const primaryRow = page.locator('li').filter({ hasText: secondFactionName }).first();
    await expect(primaryRow.getByText('Primary')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
