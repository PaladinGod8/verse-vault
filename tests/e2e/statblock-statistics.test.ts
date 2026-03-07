import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { ensureWorldsLanding } from './helpers';
import { closeApp, launchApp } from './helpers/launchApp';

let app: ElectronApplication;
let page: Page;
let userDataDir: string;

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

async function goToStatBlocks(page: Page, worldName: string): Promise<void> {
  await page.getByRole('link', { name: 'StatBlocks' }).click();
  await expect(
    page.getByRole('heading', { name: worldName, level: 1 }),
  ).toBeVisible();
}

async function openCreateStatBlockDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New StatBlock' }).click();
  await expect(
    page.getByRole('dialog', { name: 'New StatBlock' }),
  ).toBeVisible();
}

test.describe('StatBlock Statistics', () => {
  test.beforeAll(async () => {
    const result = await launchApp();
    app = result.app;
    userDataDir = result.userDataDir;
    page = await app.firstWindow();
    await prepareWindow(page);
  });

  test.afterEach(async () => {
    // Close any open modals before navigating away
    const escapeKey = 'Escape';
    await page.keyboard.press(escapeKey);
    await page.waitForTimeout(100);
    await ensureWorldsLanding(page);
  });

  test.afterAll(async () => {
    await closeApp(app, userDataDir);
  });

  test('shows resource inputs in statblock form', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Inputs ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const dialog = page.getByRole('dialog', { name: 'New StatBlock' });
    await expect(dialog.getByText('Hit Points (HP)')).toBeVisible();
    await expect(dialog.getByText('Mana Points (MP)')).toBeVisible();
    await expect(dialog.getByText('Armour Class (AC)')).toBeVisible();
  });

  test('creates a statblock with resource statistics', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Create ${unique}`;
    const statblockName = `Goblin Warrior ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const dialog = page.getByRole('dialog', { name: 'New StatBlock' });
    await dialog.getByLabel('Name').fill(statblockName);
    await dialog.locator('#hp-current').fill('7');
    await dialog.locator('#hp-maximum').fill('7');
    await dialog.locator('#mp-current').fill('5');
    await dialog.locator('#mp-maximum').fill('5');
    await dialog.locator('#ac-current').fill('15');
    await dialog.locator('#ac-maximum').fill('15');

    await dialog.getByRole('button', { name: 'Create statblock' }).click();

    const card = page.locator('div.rounded-xl', {
      has: page.getByRole('heading', { name: statblockName, exact: true }),
    });

    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Edit' }).click();

    const editDialog = page.getByRole('dialog', { name: 'Edit StatBlock' });
    await expect(editDialog.locator('#hp-current')).toHaveValue('7');
    await expect(editDialog.locator('#hp-maximum')).toHaveValue('7');
    await expect(editDialog.locator('#mp-current')).toHaveValue('5');
    await expect(editDialog.locator('#mp-maximum')).toHaveValue('5');
    await expect(editDialog.locator('#ac-current')).toHaveValue('15');
    await expect(editDialog.locator('#ac-maximum')).toHaveValue('15');
  });

  test('displays passive score modifiers from base values', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Modifiers ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const dialog = page.getByRole('dialog', { name: 'New StatBlock' });

    await dialog.locator('#str-base').fill('16');
    await expect(dialog.getByText('+3').first()).toBeVisible();

    await dialog.locator('#dex-base').fill('8');
    await expect(dialog.getByText('-1').first()).toBeVisible();
  });

  test('validates that current resource value cannot exceed maximum', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Validation ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const dialog = page.getByRole('dialog', { name: 'New StatBlock' });
    await dialog.locator('#hp-maximum').fill('10');
    await dialog.locator('#hp-current').fill('15');

    await expect(
      dialog.getByText('Current cannot exceed maximum'),
    ).toBeVisible();

    await dialog.locator('#hp-current').fill('10');
    await expect(
      dialog.getByText('Current cannot exceed maximum'),
    ).toHaveCount(0);
  });

  test('persists statistics values after editing a statblock', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Persist ${unique}`;
    const statblockName = `Wizard ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const createDialog = page.getByRole('dialog', { name: 'New StatBlock' });
    await createDialog.getByLabel('Name').fill(statblockName);
    await createDialog.locator('#hp-current').fill('12');
    await createDialog.locator('#hp-maximum').fill('12');
    await createDialog.locator('#int-base').fill('18');
    await createDialog
      .getByRole('button', { name: 'Create statblock' })
      .click();

    const card = page.locator('div.rounded-xl', {
      has: page.getByRole('heading', { name: statblockName, exact: true }),
    });
    await card.getByRole('button', { name: 'Edit' }).click();

    const editDialog = page.getByRole('dialog', { name: 'Edit StatBlock' });
    await expect(editDialog.locator('#hp-current')).toHaveValue('12');
    await expect(editDialog.locator('#hp-maximum')).toHaveValue('12');
    await expect(editDialog.locator('#int-base')).toHaveValue('18');

    await editDialog.locator('#hp-current').fill('8');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await card.getByRole('button', { name: 'Edit' }).click();
    const reopenedEditDialog = page.getByRole('dialog', {
      name: 'Edit StatBlock',
    });
    await expect(reopenedEditDialog.locator('#hp-current')).toHaveValue('8');
    await expect(reopenedEditDialog.locator('#hp-maximum')).toHaveValue('12');
  });

  test('handles removed world statistics definitions gracefully in edit flow', async () => {
    const unique = Date.now().toString();
    const worldName = `E2E SB Removed Stats ${unique}`;
    const statblockName = `Sorcerer ${unique}`;

    await createAndOpenWorld(page, worldName);
    await goToStatBlocks(page, worldName);
    await openCreateStatBlockDialog(page);

    const createDialog = page.getByRole('dialog', { name: 'New StatBlock' });
    await createDialog.getByLabel('Name').fill(statblockName);
    await createDialog.locator('#mp-current').fill('20');
    await createDialog.locator('#mp-maximum').fill('20');
    await createDialog
      .getByRole('button', { name: 'Create statblock' })
      .click();

    await page.getByRole('link', { name: 'Statistics' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Statistics Configuration',
        level: 1,
      }),
    ).toBeVisible();

    const mpRow = page.locator('tr', {
      has: page.getByRole('cell', { name: 'Mana Points' }),
    });
    await mpRow.getByRole('button', { name: 'Delete' }).click();

    const confirmDialog = page.getByRole('dialog', {
      name: 'Delete "Mana Points"?',
    });
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await page.getByRole('link', { name: 'StatBlocks' }).click();
    const card = page.locator('div.rounded-xl', {
      has: page.getByRole('heading', { name: statblockName, exact: true }),
    });
    await card.getByRole('button', { name: 'Edit' }).click();

    const editDialog = page.getByRole('dialog', { name: 'Edit StatBlock' });
    await expect(editDialog.getByText('Mana Points (MP)')).toHaveCount(0);

    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(
      page.getByRole('heading', { name: statblockName, exact: true }),
    ).toBeVisible();
  });
});
