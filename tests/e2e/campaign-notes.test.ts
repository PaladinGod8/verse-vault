import { expect, type Page, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createCampaign,
  createWorld,
  type E2EAppContext,
  launchElectronApp,
} from './helpers';

// The campaignNotes domain (6 IPC channels, tag normalization + a
// case-insensitive unique tag index) had no e2e coverage. These specs drive the
// real handlers so the tag-dedup, roll-up, and cascade SQL is actually exercised.

async function addNote(
  page: Page,
  input: { worldId: number; campaignId: number; name: string; tags?: string[]; },
): Promise<{ id: number; tags: string[]; }> {
  return page.evaluate(async (payload) => {
    const note = await window.db.campaignNotes.add({
      world_id: payload.worldId,
      campaign_id: payload.campaignId,
      name: payload.name,
      tags: payload.tags,
    });
    return { id: note.id, tags: note.tags };
  }, input);
}

test.describe.serial('@critical Campaign notes and tags', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('normalizes tags: trims, drops blanks, dedupes case-insensitively', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);

    const { id } = await addNote(page, {
      worldId,
      campaignId,
      name: 'Session Prep',
      tags: ['Lore', 'lore', '  NPC  ', 'npc', '   ', 'NPC'],
    });

    const stored = await page.evaluate(
      async (noteId) => window.db.campaignNotes.getById(noteId),
      id,
    );
    // getById returns tags sorted NOCASE; first-seen casing wins on dedupe.
    expect(stored?.tags).toEqual(['Lore', 'NPC']);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('getAllTagsByCampaign returns a distinct, sorted union across notes', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);

    await addNote(page, { worldId, campaignId, name: 'Note A', tags: ['Lore', 'NPC'] });
    await addNote(page, { worldId, campaignId, name: 'Note B', tags: ['Combat', 'Lore'] });

    const tags = await page.evaluate(
      async (cid) => window.db.campaignNotes.getAllTagsByCampaign(cid),
      campaignId,
    );
    expect(tags).toEqual(['Combat', 'Lore', 'NPC']);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('updating tags replaces the previous set', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { id } = await addNote(page, {
      worldId,
      campaignId,
      name: 'Evolving Note',
      tags: ['Old', 'Stale'],
    });

    const updatedTags = await page.evaluate(async (noteId) => {
      const updated = await window.db.campaignNotes.update(noteId, { tags: ['Fresh'] });
      return updated.tags;
    }, id);
    expect(updatedTags).toEqual(['Fresh']);

    const campaignTags = await page.evaluate(
      async (cid) => window.db.campaignNotes.getAllTagsByCampaign(cid),
      campaignId,
    );
    expect(campaignTags).toEqual(['Fresh']);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('deleting a note removes it and its tags from the campaign roll-up', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const keep = await addNote(page, {
      worldId,
      campaignId,
      name: 'Keeper',
      tags: ['Keep'],
    });
    const drop = await addNote(page, {
      worldId,
      campaignId,
      name: 'Throwaway',
      tags: ['Drop'],
    });

    await page.evaluate(async (noteId) => window.db.campaignNotes.delete(noteId), drop.id);

    const result = await page.evaluate(
      async ({ cid, keptId }) => ({
        remaining: (await window.db.campaignNotes.getAllByCampaign(cid)).map((n) => n.id),
        tags: await window.db.campaignNotes.getAllTagsByCampaign(cid),
        keptStillReadable: (await window.db.campaignNotes.getById(keptId)) !== null,
      }),
      { cid: campaignId, keptId: keep.id },
    );

    expect(result.remaining).toEqual([keep.id]);
    expect(result.tags).toEqual(['Keep']);
    expect(result.keptStillReadable).toBe(true);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('rejects a blank note name', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);

    const error = await page.evaluate(
      async ({ wid, cid }) => {
        try {
          await window.db.campaignNotes.add({ world_id: wid, campaign_id: cid, name: '   ' });
          return null;
        } catch (err) {
          return (err as Error).message;
        }
      },
      { wid: worldId, cid: campaignId },
    );
    expect(error).toContain('name is required');

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });
});
