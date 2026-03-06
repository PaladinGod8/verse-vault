import {
  test,
  expect,
  type ElectronApplication,
  type Locator,
  type Page,
} from '@playwright/test';
import { launchApp, closeApp } from './helpers/launchApp';

let app: ElectronApplication | null = null;
let page: Page | null = null;
let worldId: number | null = null;
let userDataDir: string | null = null;

const PNG_IMAGE_A = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1cAAAAASUVORK5CYII=',
  'base64',
);
const PNG_IMAGE_B = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/C/HwAF/gL+q6KYfwAAAABJRU5ErkJggg==',
  'base64',
);

function tokenRows(window: Page, tokenName: string): Locator {
  return window.locator('tbody tr').filter({ hasText: tokenName });
}

function tokenRow(window: Page, tokenName: string): Locator {
  return tokenRows(window, tokenName).first();
}

function tokenThumbnailImage(row: Locator): Locator {
  return row.locator('td').first().locator('img');
}

function runtimePalette(window: Page): Locator {
  return window
    .locator('section')
    .filter({ hasText: 'Runtime Tokens' })
    .first();
}

function worldTokensSection(window: Page): Locator {
  return window.getByRole('heading', { name: 'World Tokens' }).locator('..');
}

function sceneTokensSection(window: Page): Locator {
  return window
    .getByRole('heading', { name: /Scene Tokens \(\d+\)/ })
    .locator('..');
}

function requirePageAndWorld(): { page: Page; worldId: number } {
  if (!page || worldId === null) {
    throw new Error('Expected test page and world to be initialized.');
  }
  return { page, worldId };
}

async function launchElectronApp(): Promise<Page> {
  const result = await launchApp();
  app = result.app;
  userDataDir = result.userDataDir;

  const firstWindow = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const win =
      BrowserWindow.getAllWindows().find((candidate) => {
        const url = candidate.webContents.getURL();
        return !url.startsWith('devtools://');
      }) ?? BrowserWindow.getAllWindows()[0];
    if (!win) {
      return;
    }
    win.setSize(1440, 960);
    win.center();
    win.focus();
  });

  const start = Date.now();
  let mainWindow: Page | null = null;
  while (Date.now() - start < 12000) {
    const windows = app.windows();
    for (const candidate of windows) {
      if (!candidate.url().startsWith('devtools://')) {
        mainWindow = candidate;
        break;
      }
    }
    if (mainWindow) {
      break;
    }
    await firstWindow.waitForTimeout(100);
  }

  if (!mainWindow) {
    mainWindow = firstWindow;
  }

  await mainWindow.bringToFront();
  await mainWindow.waitForLoadState('domcontentloaded');
  return mainWindow;
}

async function ensureWorldsLanding(window: Page) {
  if (await window.getByRole('button', { name: 'Create world' }).isVisible()) {
    return;
  }

  const backToWorldsLink = window.getByRole('link', { name: 'Back to worlds' });
  if (await backToWorldsLink.isVisible().catch(() => false)) {
    await backToWorldsLink.click();
  } else {
    const backToWorldLink = window.getByRole('link', { name: 'Back to world' });
    if (await backToWorldLink.isVisible().catch(() => false)) {
      await backToWorldLink.click();
    }

    if (await backToWorldsLink.isVisible().catch(() => false)) {
      await backToWorldsLink.click();
    }
  }

  await expect(
    window.getByRole('heading', { name: 'Worlds', level: 1 }),
  ).toBeVisible();
  await expect(
    window.getByRole('button', { name: 'Create world' }),
  ).toBeVisible();
}

async function createWorld(window: Page, name: string): Promise<number> {
  const created = await window.evaluate(async (worldName) => {
    return self.db.worlds.add({ name: worldName });
  }, name);
  return created.id;
}

async function createCampaign(
  window: Page,
  targetWorldId: number,
  name: string,
): Promise<Campaign> {
  return window.evaluate(
    async ({ nextWorldId, campaignName }) =>
      self.db.campaigns.add({
        world_id: nextWorldId,
        name: campaignName,
      }),
    { nextWorldId: targetWorldId, campaignName: name },
  );
}

