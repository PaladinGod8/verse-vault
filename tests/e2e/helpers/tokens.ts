import { type ElectronApplication, expect, type Locator, type Page } from '@playwright/test';
import { launchApp } from './launchApp';

export const PNG_IMAGE_A = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1cAAAAASUVORK5CYII=',
  'base64',
);
export const PNG_IMAGE_B = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/C/HwAF/gL+q6KYfwAAAABJRU5ErkJggg==',
  'base64',
);

export function tokenRows(window: Page, tokenName: string): Locator {
  return window.locator('tbody tr').filter({ hasText: tokenName });
}

export function tokenRow(window: Page, tokenName: string): Locator {
  return tokenRows(window, tokenName).first();
}

export function tokenThumbnailImage(row: Locator): Locator {
  return row.locator('td').first().locator('img');
}

export function runtimePalette(window: Page): Locator {
  return window
    .locator('section')
    .filter({ hasText: 'Runtime Tokens' })
    .first();
}

export function worldTokensSection(window: Page): Locator {
  return window.getByRole('heading', { name: 'World Tokens' }).locator('..');
}

export function sceneTokensSection(window: Page): Locator {
  return window
    .getByRole('heading', { name: /Scene Tokens \(\d+\)/ })
    .locator('..');
}

/**
 * Launches the app with a fixed 1440x960 window size — the footprint painter
 * tests click at fixed pixel coordinates relative to the canvas and need a
 * deterministic viewport.
 */
export async function launchTokensApp(): Promise<
  { app: ElectronApplication; page: Page; userDataDir: string; }
> {
  const result = await launchApp();
  const app = result.app;
  const userDataDir = result.userDataDir;

  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((candidate) => {
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

  await expect
    .poll(
      () => app?.windows().some((candidate) => !candidate.url().startsWith('devtools://')),
      { timeout: 12000 },
    )
    .toBe(true);

  const mainWindow = app.windows().find(
    (candidate) => !candidate.url().startsWith('devtools://'),
  ) ?? await app.firstWindow();

  await mainWindow.bringToFront();
  await mainWindow.waitForLoadState('domcontentloaded');
  return { app, page: mainWindow, userDataDir };
}

export async function ensureWorldsLanding(window: Page): Promise<void> {
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

export async function createWorld(window: Page, name: string): Promise<number> {
  const created = await window.evaluate(async (worldName) => {
    return self.db.worlds.add({ name: worldName });
  }, name);
  return created.id;
}

export async function createCampaign(
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

export async function createBattleMap(
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

export async function createTokenRecord(
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

export async function importTokenImage(
  window: Page,
  input: { fileName: string; mimeType: string; buffer: Buffer; },
): Promise<string> {
  const result = await window.evaluate(async (payload) => {
    return self.db.tokens.importImage({
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      bytes: new Uint8Array(payload.bytes),
    });
  }, {
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: [...input.buffer],
  });

  return result.image_src;
}

export async function waitForFootprintPainter(window: Page): Promise<Locator> {
  const painterDialog = window.getByRole('dialog', {
    name: 'Footprint Painter',
  });
  await expect(painterDialog).toBeVisible();
  await expect(painterDialog.locator('canvas').first()).toBeVisible();
  return painterDialog;
}

export async function clickPainterButton(
  painterDialog: Locator,
  label: 'Confirm' | 'Cancel',
): Promise<void> {
  const button = painterDialog.getByRole('button', { name: label });
  await expect(button).toBeVisible();
  await button.dispatchEvent('click');
}

export async function paintFootprintAndConfirm(window: Page): Promise<void> {
  const painterDialog = await waitForFootprintPainter(window);
  const painterCanvas = painterDialog.locator('canvas').first();
  const confirmButton = painterDialog.getByRole('button', { name: 'Confirm' });

  // Click several points to avoid image-fit edge cases across viewport/OS.
  for (
    const point of [
      { x: 400, y: 300 },
      { x: 300, y: 250 },
      { x: 500, y: 350 },
    ]
  ) {
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

export async function navigateToHashRoute(window: Page, hashPath: string): Promise<void> {
  const baseUrl = window.url().split('#')[0];
  const normalizedHashPath = hashPath.startsWith('/')
    ? hashPath
    : `/${hashPath}`;
  await window.goto(`${baseUrl}#${normalizedHashPath}`);
}

export async function goToTokensPage(window: Page, targetWorldId: number): Promise<void> {
  await navigateToHashRoute(window, `/world/${targetWorldId}/tokens`);
  await expect(window.getByRole('button', { name: 'New Token' })).toBeVisible();
  await window.waitForFunction(() => {
    const bodyText = document.body.textContent ?? '';
    const hasRows = document.querySelectorAll('tbody tr').length > 0;
    return (
      !bodyText.includes('Loading tokens...')
      && (hasRows || bodyText.includes('No tokens yet.'))
    );
  });
}

export async function goToRuntimePage(
  window: Page,
  targetWorldId: number,
  battleMapId: number,
): Promise<void> {
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

export async function createWorldScopedTokenViaForm(
  window: Page,
  data: {
    name: string;
    gridType?: TokenGridType;
    imageSrc?: string;
    isVisible?: boolean;
    imageUpload?: { name: string; mimeType: string; buffer: Buffer; };
  },
): Promise<void> {
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
