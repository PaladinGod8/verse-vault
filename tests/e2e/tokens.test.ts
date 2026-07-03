import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { closeApp } from './helpers/launchApp';
import {
  clickPainterButton,
  createCampaign,
  createWorld,
  createWorldScopedTokenViaForm,
  ensureWorldsLanding,
  goToTokensPage,
  launchTokensApp,
  paintFootprintAndConfirm,
  PNG_IMAGE_A,
  PNG_IMAGE_B,
  tokenRow,
  tokenRows,
  tokenThumbnailImage,
  waitForFootprintPainter,
} from './helpers/tokens';

let app: ElectronApplication | null = null;
let page: Page | null = null;
let worldId: number | null = null;
let userDataDir: string | null = null;

function requirePageAndWorld(): { page: Page; worldId: number; } {
  if (!page || worldId === null) {
    throw new Error('Expected test page and world to be initialized.');
  }
  return { page, worldId };
}

test.beforeEach(async () => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const launched = await launchTokensApp();
  app = launched.app;
  page = launched.page;
  userDataDir = launched.userDataDir;
  await ensureWorldsLanding(page);
  worldId = await createWorld(page, `E2E Tokens World ${unique}`);
});

test.afterEach(async () => {
  if (page && worldId !== null && !page.isClosed()) {
    await page
      .evaluate(async (existingWorldId) => {
        await window.db.worlds.delete(existingWorldId);
      }, worldId)
      .catch((): undefined => undefined);
  }

  if (app && userDataDir) {
    await closeApp(app, userDataDir);
  } else if (app) {
    await app.close().catch((): undefined => undefined);
  }

  app = null;
  page = null;
  worldId = null;
  userDataDir = null;
});

