import { expect, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createCampaign,
  createWorld,
  createWorldScopedToken,
  type E2EAppContext,
  launchElectronApp,
} from './helpers';

// `tokens.moveToCampaign` must keep a token inside its own world. A token carries
// both world_id and campaign_id; attaching it to a campaign that lives in another
// world would strand the same-world invariant that statblock<->token links rely on
// (see statblock-links.test.ts). The repo guards this in a transaction, but only
// real Electron SQLite exercises that path — the mocked-DB unit tests do not.

test.describe.serial('@critical Token campaign-move world scoping', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('moves a token into a campaign in its own world', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { tokenId } = await createWorldScopedToken(page, { name: 'Mover', worldId });

    const moved = await page.evaluate(
      async ({ tId, cId }) => window.db.tokens.moveToCampaign(tId, cId),
      { tId: tokenId, cId: campaignId },
    );
    expect(moved.campaign_id).toBe(campaignId);
    expect(moved.world_id).toBe(worldId);

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
  });

  test('rejects moving a token into a campaign from a different world', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { worldId: otherWorldId } = await createWorld(page);
    const { campaignId: foreignCampaignId } = await createCampaign(page, otherWorldId);
    const { tokenId } = await createWorldScopedToken(page, { name: 'Homebound', worldId });

    const error = await page.evaluate(
      async ({ tId, cId }) => {
        try {
          await window.db.tokens.moveToCampaign(tId, cId);
          return null;
        } catch (err) {
          return (err as Error).message;
        }
      },
      { tId: tokenId, cId: foreignCampaignId },
    );
    expect(error).toContain('same world');

    // The rejected move must leave the token untouched (still world-scoped).
    const token = await page.evaluate(async (id) => window.db.tokens.getById(id), tokenId);
    expect(token?.campaign_id).toBeNull();
    expect(token?.world_id).toBe(worldId);

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
    await page.evaluate(async (id) => window.db.worlds.delete(id), otherWorldId);
  });

  test('moveToWorld clears the campaign scope', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { tokenId } = await createWorldScopedToken(page, { name: 'Roundtrip', worldId });

    await page.evaluate(
      async ({ tId, cId }) => window.db.tokens.moveToCampaign(tId, cId),
      { tId: tokenId, cId: campaignId },
    );
    const detached = await page.evaluate(
      async (id) => window.db.tokens.moveToWorld(id),
      tokenId,
    );
    expect(detached.campaign_id).toBeNull();
    expect(detached.world_id).toBe(worldId);

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
  });
});
