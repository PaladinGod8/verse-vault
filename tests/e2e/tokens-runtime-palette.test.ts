import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { closeApp } from './helpers/launchApp';
import {
  createBattleMap,
  createTokenRecord,
  createWorld,
  ensureWorldsLanding,
  goToRuntimePage,
  importTokenImage,
  launchTokensApp,
  PNG_IMAGE_A,
  runtimePalette,
  sceneTokensSection,
  worldTokensSection,
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
  worldId = await createWorld(page, `E2E Tokens Runtime World ${unique}`);
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

test.describe('@runtime Runtime Palette - World Tokens', () => {
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
    const imageSrc = await importTokenImage(window, {
      fileName: `token-preview-${unique}.png`,
      mimeType: 'image/png',
      buffer: PNG_IMAGE_A,
    });
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