async function createBattleMap(
  window: Page,
  targetWorldId: number,
  name: string,
): Promise<BattleMap> {
  return window.evaluate(
    async ({ nextWorldId, battleMapName }) =>
      self.db.battlemaps.add({
        world_id: nextWorldId,
        name: battleMapName,
      }),
    { nextWorldId: targetWorldId, battleMapName: name },
  );
}

async function createTokenRecord(
  window: Page,
  input: {
    worldId: number;
    campaignId?: number | null;
    name: string;
    gridType?: TokenGridType;
    imageSrc?: string | null;
    isVisible?: number;
  },
): Promise<Token> {
  return window.evaluate(async (payload) => {
    return self.db.tokens.add({
      world_id: payload.worldId,
      campaign_id: payload.campaignId,
      name: payload.name,
      grid_type: payload.gridType,
      image_src: payload.imageSrc,
      is_visible: payload.isVisible,
    });
  }, input);
}

async function waitForFootprintPainter(window: Page): Promise<Locator> {
  const painterDialog = window.getByRole('dialog', {
    name: 'Footprint Painter',
  });
  await expect(painterDialog).toBeVisible();
  await expect(painterDialog.locator('canvas').first()).toBeVisible();
  return painterDialog;
}

async function clickPainterButton(
  painterDialog: Locator,
  label: 'Confirm' | 'Cancel',
) {
  const button = painterDialog.getByRole('button', { name: label });
  await expect(button).toBeVisible();
  await button.dispatchEvent('click');
}

async function paintFootprintAndConfirm(window: Page) {
  const painterDialog = await waitForFootprintPainter(window);
  const painterCanvas = painterDialog.locator('canvas').first();
  const confirmButton = painterDialog.getByRole('button', { name: 'Confirm' });

  // Click several points to avoid image-fit edge cases across viewport/OS.
  for (const point of [
    { x: 400, y: 300 },
    { x: 300, y: 250 },
    { x: 500, y: 350 },
  ]) {
    await painterCanvas.click({ position: point });
    if (await confirmButton.isEnabled()) {
      break;
    }
  }

  await expect(confirmButton).toBeEnabled();
  await clickPainterButton(painterDialog, 'Confirm');
  await expect(
    window.getByRole('dialog', { name: 'Footprint Painter' }),
  ).toHaveCount(0);
}

async function navigateToHashRoute(window: Page, hashPath: string) {
  const baseUrl = window.url().split('#')[0];
  const normalizedHashPath = hashPath.startsWith('/')
    ? hashPath
    : `/${hashPath}`;
  await window.goto(`${baseUrl}#${normalizedHashPath}`);
}

async function goToTokensPage(window: Page, targetWorldId: number) {
  await navigateToHashRoute(window, `/world/${targetWorldId}/tokens`);
  await expect(window.getByRole('button', { name: 'New Token' })).toBeVisible();
  await window.waitForFunction(() => {
    const bodyText = document.body.textContent ?? '';
    const hasRows = document.querySelectorAll('tbody tr').length > 0;
    return (
      !bodyText.includes('Loading tokens...') &&
      (hasRows || bodyText.includes('No tokens yet.'))
    );
  });
}

async function goToRuntimePage(
  window: Page,
  targetWorldId: number,
  battleMapId: number,
) {
  await navigateToHashRoute(
    window,
    `/world/${targetWorldId}/battlemaps/${battleMapId}/runtime`,
  );
  await expect(
    window.getByRole('heading', { name: 'Runtime Canvas' }),
  ).toBeVisible();
  await expect(
    window.getByRole('heading', { name: 'World Tokens' }),
  ).toBeVisible();
}