test.describe('@ux Token CRUD - World-Level', () => {
  test('creates a world-scoped token with uploaded image', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);

    await createWorldScopedTokenViaForm(window, {
      name: 'Uploaded Griffin',
      imageUpload: {
        name: 'griffin.png',
        mimeType: 'image/png',
        buffer: PNG_IMAGE_A,
      },
    });

    const createdRow = tokenRow(window, 'Uploaded Griffin');
    await expect(createdRow).toBeVisible();
    await expect(createdRow.locator('td').nth(3)).toHaveText('World');
    const image = tokenThumbnailImage(createdRow);
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute(
      'src',
      /vv-media:\/\/token-images\/.+\.png$/i,
    );
    await expect(window.getByText('Token created.')).toBeVisible();
  });

  test('creates a world-scoped token', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);

    await createWorldScopedTokenViaForm(window, {
      name: 'Dragon Head',
      imageSrc: 'https://example.com/dragon.png',
      isVisible: true,
    });

    const createdRow = tokenRow(window, 'Dragon Head');
    await expect(createdRow).toBeVisible();
    await expect(createdRow.locator('td').nth(3)).toHaveText('World');
    await expect(window.getByText('Token created.')).toBeVisible();
  });

  test('creates and edits token grid type via form', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);

    await createWorldScopedTokenViaForm(window, {
      name: 'Grid Type Token',
      gridType: 'hex',
    });

    const createdRow = tokenRow(window, 'Grid Type Token');
    await expect(createdRow).toBeVisible();
    await expect(createdRow.locator('td').nth(2)).toHaveText('Hex');

    await createdRow.getByRole('button', { name: 'Edit' }).click();
    const editDialog = window.getByRole('dialog', { name: 'Edit Token' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Grid Type').selectOption('square');
    await editDialog.getByRole('button', { name: /^Save$/ }).click();

    await expect(
      tokenRow(window, 'Grid Type Token').locator('td').nth(2),
    ).toHaveText('Square');
    await expect(window.getByText('Token updated.')).toBeVisible();
  });

  test('footprint painter requires painted cells before confirm', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);

    await window.getByRole('button', { name: 'New Token' }).click();
    const dialog = window.getByRole('dialog', { name: 'New Token' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name').fill('Painter Default Cell Token');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'painter-default.png',
      mimeType: 'image/png',
      buffer: PNG_IMAGE_A,
    });

    const painterDialog = await waitForFootprintPainter(window);
    const confirmButton = painterDialog.getByRole('button', {
      name: 'Confirm',
    });
    // Button is now enabled because default center cell is pre-painted
    await expect(confirmButton).toBeEnabled();
    // Title should be empty since button is enabled
    await expect(confirmButton).toHaveAttribute('title', '');

    await clickPainterButton(painterDialog, 'Cancel');
    await expect(
      window.getByRole('dialog', { name: 'Footprint Painter' }),
    ).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  test('footprint painter cancel does not attach pending upload', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);

    await window.getByRole('button', { name: 'New Token' }).click();
    const dialog = window.getByRole('dialog', { name: 'New Token' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name').fill('Painter Cancel Token');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'painter-cancel.png',
      mimeType: 'image/png',
      buffer: PNG_IMAGE_A,
    });

    const painterDialog = await waitForFootprintPainter(window);
    await clickPainterButton(painterDialog, 'Cancel');
    await expect(
      window.getByRole('dialog', { name: 'Footprint Painter' }),
    ).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Create' }).click();

    const createdRow = tokenRow(window, 'Painter Cancel Token');
    await expect(createdRow).toBeVisible();
    await expect(tokenThumbnailImage(createdRow)).toHaveCount(0);
  });

  test('shows validation error for empty name', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    const rowCountBefore = await window.locator('tbody tr').count();

    await window.getByRole('button', { name: 'New Token' }).click();
    const dialog = window.getByRole('dialog', { name: 'New Token' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog.getByText('Name is required.')).toBeVisible();
    await expect(window.locator('tbody tr')).toHaveCount(rowCountBefore);
  });

  test('edits a token', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Test Edit Token',
    });
    await expect(tokenRow(window, 'Test Edit Token')).toBeVisible();

    await tokenRow(window, 'Test Edit Token')
      .getByRole('button', { name: 'Edit' })
      .click();
    const editDialog = window.getByRole('dialog', { name: 'Edit Token' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Name').fill('Renamed Token');
    await editDialog.getByRole('button', { name: 'Save' }).click();

    await expect(tokenRow(window, 'Renamed Token')).toBeVisible();
    await expect(tokenRows(window, 'Test Edit Token')).toHaveCount(0);
    await expect(window.getByText('Token updated.')).toBeVisible();
  });

  test('replaces token image during edit', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Replace Image Token',
      imageUpload: {
        name: 'old.png',
        mimeType: 'image/png',
        buffer: PNG_IMAGE_A,
      },
    });

    const rowBefore = tokenRow(window, 'Replace Image Token');
    await expect(rowBefore).toBeVisible();
    await expect(tokenThumbnailImage(rowBefore)).toBeVisible();

    await rowBefore.getByRole('button', { name: 'Edit' }).click();
    const dialog = window.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'new.png',
      mimeType: 'image/png',
      buffer: PNG_IMAGE_B,
    });
    await paintFootprintAndConfirm(window);
    await dialog.getByRole('button', { name: /^Save$/ }).click();

    const rowAfter = tokenRow(window, 'Replace Image Token');
    await expect(rowAfter).toBeVisible();
    const imageAfter = tokenThumbnailImage(rowAfter);
    await expect(imageAfter).toBeVisible();
    const afterSrc = await imageAfter.getAttribute('src');
    expect(afterSrc).toBeTruthy();
    expect(afterSrc).toMatch(/vv-media:\/\/token-images\/.+/i);
    await expect(window.getByText('Token updated.')).toBeVisible();
  });

  test('clears token image during edit and shows placeholder', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Clear Image Token',
      imageUpload: {
        name: 'clearable.png',
        mimeType: 'image/png',
        buffer: PNG_IMAGE_A,
      },
    });

    const rowBefore = tokenRow(window, 'Clear Image Token');
    await expect(tokenThumbnailImage(rowBefore)).toHaveCount(1);

    await rowBefore.getByRole('button', { name: 'Edit' }).click();
    const dialog = window.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear image on save' }).click();
    await dialog.getByRole('button', { name: /^Save$/ }).click();

    const rowAfter = tokenRow(window, 'Clear Image Token');
    const imageCell = rowAfter.locator('td').first();
    await expect(imageCell.locator('img')).toHaveCount(0);
    await expect(imageCell.locator('div')).toBeVisible();
    await expect(window.getByText('Token updated.')).toBeVisible();
  });

  test('shows inline validation for invalid upload and keeps token unchanged', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Invalid Upload Guard',
      imageUpload: {
        name: 'guard.png',
        mimeType: 'image/png',
        buffer: PNG_IMAGE_A,
      },
    });
    const existingRow = tokenRow(window, 'Invalid Upload Guard');
    const stableSrc = await tokenThumbnailImage(existingRow).getAttribute('src');
    expect(stableSrc).toBeTruthy();

    await existingRow.getByRole('button', { name: 'Edit' }).click();
    const dialog = window.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not-an-image', 'utf-8'),
    });
    await expect(
      dialog.getByText('Unsupported image type. Use PNG, JPEG, WEBP, or GIF.'),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    const rowAfter = tokenRow(window, 'Invalid Upload Guard');
    await expect(rowAfter).toBeVisible();
    if (!stableSrc) {
      throw new Error('Expected initial thumbnail src to exist.');
    }
    await expect(tokenThumbnailImage(rowAfter)).toHaveAttribute(
      'src',
      stableSrc,
    );
  });

  test('deletes a token', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Delete Me',
    });
    await expect(tokenRow(window, 'Delete Me')).toBeVisible();

    await tokenRow(window, 'Delete Me')
      .getByRole('button', { name: 'Delete' })
      .click();
    const deleteDialog = window.getByRole('dialog', {
      name: 'Delete "Delete Me"?',
    });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(tokenRow(window, 'Delete Me')).toBeVisible();

    await tokenRow(window, 'Delete Me')
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(tokenRows(window, 'Delete Me')).toHaveCount(0);
    await expect(window.getByText('Token deleted.')).toBeVisible();
  });
});

