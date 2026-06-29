import { type ElectronApplication, expect, type Locator, type Page } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

export interface E2EAppContext {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
}

function findMainWindow(app: ElectronApplication): Page | null {
  return app.windows().find((candidate) => !candidate.url().startsWith('devtools://')) ?? null;
}

export async function launchElectronApp(): Promise<E2EAppContext> {
  const { app, userDataDir } = await launchApp();

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
    .poll(() => Boolean(findMainWindow(app)), { timeout: 5000 })
    .toBe(true);

  const page = findMainWindow(app) ?? await app.firstWindow();

  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByRole('heading', { name: 'Worlds', level: 1 }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('button', { name: 'Create world' }),
  ).toBeVisible({ timeout: 15000 });

  return { app, page, userDataDir };
}

export async function cleanupElectronApp(
  context: E2EAppContext,
): Promise<void> {
  await closeApp(context.app, context.userDataDir);
}

export async function waitForAnimationFrames(
  page: Page,
  frameCount = 2,
): Promise<void> {
  await page.evaluate(async (count) => {
    for (let frame = 0; frame < count; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }, frameCount);
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

  // Fallback: if back-nav links weren't present (e.g. CI timing), navigate directly.
  if (!(await page.getByRole('button', { name: 'Create world' }).isVisible())) {
    const baseUrl = page.url().split('#')[0];
    await page.goto(`${baseUrl}#/`);
  }

  await expect(
    page.getByRole('heading', { name: 'Worlds', level: 1 }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('button', { name: 'Create world' }),
  ).toBeVisible({ timeout: 15000 });
}

export async function createWorld(
  page: Page,
  worldName = `E2E World ${Date.now()}`,
): Promise<{ worldId: number; worldName: string; }> {
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
): Promise<{ campaignId: number; campaignName: string; }> {
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

export async function createArc(
  page: Page,
  campaignId: number,
  arcName = `E2E Arc ${Date.now()}`,
): Promise<{ arcId: number; arcName: string; }> {
  const arc = await page.evaluate(
    async ({ nextCampaignId, nextArcName }) => {
      return window.db.arcs.add({
        campaign_id: nextCampaignId,
        name: nextArcName,
      });
    },
    { nextCampaignId: campaignId, nextArcName: arcName },
  );

  return {
    arcId: arc.id,
    arcName,
  };
}

export async function createAct(
  page: Page,
  arcId: number,
  actName = `E2E Act ${Date.now()}`,
): Promise<{ actId: number; actName: string; }> {
  const act = await page.evaluate(
    async ({ nextArcId, nextActName }) => {
      return window.db.acts.add({
        arc_id: nextArcId,
        name: nextActName,
      });
    },
    { nextArcId: arcId, nextActName: actName },
  );

  return {
    actId: act.id,
    actName,
  };
}

export async function createSession(
  page: Page,
  actId: number,
  sessionName = `E2E Session ${Date.now()}`,
): Promise<{ sessionId: number; sessionName: string; }> {
  const session = await page.evaluate(
    async ({ nextActId, nextSessionName }) => {
      return window.db.sessions.add({
        act_id: nextActId,
        name: nextSessionName,
      });
    },
    { nextActId: actId, nextSessionName: sessionName },
  );

  return {
    sessionId: session.id,
    sessionName,
  };
}

export async function createScene(
  page: Page,
  sessionId: number,
  sceneName = `E2E Scene ${Date.now()}`,
): Promise<{ sceneId: number; sceneName: string; }> {
  const scene = await page.evaluate(
    async ({ nextSessionId, nextSceneName }) => {
      return window.db.scenes.add({
        session_id: nextSessionId,
        name: nextSceneName,
      });
    },
    { nextSessionId: sessionId, nextSceneName: sceneName },
  );

  return {
    sceneId: scene.id,
    sceneName,
  };
}

export async function createCharacter(
  page: Page,
  worldId: number,
  input: {
    name: string;
    profile?: string | null;
    isPlayerCharacter?: boolean;
    owner?: string | null;
    author?: string | null;
    imageSrc?: string | null;
  },
): Promise<{ characterId: number; characterName: string; }> {
  const character = await page.evaluate(
    async (payload) => {
      return window.db.characters.add({
        world_id: payload.worldId,
        name: payload.name,
        profile: payload.profile ?? null,
        is_player_character: payload.isPlayerCharacter ? 1 : 0,
        owner: payload.isPlayerCharacter ? payload.owner ?? null : null,
        author: payload.author ?? null,
        image_src: payload.imageSrc ?? null,
        sections: '{}',
        wiki_summary: '{}',
      });
    },
    {
      worldId,
      name: input.name,
      profile: input.profile ?? null,
      isPlayerCharacter: input.isPlayerCharacter ?? false,
      owner: input.owner ?? null,
      author: input.author ?? null,
      imageSrc: input.imageSrc ?? null,
    },
  );

  return {
    characterId: character.id,
    characterName: character.name,
  };
}

export async function createFactionType(
  page: Page,
  worldId: number,
  typeName = `E2E Type ${Date.now()}`,
): Promise<{ factionTypeId: number; typeName: string; }> {
  const factionType = await page.evaluate(
    async ({ nextWorldId, nextTypeName }) => {
      return window.db.factionTypes.add({
        world_id: nextWorldId,
        name: nextTypeName,
      });
    },
    { nextWorldId: worldId, nextTypeName: typeName },
  );

  return {
    factionTypeId: factionType.id,
    typeName,
  };
}

export async function createFaction(
  page: Page,
  worldId: number,
  input: {
    name: string;
    profile?: string | null;
    typeId?: number | null;
    parentFactionId?: number | null;
    imageSrc?: string | null;
  },
): Promise<{ factionId: number; factionName: string; }> {
  const faction = await page.evaluate(
    async (payload) => {
      return window.db.factions.add({
        world_id: payload.worldId,
        name: payload.name,
        profile: payload.profile ?? null,
        image_src: payload.imageSrc ?? null,
        sections: '{}',
        wiki_summary: '{}',
        type_id: payload.typeId ?? null,
        parent_faction_id: payload.parentFactionId ?? null,
      });
    },
    {
      worldId,
      name: input.name,
      profile: input.profile ?? null,
      typeId: input.typeId ?? null,
      parentFactionId: input.parentFactionId ?? null,
      imageSrc: input.imageSrc ?? null,
    },
  );

  return {
    factionId: faction.id,
    factionName: faction.name,
  };
}

export async function createLevel(
  page: Page,
  worldId: number,
  input: {
    name: string;
    category: string;
    description?: string | null;
  },
): Promise<{ levelId: number; levelName: string; }> {
  const level = await page.evaluate(
    async (payload) => {
      return window.db.levels.add({
        world_id: payload.worldId,
        name: payload.name,
        category: payload.category,
        description: payload.description ?? null,
      });
    },
    {
      worldId,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
    },
  );

  return {
    levelId: level.id,
    levelName: level.name,
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
): Promise<{ tokenId: number; tokenName: string; }> {
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
): Promise<{ tokenId: number; tokenName: string; }> {
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
      !bodyText.includes('Loading tokens...')
      && (hasRows || bodyText.includes('No tokens yet.'))
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
  const label = moveType === 'to-campaign' ? 'Move to Campaign' : 'Move to World';
  return tokenRow(page, tokenName).getByRole('button', { name: label });
}

export async function selectCampaignInMoveDialog(
  page: Page,
  campaignName: string,
): Promise<void> {
  const select = page.getByLabel('Target Campaign');
  await select.selectOption({ label: campaignName });
}