async function createWorldScopedTokenViaForm(
  window: Page,
  data: {
    name: string;
    gridType?: TokenGridType;
    imageSrc?: string;
    isVisible?: boolean;
    imageUpload?: { name: string; mimeType: string; buffer: Buffer };
  },
) {
  await window.getByRole('button', { name: 'New Token' }).click();
  const dialog = window.getByRole('dialog', { name: 'New Token' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Name').fill(data.name);
  if (data.gridType !== undefined) {
    await dialog.getByLabel('Grid Type').selectOption(data.gridType);
  }
  if (data.isVisible !== undefined) {
    const visibleCheckbox = dialog.getByRole('checkbox', { name: 'Visible' });
    const isChecked = await visibleCheckbox.isChecked();
    if (isChecked !== data.isVisible) {
      await visibleCheckbox.click();
    }
  }
  if (data.imageUpload) {
    await dialog.locator('input[type="file"]').setInputFiles(data.imageUpload);
    await paintFootprintAndConfirm(window);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
}

test.beforeEach(async () => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  page = await launchElectronApp();
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

test.describe('Token CRUD - World-Level', () => {
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
    const stableSrc =
      await tokenThumbnailImage(existingRow).getAttribute('src');
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

test.describe('Copy to Campaign', () => {
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

test.describe('Scope Labels', () => {
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

test.describe('Runtime Palette - World Tokens', () => {
  test('world tokens section appears in the runtime palette', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const battleMap = await createBattleMap(
      window,
      targetWorldId,
      `Runtime BattleMap ${unique}`,
    );
    const tokenName = `Runtime World Token ${unique}`;
    await createTokenRecord(window, {
      worldId: targetWorldId,
      name: tokenName,
      isVisible: 1,
    });

    await goToRuntimePage(window, targetWorldId, battleMap.id);
    await expect(
      runtimePalette(window).getByRole('heading', { name: 'World Tokens' }),
    ).toBeVisible();
    await expect(worldTokensSection(window).getByText(tokenName)).toBeVisible();
  });

  test('invisible world tokens are hidden when showInvisibleTokens is off', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const battleMap = await createBattleMap(
      window,
      targetWorldId,
      `Runtime BattleMap ${unique}`,
    );
    const invisibleTokenName = `Invisible World Token ${unique}`;
    await createTokenRecord(window, {
      worldId: targetWorldId,
      name: invisibleTokenName,
      isVisible: 0,
    });

    await goToRuntimePage(window, targetWorldId, battleMap.id);

    const toggle = runtimePalette(window).getByRole('checkbox', {
      name: 'Show invisible tokens',
    });
    const invisibleTokenRow = worldTokensSection(window)
      .locator('li')
      .filter({ hasText: invisibleTokenName });

    await expect(invisibleTokenRow).toHaveCount(1);
    await toggle.click();
    await expect(invisibleTokenRow).toHaveCount(0);
    await toggle.click();
    await expect(invisibleTokenRow).toHaveCount(1);
  });

  test('clicking Add on a world token places it in the scene', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const battleMap = await createBattleMap(
      window,
      targetWorldId,
      `Runtime BattleMap ${unique}`,
    );
    const tokenName = `Addable World Token ${unique}`;
    await createTokenRecord(window, {
      worldId: targetWorldId,
      name: tokenName,
      isVisible: 1,
    });

    await goToRuntimePage(window, targetWorldId, battleMap.id);

    await worldTokensSection(window)
      .locator('li')
      .filter({ hasText: tokenName })
      .first()
      .getByRole('button', { name: 'Add' })
      .click();

    await expect(
      runtimePalette(window).getByRole('heading', { name: 'Scene Tokens (1)' }),
    ).toBeVisible();
    await expect(
      sceneTokensSection(window).locator('li').filter({ hasText: tokenName }),
    ).toHaveCount(1);
  });

  test('hover preview appears for token with image_src', async () => {
    const { page: window, worldId: targetWorldId } = requirePageAndWorld();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const battleMap = await createBattleMap(
      window,
      targetWorldId,
      `Runtime BattleMap ${unique}`,
    );
    const tokenName = `Preview World Token ${unique}`;
    const imageSrc = `https://example.com/token-preview-${unique}.png`;
    await createTokenRecord(window, {
      worldId: targetWorldId,
      name: tokenName,
      imageSrc,
      isVisible: 1,
    });

    await goToRuntimePage(window, targetWorldId, battleMap.id);

    const tokenListItem = worldTokensSection(window)
      .locator('li')
      .filter({ hasText: tokenName })
      .first();
    await expect(tokenListItem).toBeVisible();
    await tokenListItem.hover();

    const previewImage = window.locator(`img[src="${imageSrc}"]`);
    await expect(previewImage).toBeVisible();

    await window.getByRole('heading', { name: 'Runtime Canvas' }).hover();
    await expect(previewImage).toHaveCount(0);
  });
});
