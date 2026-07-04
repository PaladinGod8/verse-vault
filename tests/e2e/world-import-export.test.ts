import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanupElectronApp, launchElectronApp } from './helpers';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
  'base64',
);

test('@critical world import/export round-trips world data through native-style dialogs', async () => {
  const context = await launchElectronApp();
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'vv-world-transfer-e2e-'));
  const exportPath = path.join(tempDir, 'alpha-world.zip');

  try {
    const { app, page } = context;
    const imageBytes = Array.from(ONE_PIXEL_PNG);

    const seeded = await page.evaluate(async ({ bytes }) => {
      const imagePayload = {
        fileName: 'seed.png',
        mimeType: 'image/png',
        bytes: new Uint8Array(bytes),
      };

      const worldImage = await window.db.worlds.importImage(imagePayload);
      const world = await window.db.worlds.add({
        name: 'Alpha',
        thumbnail: worldImage.image_src,
        short_description: 'Round trip me',
      });
      const level = await window.db.levels.add({
        world_id: world.id,
        name: 'Level One',
        category: 'Tier',
      });
      const campaign = await window.db.campaigns.add({
        world_id: world.id,
        name: 'Campaign One',
      });
      const battleMap = await window.db.battlemaps.add({
        world_id: world.id,
        name: 'Arena',
      });
      const tokenImage = await window.db.tokens.importImage(imagePayload);
      await window.db.tokens.add({
        world_id: world.id,
        campaign_id: campaign.id,
        name: 'Scout',
        image_src: tokenImage.image_src,
      });
      const parentAbility = await window.db.abilities.add({
        world_id: world.id,
        level_id: level.id,
        name: 'Slash',
        type: 'active',
      });
      const childAbility = await window.db.abilities.add({
        world_id: world.id,
        level_id: level.id,
        name: 'Riposte',
        type: 'active',
      });
      await window.db.abilities.addChild({
        parent_id: parentAbility.id,
        child_id: childAbility.id,
      });
      const characterImage = await window.db.characters.importImage(imagePayload);
      const character = await window.db.characters.add({
        world_id: world.id,
        name: 'Hero',
        image_src: characterImage.image_src,
        sections: '{}',
        wiki_summary: '{}',
      });
      const factionType = await window.db.factionTypes.add({
        world_id: world.id,
        name: 'Guild',
      });
      const parentFaction = await window.db.factions.add({
        world_id: world.id,
        name: 'Parent Guild',
        image_src: characterImage.image_src,
        sections: '{}',
        wiki_summary: '{}',
        type_id: factionType.id,
      });
      await window.db.factions.add({
        world_id: world.id,
        name: 'Child Guild',
        sections: '{}',
        wiki_summary: '{}',
        type_id: factionType.id,
        parent_faction_id: parentFaction.id,
      });
      await window.db.factionMembers.setForFaction(parentFaction.id, [
        { character_id: character.id, role: 'leader' },
      ]);
      await window.db.factionMembers.setPrimary(character.id, parentFaction.id);
      const backgroundImage = await window.db.backgrounds.importImage(imagePayload);
      await window.db.backgrounds.add({
        world_id: world.id,
        name: 'Scholar',
        image_src: backgroundImage.image_src,
      });
      const itemImage = await window.db.items.importImage(imagePayload);
      await window.db.items.add({
        world_id: world.id,
        name: 'Lantern',
        image_src: itemImage.image_src,
      });
      const arc = await window.db.arcs.add({
        campaign_id: campaign.id,
        name: 'Arc One',
      });
      const act = await window.db.acts.add({
        arc_id: arc.id,
        name: 'Act One',
      });
      const session = await window.db.sessions.add({
        act_id: act.id,
        name: 'Session One',
      });
      await window.db.scenes.add({
        session_id: session.id,
        name: 'Scene One',
        payload: JSON.stringify({ runtime: { battlemap_id: battleMap.id } }),
      });

      return {
        worldId: world.id,
        worldName: world.name,
        thumbnail: world.thumbnail,
      };
    }, { bytes: imageBytes });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('button', { name: `Open ${seeded.worldName}` })).toBeVisible();

    await app.evaluate(({ dialog }, nextExportPath) => {
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: nextExportPath,
      });
    }, exportPath);

    await page.getByRole('button', { name: 'Export' }).click();
    await expect.poll(() => existsSync(exportPath)).toBe(true);

    await app.evaluate(({ dialog }, nextImportPath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [nextImportPath],
      });
    }, exportPath);

    await page.getByRole('button', { name: 'Import World Data' }).click();
    await expect(page.getByRole('button', { name: 'Open Alpha (imported)' })).toBeVisible();

    const imported = await page.evaluate(async () => {
      const worlds = await window.db.worlds.getAll();
      const importedWorld = worlds.find((world) => world.name === 'Alpha (imported)');
      if (!importedWorld) {
        return null;
      }

      const [levels, campaigns, characters, backgrounds, items, factions] = await Promise.all([
        window.db.levels.getAllByWorld(importedWorld.id),
        window.db.campaigns.getAllByWorld(importedWorld.id),
        window.db.characters.getAllByWorld(importedWorld.id),
        window.db.backgrounds.getAllByWorld(importedWorld.id),
        window.db.items.getAllByWorld(importedWorld.id),
        window.db.factions.getAllByWorld(importedWorld.id),
      ]);

      return {
        worldId: importedWorld.id,
        worldName: importedWorld.name,
        thumbnail: importedWorld.thumbnail,
        counts: {
          levels: levels.length,
          campaigns: campaigns.length,
          characters: characters.length,
          backgrounds: backgrounds.length,
          items: items.length,
          factions: factions.length,
        },
      };
    });

    expect(imported).not.toBeNull();
    expect(imported?.worldId).not.toBe(seeded.worldId);
    expect(imported?.thumbnail).toMatch(/^vv-media:\/\/world-images\//);
    expect(imported?.thumbnail).not.toBe(seeded.thumbnail);
    expect(imported?.counts).toEqual({
      levels: 1,
      campaigns: 1,
      characters: 1,
      backgrounds: 1,
      items: 1,
      factions: 2,
    });
  } finally {
    await cleanupElectronApp(context);
    rmSync(tempDir, { recursive: true, force: true });
  }
});
