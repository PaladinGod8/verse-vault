import { expect, test } from '@playwright/test';
import { cleanupElectronApp, launchElectronApp } from './helpers';

test('runtime resolves linked statblock abilities and opens popup on token double click', async () => {
  const context = await launchElectronApp();
  const { page } = context;

  try {
    const createWorldButton = page.getByRole('button', { name: 'Create world' });
    if (!(await createWorldButton.isVisible().catch(() => false))) {
      const baseUrl = page.url().split('#')[0];
      await page.goto(`${baseUrl}#/`);
    }
    await expect(createWorldButton).toBeVisible({ timeout: 15000 });

    const unique = Date.now().toString();
    const worldName = `E2E Runtime StatBlock World ${unique}`;
    const battleMapName = `E2E Runtime StatBlock Map ${unique}`;
    const linkedTokenName = `E2E Linked Token ${unique}`;
    const unlinkedTokenName = `E2E Unlinked Token ${unique}`;
    const activeAbilityName = `E2E Linked Firebolt ${unique}`;
    const passiveAbilityName = `E2E Linked Aura ${unique}`;

    await page.getByRole('button', { name: 'Create world' }).click();
    const worldDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(worldDialog).toBeVisible();
    await worldDialog.getByLabel('Name').fill(worldName);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();

    await page.getByRole('button', { name: `Open ${worldName}` }).click();
    await expect(
      page.getByRole('heading', { name: 'World Overview', level: 1 }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'BattleMaps' }).click();
    await page.getByRole('button', { name: 'New BattleMap' }).click();
    const battleMapDialog = page.getByRole('dialog', { name: 'New BattleMap' });
    await expect(battleMapDialog).toBeVisible();
    await battleMapDialog.getByLabel('Name').fill(battleMapName);
    await battleMapDialog
      .getByRole('button', { name: 'Create BattleMap' })
      .click();

    const battleMapRow = page
      .locator('tbody tr')
      .filter({ hasText: battleMapName })
      .first();
    await expect(battleMapRow).toBeVisible();

    await page.getByRole('link', { name: 'Tokens' }).click();

    await page.getByRole('button', { name: 'New Token' }).click();
    const linkedTokenDialog = page.getByRole('dialog', { name: 'New Token' });
    await linkedTokenDialog.getByLabel('Name').fill(linkedTokenName);
    await linkedTokenDialog.getByRole('button', { name: 'Create' }).click();

    await page.getByRole('button', { name: 'New Token' }).click();
    const unlinkedTokenDialog = page.getByRole('dialog', { name: 'New Token' });
    await unlinkedTokenDialog.getByLabel('Name').fill(unlinkedTokenName);
    await unlinkedTokenDialog.getByRole('button', { name: 'Create' }).click();

    await expect(
      page.locator('tbody tr').filter({ hasText: linkedTokenName }).first(),
    ).toBeVisible();
    await expect(
      page.locator('tbody tr').filter({ hasText: unlinkedTokenName }).first(),
    ).toBeVisible();

    await page.evaluate(
      async (
        { nextWorldName, nextLinkedTokenName, nextActiveAbilityName, nextPassiveAbilityName },
      ) => {
        const worlds = await window.db.worlds.getAll();
        const world = worlds.find((candidate) => candidate.name === nextWorldName);
        if (!world) {
          throw new Error('World not found for runtime statblock e2e setup.');
        }

        const worldTokens = await window.db.tokens.getAllByWorld(world.id);
        const linkedToken = worldTokens.find((candidate) => candidate.name === nextLinkedTokenName);
        if (!linkedToken) {
          throw new Error('Linked token not found for runtime statblock e2e setup.');
        }

        const activeAbility = await window.db.abilities.add({
          world_id: world.id,
          name: nextActiveAbilityName,
          type: 'active',
          range_cells: 6,
          aoe_shape: 'circle',
          aoe_size_cells: 2,
          target_type: 'tile',
        });

        const passiveAbility = await window.db.abilities.add({
          world_id: world.id,
          name: nextPassiveAbilityName,
          type: 'passive',
          range_cells: null,
          aoe_shape: null,
          aoe_size_cells: null,
          target_type: null,
        });

        const statblock = await window.db.statblocks.add({
          world_id: world.id,
          name: `Runtime StatBlock ${Date.now()}`,
          description: 'runtime e2e linked statblock',
        });

        await window.db.statblocks.attachAbility({
          statblock_id: statblock.id,
          ability_id: activeAbility.id,
        });
        await window.db.statblocks.attachAbility({
          statblock_id: statblock.id,
          ability_id: passiveAbility.id,
        });
        await window.db.statblocks.linkToken({
          statblock_id: statblock.id,
          token_id: linkedToken.id,
        });
      },
      {
        nextWorldName: worldName,
        nextLinkedTokenName: linkedTokenName,
        nextActiveAbilityName: activeAbilityName,
        nextPassiveAbilityName: passiveAbilityName,
      },
    );

    await page.getByRole('link', { name: 'BattleMaps' }).click();
    await battleMapRow.getByRole('link', { name: 'Play' }).click();
    await expect(
      page.getByRole('heading', { name: `${battleMapName} Runtime`, level: 1 }),
    ).toBeVisible();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const runtimeTokenSection = page
      .locator('section')
      .filter({ hasText: 'Runtime Tokens' })
      .first();
    const worldTokensSection = runtimeTokenSection
      .locator('div')
      .filter({ hasText: 'World Tokens' })
      .first();

    const linkedSourceRow = worldTokensSection
      .locator('li')
      .filter({ hasText: linkedTokenName })
      .first();
    await linkedSourceRow.getByRole('button', { name: 'Add' }).click();

    const unlinkedSourceRow = worldTokensSection
      .locator('li')
      .filter({ hasText: unlinkedTokenName })
      .first();
    await unlinkedSourceRow.getByRole('button', { name: 'Add' }).click();

    const sceneTokensSection = runtimeTokenSection
      .locator('div')
      .filter({ hasText: 'Scene Tokens' })
      .first();

    await sceneTokensSection
      .getByRole('button', { name: linkedTokenName })
      .first()
      .click();

    const linkedAbilityButton = page.getByRole('button', {
      name: new RegExp(activeAbilityName),
    });
    await expect(linkedAbilityButton).toBeVisible();
    await expect(page.getByText(passiveAbilityName)).toHaveCount(0);

    const baselineScreenshot = await canvas.screenshot();
    await linkedAbilityButton.click();
    await page.waitForTimeout(250);
    const castEnabledScreenshot = await canvas.screenshot();
    expect(Buffer.compare(baselineScreenshot, castEnabledScreenshot)).not.toBe(0);

    await sceneTokensSection
      .getByRole('button', { name: unlinkedTokenName })
      .first()
      .click();
    await expect(
      page.getByText('No linked statblock for this token.'),
    ).toBeVisible();

    await sceneTokensSection
      .getByRole('button', { name: linkedTokenName })
      .first()
      .click();
    await expect(linkedAbilityButton).toBeVisible();
    await linkedAbilityButton.click();
    await page.waitForTimeout(200);

    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();
    if (!canvasBounds) {
      throw new Error('Runtime canvas bounds unavailable for popup double-click.');
    }

    const centerX = canvasBounds.x + canvasBounds.width * 0.5;
    const centerY = canvasBounds.y + canvasBounds.height * 0.5;
    await page.waitForTimeout(450);
    await page.mouse.dblclick(centerX, centerY, { button: 'left' });

    const popup = page.getByRole('dialog', {
      name: `${linkedTokenName} StatBlock`,
    });
    await expect(popup).toBeVisible();
    await expect(popup.getByText(activeAbilityName)).toBeVisible();

    await popup.getByRole('button', { name: 'Close' }).click();
    await expect(popup).toHaveCount(0);

    const afterPopupCloseScreenshot = await canvas.screenshot();
    expect(Buffer.compare(afterPopupCloseScreenshot, baselineScreenshot)).not.toBe(0);

    await linkedAbilityButton.click();
    await page.waitForTimeout(200);
    const castDisabledScreenshot = await canvas.screenshot();
    expect(Buffer.compare(castDisabledScreenshot, afterPopupCloseScreenshot)).not.toBe(0);
  } finally {
    await cleanupElectronApp(context);
  }
});