test.describe('@ux Copy to Campaign', () => {
  test('copies a world-scoped token to a campaign', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const campaignName = `E2E Campaign ${unique}`;
    const campaign = await createCampaign(window, targetWorldId, campaignName);
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, { name: 'Torch' });
    await expect(tokenRow(window, 'Torch')).toBeVisible();

    await tokenRow(window, 'Torch')
      .getByRole('button', { name: 'Copy to Campaign' })
      .click();
    const copyDialog = window.getByRole('dialog', {
      name: 'Copy "Torch" to Campaign',
    });
    await expect(copyDialog).toBeVisible();
    await copyDialog.getByLabel('Campaign').selectOption(String(campaign.id));
    await copyDialog.getByRole('button', { name: 'Copy' }).click();

    const torchRows = tokenRows(window, 'Torch');
    await expect(torchRows).toHaveCount(2);
    await expect(
      torchRows.filter({
        has: window
          .locator('td')
          .nth(3)
          .filter({ hasText: /^World$/ }),
      }),
    ).toHaveCount(1);
    await expect(
      torchRows.filter({
        has: window
          .locator('td')
          .nth(3)
          .filter({ hasText: new RegExp(`^Campaign: ${campaignName}$`) }),
      }),
    ).toHaveCount(1);
    await expect(window.getByText('Token copied to campaign.')).toBeVisible();
  });

  test('Copy to Campaign button is absent on campaign-scoped rows', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const campaignName = `E2E Campaign ${unique}`;
    const campaign = await createCampaign(window, targetWorldId, campaignName);
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, { name: 'Torch' });

    await tokenRow(window, 'Torch')
      .getByRole('button', { name: 'Copy to Campaign' })
      .click();
    const copyDialog = window.getByRole('dialog', {
      name: 'Copy "Torch" to Campaign',
    });
    await copyDialog.getByLabel('Campaign').selectOption(String(campaign.id));
    await copyDialog.getByRole('button', { name: 'Copy' }).click();

    const campaignScopedTorchRow = tokenRows(window, 'Torch')
      .filter({ hasText: `Campaign: ${campaignName}` })
      .first();
    await expect(campaignScopedTorchRow).toBeVisible();
    await expect(
      campaignScopedTorchRow.getByRole('button', { name: 'Copy to Campaign' }),
    ).toHaveCount(0);
  });
});

test.describe('@ux Scope Labels', () => {
  test('world-scoped token shows World scope label', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, { name: 'Scope World Token' });

    await expect(
      tokenRow(window, 'Scope World Token').locator('td').nth(3),
    ).toHaveText('World');
  });

  test('campaign-scoped token shows Campaign scope label', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const campaignName = `Scope Campaign ${unique}`;
    const campaign = await createCampaign(window, targetWorldId, campaignName);
    await goToTokensPage(window, targetWorldId);
    await createWorldScopedTokenViaForm(window, {
      name: 'Scope Campaign Token',
    });
    await tokenRow(window, 'Scope Campaign Token')
      .getByRole('button', { name: 'Copy to Campaign' })
      .click();
    const copyDialog = window.getByRole('dialog', {
      name: 'Copy "Scope Campaign Token" to Campaign',
    });
    await copyDialog.getByLabel('Campaign').selectOption(String(campaign.id));
    await copyDialog.getByRole('button', { name: 'Copy' }).click();

    const campaignScopedRow = tokenRows(window, 'Scope Campaign Token')
      .filter({ hasText: `Campaign: ${campaignName}` })
      .first();
    await expect(campaignScopedRow).toBeVisible();
    await expect(campaignScopedRow.locator('td').nth(3)).toHaveText(
      new RegExp(
        `^Campaign: ${campaignName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      ),
    );
  });
});
