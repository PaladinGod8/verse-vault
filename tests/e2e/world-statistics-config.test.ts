import { expect, type Page, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

async function prepareWindow(page: Page): Promise<void> {
  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');
}

async function createAndOpenWorld(
  page: Page,
  worldName: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Create world' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Create world' });
  await expect(createDialog).toBeVisible();

  await createDialog.getByLabel('Name').fill(worldName);
  await createDialog
    .getByRole('button', { name: 'Create world', exact: true })
    .click();

  const openWorldButton = page.getByRole('button', {
    name: `Open ${worldName}`,
  });
  await expect(openWorldButton).toBeVisible();
  await openWorldButton.click();

  await expect(
    page.getByRole('heading', { name: 'World Overview', level: 1 }),
  ).toBeVisible();
}

async function openStatisticsConfiguration(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Statistics' }).click();
  await expect(
    page.getByRole('heading', { name: 'Statistics Configuration', level: 1 }),
  ).toBeVisible();
}

test.describe('World Statistics Configuration', () => {
  test('shows default resource and passive score definitions for a new world', async () => {
    const { app, userDataDir } = await launchApp();

    try {
      const page = await app.firstWindow();
      await prepareWindow(page);

      const unique = Date.now().toString();
      const worldName = `E2E Stats Defaults ${unique}`;

      await createAndOpenWorld(page, worldName);
      await openStatisticsConfiguration(page);

      await expect(
        page.getByRole('cell', { name: 'Hit Points' }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'HP', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'Mana Points' }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'MP', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'Armour Class' }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'AC', exact: true }),
      ).toBeVisible();

      await expect(page.getByRole('cell', { name: 'Strength' })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'STR', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Dexterity' })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'Proficiency Bonus' }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'pb', exact: true }),
      ).toBeVisible();
    } finally {
      await closeApp(app, userDataDir);
    }
  });

  test('adds a custom resource definition', async () => {
    const { app, userDataDir } = await launchApp();

    try {
      const page = await app.firstWindow();
      await prepareWindow(page);

      const unique = Date.now().toString();
      const worldName = `E2E Add Resource ${unique}`;

      await createAndOpenWorld(page, worldName);
      await openStatisticsConfiguration(page);

      await page.getByRole('button', { name: 'Add Resource' }).click();
      const createResourceDialog = page.getByRole('dialog', {
        name: 'Create Resource',
      });
      await expect(createResourceDialog).toBeVisible();

      await createResourceDialog.getByLabel('ID').fill('ki_points');
      await createResourceDialog.getByLabel('Name').fill('Ki Points');
      await createResourceDialog.getByLabel('Abbreviation').fill('KI');
      await createResourceDialog
        .getByLabel('Description')
        .fill('Monk energy resource');
      await createResourceDialog
        .getByRole('button', { name: 'Create' })
        .click();

      await expect(
        page.getByRole('cell', { name: 'ki_points', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Ki Points' })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'KI', exact: true }),
      ).toBeVisible();
    } finally {
      await closeApp(app, userDataDir);
    }
  });

  test('edits an existing resource definition', async () => {
    const { app, userDataDir } = await launchApp();

    try {
      const page = await app.firstWindow();
      await prepareWindow(page);

      const unique = Date.now().toString();
      const worldName = `E2E Edit Resource ${unique}`;

      await createAndOpenWorld(page, worldName);
      await openStatisticsConfiguration(page);

      const hpRow = page.locator('tr', {
        has: page.getByRole('cell', { name: 'Hit Points' }),
      });
      await hpRow.getByRole('button', { name: 'Edit' }).click();

      const editDialog = page.getByRole('dialog', { name: 'Edit Resource' });
      await expect(editDialog).toBeVisible();

      await editDialog.getByLabel('Name').fill('Health Points');
      await editDialog
        .getByLabel('Description')
        .fill('Total health of the character');
      await editDialog.getByRole('button', { name: 'Save' }).click();

      await expect(
        page.getByRole('cell', { name: 'Health Points' }),
      ).toBeVisible();

      const updatedRow = page.locator('tr', {
        has: page.getByRole('cell', { name: 'Health Points' }),
      });
      await updatedRow.getByRole('button', { name: 'Edit' }).click();

      const reopenedDialog = page.getByRole('dialog', {
        name: 'Edit Resource',
      });
      await expect(reopenedDialog.getByLabel('Description')).toHaveValue(
        'Total health of the character',
      );
    } finally {
      await closeApp(app, userDataDir);
    }
  });

  test('deletes a resource definition', async () => {
    const { app, userDataDir } = await launchApp();

    try {
      const page = await app.firstWindow();
      await prepareWindow(page);

      const unique = Date.now().toString();
      const worldName = `E2E Delete Resource ${unique}`;

      await createAndOpenWorld(page, worldName);
      await openStatisticsConfiguration(page);

      const mpRow = page.locator('tr', {
        has: page.getByRole('cell', { name: 'Mana Points' }),
      });
      await mpRow.getByRole('button', { name: 'Delete' }).click();

      const confirmDialog = page.getByRole('dialog', {
        name: 'Delete "Mana Points"?',
      });
      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByRole('cell', { name: 'Mana Points' })).toHaveCount(
        0,
      );
      await expect(page.getByRole('cell', { name: 'MP' })).toHaveCount(0);
      await expect(
        page.getByRole('cell', { name: 'Hit Points' }),
      ).toBeVisible();
    } finally {
      await closeApp(app, userDataDir);
    }
  });

  test('adds a custom passive score definition', async () => {
    const { app, userDataDir } = await launchApp();

    try {
      const page = await app.firstWindow();
      await prepareWindow(page);

      const unique = Date.now().toString();
      const worldName = `E2E Add Passive ${unique}`;

      await createAndOpenWorld(page, worldName);
      await openStatisticsConfiguration(page);

      await page.getByRole('button', { name: 'Add Passive Score' }).click();
      const createPassiveDialog = page.getByRole('dialog', {
        name: 'Create Passive Score',
      });
      await expect(createPassiveDialog).toBeVisible();

      await createPassiveDialog.getByLabel('ID').fill('luck');
      await createPassiveDialog.getByLabel('Name').fill('Luck');
      await createPassiveDialog.getByLabel('Abbreviation').fill('LCK');
      await createPassiveDialog
        .getByLabel('Type')
        .selectOption('ability_score');
      await createPassiveDialog
        .getByLabel('Description')
        .fill('Fortune favors the lucky');
      await createPassiveDialog.getByRole('button', { name: 'Create' }).click();

      await expect(
        page.getByRole('cell', { name: 'Luck', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'LCK', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'luck', exact: true }),
      ).toBeVisible();
    } finally {
      await closeApp(app, userDataDir);
    }
  });
});
