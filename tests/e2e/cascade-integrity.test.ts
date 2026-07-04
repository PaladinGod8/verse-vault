import { expect, type Page, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createAct,
  createArc,
  createCampaign,
  createCampaignScopedToken,
  createCharacter,
  createFaction,
  createFactionType,
  createLevel,
  createScene,
  createSession,
  createWorld,
  createWorldScopedToken,
  type E2EAppContext,
  launchElectronApp,
} from './helpers';

// These specs exercise SQLite `ON DELETE CASCADE` / `SET NULL` behavior end to
// end through the real IPC handlers. That path only runs inside Electron
// (better-sqlite3 is built for the Electron ABI and `PRAGMA foreign_keys = ON`
// is set in src/database/db.ts), so the mocked-DB unit tests cannot cover it.
// A regression here means orphaned rows survive a parent delete.

async function addAbility(page: Page, worldId: number): Promise<number> {
  return page.evaluate(async (id) => {
    const ability = await window.db.abilities.add({
      world_id: id,
      name: `Cascade Ability ${Date.now()}`,
      type: 'active',
    });
    return ability.id;
  }, worldId);
}

async function addStatBlock(page: Page, worldId: number): Promise<number> {
  return page.evaluate(async (id) => {
    const statblock = await window.db.statblocks.add({
      world_id: id,
      name: `Cascade StatBlock ${Date.now()}`,
    });
    return statblock.id;
  }, worldId);
}

async function addCampaignNote(
  page: Page,
  worldId: number,
  campaignId: number,
): Promise<number> {
  return page.evaluate(async ({ nextWorldId, nextCampaignId }) => {
    const note = await window.db.campaignNotes.add({
      world_id: nextWorldId,
      campaign_id: nextCampaignId,
      name: `Cascade Note ${Date.now()}`,
      tags: ['cascade'],
    });
    return note.id;
  }, { nextWorldId: worldId, nextCampaignId: campaignId });
}

