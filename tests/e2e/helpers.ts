import {
  expect,
  type ElectronApplication,
  type Locator,
  type Page,
} from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

export interface E2EAppContext {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
}

export async function launchElectronApp(): Promise<E2EAppContext> {
  const { app, userDataDir } = await launchApp();
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
  let page: Page | null = null;
  while (Date.now() - start < 5000) {
    const windows = app.windows();
    for (const candidate of windows) {
      const url = candidate.url();
      if (!url.startsWith('devtools://')) {
        page = candidate;
        break;
      }
    }
    if (page) {
      break;
    }
    await firstWindow.waitForTimeout(100);
  }

  if (!page) {
    page = firstWindow;
  }

  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');

  return { app, page, userDataDir };
}

export async function cleanupElectronApp(
  context: E2EAppContext,
): Promise<void> {
  await closeApp(context.app, context.userDataDir);
}

export async function ensureWorldsLanding(page: Page): Promise<void> {
  if (await page.getByRole('button', { name: 'Create world' }).isVisible()) {
    return;
  }

  const backToWorldsLink = page.getByRole('link', { name: 'Back to worlds' });
  if (await backToWorldsLink.isVisible().catch(() => false)) {
    await backToWorldsLink.click();
  } else {
    const backToWorldLink = page.getByRole('link', { name: 'Back to world' });
    if (await backToWorldLink.isVisible().catch(() => false)) {
      await backToWorldLink.click();
    }

    if (await backToWorldsLink.isVisible().catch(() => false)) {
      await backToWorldsLink.click();
    }
  }

  await expect(
    page.getByRole('heading', { name: 'Worlds', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create world' }),
  ).toBeVisible();
}

export async function createWorld(
  page: Page,
  worldName = `E2E World ${Date.now()}`,
): Promise<{ worldId: number; worldName: string }> {
  const created = await page.evaluate(async (name) => {
    return window.db.worlds.add({ name });
  }, worldName);

  return {
    worldId: created.id,
    worldName,
  };
}

export async function deleteWorld(page: Page, worldId: number): Promise<void> {
  await page
    .evaluate(async (id) => {
      await window.db.worlds.delete(id);
    }, worldId)
    .catch((): undefined => undefined);
}

export async function createCampaign(
  page: Page,
  worldId: number,
  campaignName = `E2E Campaign ${Date.now()}`,
): Promise<{ campaignId: number; campaignName: string }> {
  const campaign = await page.evaluate(
    async ({ nextWorldId, nextCampaignName }) => {
      return window.db.campaigns.add({
        world_id: nextWorldId,
        name: nextCampaignName,
      });
    },
    { nextWorldId: worldId, nextCampaignName: campaignName },
  );

  return {
    campaignId: campaign.id,
    campaignName,
  };
}

export async function deleteCampaign(
  page: Page,
  campaignId: number,
): Promise<void> {
  await page.evaluate(async (id) => {
    await window.db.campaigns.delete(id);
  }, campaignId);
}

function inferWorldIdFromUrl(page: Page): number {
  const match = page.url().match(/#\/world\/(\d+)\//);
  if (!match) {
    throw new Error(
      'Unable to infer worldId from URL. Pass worldId explicitly.',
    );
  }
  return Number(match[1]);
}

export async function createWorldScopedToken(
  page: Page,
  input: {
    name: string;
    worldId?: number;
    imageSrc?: string | null;
    isVisible?: number;
  },
): Promise<{ tokenId: number; tokenName: string }> {
  const worldId = input.worldId ?? inferWorldIdFromUrl(page);
  const token = await page.evaluate(
    async (payload) => {
      return window.db.tokens.add({
        world_id: payload.worldId,
        campaign_id: null,
        name: payload.name,
        image_src: payload.imageSrc,
        is_visible: payload.isVisible,
      });
    },
    {
      worldId,
      name: input.name,
      imageSrc: input.imageSrc ?? null,
      isVisible: input.isVisible ?? 1,
    },
  );

  return { tokenId: token.id, tokenName: token.name };
}

export async function createCampaignScopedToken(
  page: Page,
  campaignId: number,
  input: {
    name: string;
    worldId?: number;
    imageSrc?: string | null;
    isVisible?: number;
  },
): Promise<{ tokenId: number; tokenName: string }> {
  const worldId = input.worldId ?? inferWorldIdFromUrl(page);
  const token = await page.evaluate(
    async (payload) => {
      return window.db.tokens.add({
        world_id: payload.worldId,
        campaign_id: payload.campaignId,
        name: payload.name,
        image_src: payload.imageSrc,
        is_visible: payload.isVisible,
      });
    },
    {
      worldId,
      campaignId,
      name: input.name,
      imageSrc: input.imageSrc ?? null,
      isVisible: input.isVisible ?? 1,
    },
  );

  return { tokenId: token.id, tokenName: token.name };
}

export async function goToTokensPage(
  page: Page,
  worldId: number,
): Promise<void> {
  const baseUrl = page.url().split('#')[0];
  await page.goto(`${baseUrl}#/world/${worldId}/tokens`);
  await expect(page.getByRole('button', { name: 'New Token' })).toBeVisible();
  await page.waitForFunction(() => {
    const bodyText = document.body.textContent ?? '';
    const hasRows = document.querySelectorAll('tbody tr').length > 0;
    return (
      !bodyText.includes('Loading tokens...') &&
      (hasRows || bodyText.includes('No tokens yet.'))
    );
  });
}

export function tokenRow(page: Page, tokenName: string): Locator {
  return page.locator('tbody tr').filter({ hasText: tokenName }).first();
}

export function getMoveButton(
  page: Page,
  tokenName: string,
  moveType: 'to-campaign' | 'to-world',
): Locator {
  const label =
    moveType === 'to-campaign' ? 'Move to Campaign' : 'Move to World';
  return tokenRow(page, tokenName).getByRole('button', { name: label });
}

export async function selectCampaignInMoveDialog(
  page: Page,
  campaignName: string,
): Promise<void> {
  const select = page.getByLabel('Target Campaign');
  await select.selectOption({ label: campaignName });
}
