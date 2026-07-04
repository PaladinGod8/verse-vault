import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

// The core promise of a local-first SQLite app is that data written in one run is
// still there on the next launch, and that re-running schema init / migrations on
// a *populated* database neither loses rows nor duplicates them. Every other e2e
// spec starts from a throwaway userData dir, so nothing proves this. Here we seed a
// full world tree, then relaunch the same userData dir twice (second relaunch
// guards migration idempotency) and assert the snapshot is byte-for-byte stable.

interface WorldSnapshot {
  worldName: string | null;
  levels: number;
  campaigns: number;
  characters: number;
  factions: number;
  factionTypes: number;
  abilities: number;
  statblocks: number;
  battlemaps: number;
  items: number;
  backgrounds: number;
  loreNotes: number;
  tokens: number;
  arcs: number;
  acts: number;
  sessions: number;
  scenes: number;
  campaignNotes: number;
}

async function openWorldsWindow(userDataDir?: string) {
  const result = await launchApp(userDataDir);
  const page = await result.app.firstWindow();

  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByRole('heading', { name: 'Worlds', exact: true, level: 1 }),
  ).toBeVisible();

  return { ...result, page };
}

async function seedWorldTree(
  page: Page,
): Promise<{ worldId: number; campaignId: number; }> {
  return page.evaluate(async () => {
    const world = await window.db.worlds.add({ name: `Persisted Realm ${Date.now()}` });
    const campaign = await window.db.campaigns.add({
      world_id: world.id,
      name: 'Persisted Campaign',
    });
    const arc = await window.db.arcs.add({ campaign_id: campaign.id, name: 'Arc I' });
    const act = await window.db.acts.add({ arc_id: arc.id, name: 'Act I' });
    const session = await window.db.sessions.add({ act_id: act.id, name: 'Session I' });
    await window.db.scenes.add({ session_id: session.id, name: 'Scene I' });

    await window.db.levels.add({ world_id: world.id, name: 'Level I', category: 'General' });
    await window.db.characters.add({
      world_id: world.id,
      name: 'Persisted Hero',
      profile: null,
      is_player_character: 0,
      owner: null,
      author: null,
      image_src: null,
      sections: '{}',
      wiki_summary: '{}',
    });
    await window.db.factionTypes.add({ world_id: world.id, name: 'Guild' });
    await window.db.factions.add({
      world_id: world.id,
      name: 'Persisted Faction',
      profile: null,
      image_src: null,
      sections: '{}',
      wiki_summary: '{}',
      type_id: null,
      parent_faction_id: null,
    });
    await window.db.abilities.add({
      world_id: world.id,
      name: 'Persisted Ability',
      type: 'active',
    });
    await window.db.statblocks.add({ world_id: world.id, name: 'Persisted StatBlock' });
    await window.db.battlemaps.add({ world_id: world.id, name: 'Persisted Map' });
    await window.db.items.add({ world_id: world.id, name: 'Persisted Item' });
    await window.db.backgrounds.add({ world_id: world.id, name: 'Persisted Background' });
    await window.db.loreNotes.add({ world_id: world.id, name: 'Persisted Lore' });
    await window.db.tokens.add({
      world_id: world.id,
      campaign_id: null,
      name: 'World Token',
      image_src: null,
      is_visible: 1,
    });
    await window.db.tokens.add({
      world_id: world.id,
      campaign_id: campaign.id,
      name: 'Campaign Token',
      image_src: null,
      is_visible: 1,
    });
    await window.db.campaignNotes.add({
      world_id: world.id,
      campaign_id: campaign.id,
      name: 'Persisted Note',
      tags: ['persist'],
    });

    return { worldId: world.id, campaignId: campaign.id };
  });
}

async function readSnapshot(
  page: Page,
  worldId: number,
  campaignId: number,
): Promise<WorldSnapshot> {
  return page.evaluate(
    async ({ w, c }) => {
      const world = await window.db.worlds.getById(w);
      return {
        worldName: world?.name ?? null,
        levels: (await window.db.levels.getAllByWorld(w)).length,
        campaigns: (await window.db.campaigns.getAllByWorld(w)).length,
        characters: (await window.db.characters.getAllByWorld(w)).length,
        factions: (await window.db.factions.getAllByWorld(w)).length,
        factionTypes: (await window.db.factionTypes.getAllByWorld(w)).length,
        abilities: (await window.db.abilities.getAllByWorld(w)).length,
        statblocks: (await window.db.statblocks.getAllByWorld(w)).length,
        battlemaps: (await window.db.battlemaps.getAllByWorld(w)).length,
        items: (await window.db.items.getAllByWorld(w)).length,
        backgrounds: (await window.db.backgrounds.getAllByWorld(w)).length,
        loreNotes: (await window.db.loreNotes.getAllByWorld(w)).length,
        tokens: (await window.db.tokens.getAllByWorld(w)).length,
        arcs: (await window.db.arcs.getAllByCampaign(c)).length,
        acts: (await window.db.acts.getAllByCampaign(c)).length,
        sessions: (await window.db.sessions.getAllByCampaign(c)).length,
        scenes: (await window.db.scenes.getAllByCampaign(c)).length,
        campaignNotes: (await window.db.campaignNotes.getAllByCampaign(c)).length,
      };
    },
    { w: worldId, c: campaignId },
  );
}

test('@critical domain data survives relaunch and migrations stay idempotent', async () => {
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let userDataDir: string | undefined;

  try {
    ({ app, page, userDataDir } = await openWorldsWindow());
    const { worldId, campaignId } = await seedWorldTree(page);

    const seeded = await readSnapshot(page, worldId, campaignId);
    const expected: WorldSnapshot = {
      worldName: seeded.worldName,
      levels: 1,
      campaigns: 1,
      characters: 1,
      factions: 1,
      factionTypes: 1,
      abilities: 1,
      statblocks: 1,
      battlemaps: 1,
      items: 1,
      backgrounds: 1,
      loreNotes: 1,
      tokens: 2,
      arcs: 1,
      acts: 1,
      sessions: 1,
      scenes: 1,
      campaignNotes: 1,
    };
    expect(seeded).toEqual(expected);
    expect(seeded.worldName).not.toBeNull();

    // First relaunch: data must still be readable after a clean shutdown.
    await closeApp(app, userDataDir, { preserveUserDataDir: true });
    ({ app, page } = await openWorldsWindow(userDataDir));
    expect(await readSnapshot(page, worldId, campaignId)).toEqual(expected);

    // Second relaunch: re-running schema init / migrations against a populated DB
    // must not duplicate or drop any row — counts stay identical.
    await closeApp(app, userDataDir, { preserveUserDataDir: true });
    ({ app, page } = await openWorldsWindow(userDataDir));
    expect(await readSnapshot(page, worldId, campaignId)).toEqual(expected);
  } finally {
    if (app && userDataDir) {
      await closeApp(app, userDataDir);
    }
  }
});