test.describe.serial('@critical Referential cascade integrity', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('deleting a world cascades to every world-scoped table', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId } = await createAct(page, arcId);
    const { sessionId } = await createSession(page, actId);
    await createScene(page, sessionId);

    await createLevel(page, worldId, { name: 'L1', category: 'General' });
    await createWorldScopedToken(page, { name: 'World Token', worldId });
    await createCampaignScopedToken(page, campaignId, { name: 'Campaign Token', worldId });
    await createCharacter(page, worldId, { name: `Cascade Char ${Date.now()}` });
    await createFactionType(page, worldId);
    await createFaction(page, worldId, { name: `Cascade Faction ${Date.now()}` });
    await addAbility(page, worldId);
    await addStatBlock(page, worldId);
    await addCampaignNote(page, worldId, campaignId);

    await page.evaluate(async (id) => {
      await window.db.battlemaps.add({ world_id: id, name: 'BM' });
      await window.db.backgrounds.add({ world_id: id, name: 'BG' });
      await window.db.items.add({ world_id: id, name: 'Item' });
      await window.db.loreNotes.add({ world_id: id, name: 'Lore' });
    }, worldId);

    // Sanity: everything was actually persisted before the delete.
    const before = await readWorldChildCounts(page, worldId, campaignId);
    expect(Object.values(before).every((count) => count > 0)).toBe(true);

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);

    const after = await readWorldChildCounts(page, worldId, campaignId);
    expect(after).toEqual({
      world: 0,
      levels: 0,
      campaigns: 0,
      battlemaps: 0,
      backgrounds: 0,
      items: 0,
      loreNotes: 0,
      characters: 0,
      factions: 0,
      factionTypes: 0,
      abilities: 0,
      statblocks: 0,
      tokens: 0,
      arcs: 0,
      acts: 0,
      scenes: 0,
      campaignNotes: 0,
    });
  });

  test('deleting a campaign leaves the world and world-scoped rows intact', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId } = await createAct(page, arcId);
    const { sessionId } = await createSession(page, actId);
    await createScene(page, sessionId);
    await addCampaignNote(page, worldId, campaignId);

    const { tokenId: worldTokenId } = await createWorldScopedToken(page, {
      name: 'Survivor Token',
      worldId,
    });
    const { tokenId: campaignTokenId } = await createCampaignScopedToken(
      page,
      campaignId,
      { name: 'Doomed Token', worldId },
    );

    await page.evaluate(async (id) => window.db.campaigns.delete(id), campaignId);

    const result = await page.evaluate(
      async ({ nextWorldId, nextCampaignId, survivorId, doomedId }) => {
        return {
          worldStillExists: (await window.db.worlds.getById(nextWorldId)) !== null,
          campaignGone: (await window.db.campaigns.getById(nextCampaignId)) === null,
          arcs: (await window.db.arcs.getAllByCampaign(nextCampaignId)).length,
          scenes: (await window.db.scenes.getAllByCampaign(nextCampaignId)).length,
          notes: (await window.db.campaignNotes.getAllByCampaign(nextCampaignId)).length,
          campaignTokenGone: (await window.db.tokens.getById(doomedId)) === null,
          worldTokenSurvives: (await window.db.tokens.getById(survivorId)) !== null,
          worldTokensCount: (await window.db.tokens.getAllByWorld(nextWorldId)).length,
        };
      },
      {
        nextWorldId: worldId,
        nextCampaignId: campaignId,
        survivorId: worldTokenId,
        doomedId: campaignTokenId,
      },
    );

    expect(result).toEqual({
      worldStillExists: true,
      campaignGone: true,
      arcs: 0,
      scenes: 0,
      notes: 0,
      campaignTokenGone: true,
      worldTokenSurvives: true,
      worldTokensCount: 1,
    });

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
  });

  test('deleting a character removes its faction memberships and relationships', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { factionId } = await createFaction(page, worldId, {
      name: `Member Faction ${Date.now()}`,
    });
    const { characterId: memberId } = await createCharacter(page, worldId, {
      name: `Member ${Date.now()}`,
    });
    const { characterId: friendId } = await createCharacter(page, worldId, {
      name: `Friend ${Date.now()}`,
    });

    await page.evaluate(
      async ({ nextFactionId, nextMemberId, nextFriendId }) => {
        await window.db.factionMembers.setForFaction(nextFactionId, [
          { character_id: nextMemberId, role: 'Leader' },
        ]);
        await window.db.characterRelationships.add({
          character_id: nextMemberId,
          related_character_id: nextFriendId,
          character_label: 'Ally',
          related_label: 'Ally',
        });
      },
      { nextFactionId: factionId, nextMemberId: memberId, nextFriendId: friendId },
    );

    const before = await page.evaluate(
      async ({ nextFactionId, nextMemberId }) => ({
        members: (await window.db.factionMembers.getAllByFaction(nextFactionId)).length,
        relationships:
          (await window.db.characterRelationships.getAllByCharacter(nextMemberId)).length,
      }),
      { nextFactionId: factionId, nextMemberId: memberId },
    );
    expect(before).toEqual({ members: 1, relationships: 1 });

    await page.evaluate(async (id) => window.db.characters.delete(id), memberId);

    const after = await page.evaluate(
      async ({ nextFactionId, nextFriendId }) => ({
        members: (await window.db.factionMembers.getAllByFaction(nextFactionId)).length,
        friendRelationships:
          (await window.db.characterRelationships.getAllByCharacter(nextFriendId)).length,
      }),
      { nextFactionId: factionId, nextFriendId: friendId },
    );
    expect(after).toEqual({ members: 0, friendRelationships: 0 });

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
  });

  test('faction type and parent deletes null out references instead of removing factions', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { factionTypeId } = await createFactionType(page, worldId);
    const { factionId: parentId } = await createFaction(page, worldId, {
      name: `Parent ${Date.now()}`,
    });
    const { factionId: childId } = await createFaction(page, worldId, {
      name: `Child ${Date.now()}`,
      typeId: factionTypeId,
      parentFactionId: parentId,
    });

    await page.evaluate(async (id) => window.db.factionTypes.delete(id), factionTypeId);
    await page.evaluate(async (id) => window.db.factions.delete(id), parentId);

    const child = await page.evaluate(
      async (id) => window.db.factions.getById(id),
      childId,
    );
    expect(child).not.toBeNull();
    expect(child?.type_id).toBeNull();
    expect(child?.parent_faction_id).toBeNull();

    await page.evaluate(async (id) => window.db.worlds.delete(id), worldId);
  });
});

async function readWorldChildCounts(
  page: Page,
  worldId: number,
  campaignId: number,
): Promise<Record<string, number>> {
  return page.evaluate(
    async ({ nextWorldId, nextCampaignId }) => {
      return {
        world: (await window.db.worlds.getById(nextWorldId)) === null ? 0 : 1,
        levels: (await window.db.levels.getAllByWorld(nextWorldId)).length,
        campaigns: (await window.db.campaigns.getAllByWorld(nextWorldId)).length,
        battlemaps: (await window.db.battlemaps.getAllByWorld(nextWorldId)).length,
        backgrounds: (await window.db.backgrounds.getAllByWorld(nextWorldId)).length,
        items: (await window.db.items.getAllByWorld(nextWorldId)).length,
        loreNotes: (await window.db.loreNotes.getAllByWorld(nextWorldId)).length,
        characters: (await window.db.characters.getAllByWorld(nextWorldId)).length,
        factions: (await window.db.factions.getAllByWorld(nextWorldId)).length,
        factionTypes: (await window.db.factionTypes.getAllByWorld(nextWorldId)).length,
        abilities: (await window.db.abilities.getAllByWorld(nextWorldId)).length,
        statblocks: (await window.db.statblocks.getAllByWorld(nextWorldId)).length,
        tokens: (await window.db.tokens.getAllByWorld(nextWorldId)).length,
        arcs: (await window.db.arcs.getAllByCampaign(nextCampaignId)).length,
        acts: (await window.db.acts.getAllByCampaign(nextCampaignId)).length,
        scenes: (await window.db.scenes.getAllByCampaign(nextCampaignId)).length,
        campaignNotes: (await window.db.campaignNotes.getAllByCampaign(nextCampaignId)).length,
      };
    },
    { nextWorldId: worldId, nextCampaignId: campaignId },
  );
}
