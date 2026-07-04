import { expect, type Page, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createWorld,
  createWorldScopedToken,
  type E2EAppContext,
  launchElectronApp,
} from './helpers';

// Covers the statblock <-> token and statblock <-> ability join tables: the
// same-world guard, the UNIQUE constraints, bidirectional lookups, and the
// ON DELETE CASCADE clean-up of link rows. All of this is real SQL running in
// Electron and is untouched by the mocked-DB handler unit tests.

async function addAbility(page: Page, worldId: number, name: string): Promise<number> {
  return page.evaluate(async (payload) => {
    const ability = await window.db.abilities.add({
      world_id: payload.worldId,
      name: payload.name,
      type: 'active',
    });
    return ability.id;
  }, { worldId, name });
}

async function addStatBlock(page: Page, worldId: number, name: string): Promise<number> {
  return page.evaluate(async (payload) => {
    const statblock = await window.db.statblocks.add({
      world_id: payload.worldId,
      name: payload.name,
    });
    return statblock.id;
  }, { worldId, name });
}

test.describe.serial('@critical StatBlock token/ability links', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('links a token and attaches an ability, resolving both directions', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const statblockId = await addStatBlock(page, worldId, 'Goblin Boss');
    const { tokenId } = await createWorldScopedToken(page, { name: 'Goblin Token', worldId });
    const abilityId = await addAbility(page, worldId, 'Cleave');

    const result = await page.evaluate(
      async ({ sbId, tId, aId }) => {
        await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        await window.db.statblocks.attachAbility({ statblock_id: sbId, ability_id: aId });
        return {
          linkedTokens: (await window.db.statblocks.getLinkedTokens(sbId)).map((t) => t.id),
          abilities: (await window.db.statblocks.listAbilities(sbId)).map((a) => a.id),
          linkedStatblockId: (await window.db.statblocks.getLinkedStatblock(tId))?.id ?? null,
        };
      },
      { sbId: statblockId, tId: tokenId, aId: abilityId },
    );

    expect(result.linkedTokens).toEqual([tokenId]);
    expect(result.abilities).toEqual([abilityId]);
    expect(result.linkedStatblockId).toBe(statblockId);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('rejects linking a token or ability from a different world', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { worldId: otherWorldId } = await createWorld(page);
    const statblockId = await addStatBlock(page, worldId, 'Home StatBlock');
    const { tokenId: foreignTokenId } = await createWorldScopedToken(page, {
      name: 'Foreign Token',
      worldId: otherWorldId,
    });
    const foreignAbilityId = await addAbility(page, otherWorldId, 'Foreign Ability');

    const errors = await page.evaluate(
      async ({ sbId, tId, aId }) => {
        const messages: { token: string | null; ability: string | null; } = {
          token: null,
          ability: null,
        };
        try {
          await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        } catch (err) {
          messages.token = (err as Error).message;
        }
        try {
          await window.db.statblocks.attachAbility({ statblock_id: sbId, ability_id: aId });
        } catch (err) {
          messages.ability = (err as Error).message;
        }
        return messages;
      },
      { sbId: statblockId, tId: foreignTokenId, aId: foreignAbilityId },
    );

    expect(errors.token).toContain('same world');
    expect(errors.ability).toContain('same world');

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
    await page.evaluate(async (wid) => window.db.worlds.delete(wid), otherWorldId);
  });

  test('enforces the unique constraints on repeated links', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const statblockId = await addStatBlock(page, worldId, 'Duplicated');
    const { tokenId } = await createWorldScopedToken(page, { name: 'Once Token', worldId });
    const abilityId = await addAbility(page, worldId, 'Once Ability');

    const errors = await page.evaluate(
      async ({ sbId, tId, aId }) => {
        await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        await window.db.statblocks.attachAbility({ statblock_id: sbId, ability_id: aId });

        const messages: { token: string | null; ability: string | null; } = {
          token: null,
          ability: null,
        };
        try {
          await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        } catch (err) {
          messages.token = (err as Error).message;
        }
        try {
          await window.db.statblocks.attachAbility({ statblock_id: sbId, ability_id: aId });
        } catch (err) {
          messages.ability = (err as Error).message;
        }
        return messages;
      },
      { sbId: statblockId, tId: tokenId, aId: abilityId },
    );

    expect(errors.token).toContain('already linked');
    expect(errors.ability).toContain('already attached');

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('deleting a token or ability cascades away its link rows', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const statblockId = await addStatBlock(page, worldId, 'Survivor StatBlock');
    const { tokenId } = await createWorldScopedToken(page, { name: 'Doomed Token', worldId });
    const abilityId = await addAbility(page, worldId, 'Doomed Ability');

    const result = await page.evaluate(
      async ({ sbId, tId, aId }) => {
        await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        await window.db.statblocks.attachAbility({ statblock_id: sbId, ability_id: aId });
        await window.db.tokens.delete(tId);
        await window.db.abilities.delete(aId);
        return {
          linkedTokens: (await window.db.statblocks.getLinkedTokens(sbId)).length,
          abilities: (await window.db.statblocks.listAbilities(sbId)).length,
          statblockSurvives: (await window.db.statblocks.getById(sbId)) !== null,
          reverseLookup: await window.db.statblocks.getLinkedStatblock(tId),
        };
      },
      { sbId: statblockId, tId: tokenId, aId: abilityId },
    );

    expect(result.linkedTokens).toBe(0);
    expect(result.abilities).toBe(0);
    expect(result.statblockSurvives).toBe(true);
    expect(result.reverseLookup).toBeNull();

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('deleting the statblock removes its links so tokens resolve to nothing', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const statblockId = await addStatBlock(page, worldId, 'Ephemeral StatBlock');
    const { tokenId } = await createWorldScopedToken(page, { name: 'Orphan Token', worldId });

    const reverseLookup = await page.evaluate(
      async ({ sbId, tId }) => {
        await window.db.statblocks.linkToken({ statblock_id: sbId, token_id: tId });
        await window.db.statblocks.delete(sbId);
        return window.db.statblocks.getLinkedStatblock(tId);
      },
      { sbId: statblockId, tId: tokenId },
    );

    expect(reverseLookup).toBeNull();

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });
});
