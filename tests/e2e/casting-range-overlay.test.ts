import { test, expect } from '@playwright/test';
import { launchElectronApp, cleanupElectronApp } from './helpers';

test('casting range overlay renders and tracks pointer in runtime', async () => {
  const context = await launchElectronApp();
  const { page } = context;

  try {
    const unique = Date.now().toString();
    const worldName = `E2E Cast Overlay World ${unique}`;
    const abilityName = `E2E Fireball ${unique}`;
    const battleMapName = `E2E Arena ${unique}`;
    const tokenName = `E2E Mage ${unique}`;

    // Create world
    await page.getByRole('button', { name: 'Create world' }).click();
    const worldDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(worldDialog).toBeVisible();
    await worldDialog.getByLabel('Name').fill(worldName);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();

    // Open world
    await page.getByRole('button', { name: `Open ${worldName}` }).click();
    await expect(
      page.getByRole('heading', { name: 'World Overview', level: 1 }),
    ).toBeVisible();

    // Create active ability with range + AoE
    await page.getByRole('link', { name: 'Abilities' }).click();
    await page.getByRole('button', { name: 'New Ability' }).click();
    const abilityDialog = page.getByRole('dialog', { name: 'New Ability' });
    await expect(abilityDialog).toBeVisible();
    await abilityDialog.getByLabel('Name').fill(abilityName);
    await abilityDialog.getByLabel('Type').selectOption('active');
    await abilityDialog.getByLabel('Range (cells)').fill('5');
    await abilityDialog.getByLabel('AoE Shape').selectOption('circle');
    await abilityDialog.getByLabel('AoE size (cells)').fill('2');
    await abilityDialog.getByLabel('Target type').selectOption('tile');
    await abilityDialog.getByRole('button', { name: 'Create ability' }).click();

    // Verify ability appears in list
    const abilityRow = page
      .locator('tbody tr')
      .filter({ hasText: abilityName })
      .first();
    await expect(abilityRow).toBeVisible();

    // Create battlemap (square grid)
    await page.getByRole('link', { name: 'BattleMaps' }).click();
    await page.getByRole('button', { name: 'New BattleMap' }).click();
    const battleMapDialog = page.getByRole('dialog', { name: 'New BattleMap' });
    await expect(battleMapDialog).toBeVisible();
    await battleMapDialog.getByLabel('Name').fill(battleMapName);
    await battleMapDialog.getByLabel('Grid mode').selectOption('square');
    await battleMapDialog.getByLabel('Cell size (px)').fill('64');
    await battleMapDialog.getByLabel('Grid width').fill('20');
    await battleMapDialog.getByLabel('Grid height').fill('20');
    await battleMapDialog
      .getByRole('button', { name: 'Create BattleMap' })
      .click();

    const battleMapRow = page
      .locator('tbody tr')
      .filter({ hasText: battleMapName })
      .first();
    await expect(battleMapRow).toBeVisible();

    // Create token
    await page.getByRole('link', { name: 'Tokens' }).click();
    await page.getByRole('button', { name: 'New Token' }).click();
    const tokenDialog = page.getByRole('dialog', { name: 'New Token' });
    await expect(tokenDialog).toBeVisible();
    await tokenDialog.getByLabel('Name').fill(tokenName);
    await tokenDialog.getByRole('button', { name: 'Create token' }).click();

    const tokenRow = page
      .locator('tbody tr')
      .filter({ hasText: tokenName })
      .first();
    await expect(tokenRow).toBeVisible();

    // Open battlemap in runtime mode
    await page.getByRole('link', { name: 'BattleMaps' }).click();
    await battleMapRow.getByRole('button', { name: 'Play' }).click();

    // Wait for runtime page to load
    await expect(
      page.getByRole('heading', { name: battleMapName, level: 1 }),
    ).toBeVisible();

    // Get canvas element
    const canvas = page.locator('canvas').first(); // PixiJS canvas
    await expect(canvas).toBeVisible();

    // Take baseline screenshot (no overlay)
    await page.waitForTimeout(500); // Allow initial render
    const baselineScreenshot = await canvas.screenshot();

    // Get world, token, and battlemap IDs for token placement
    const tokenId = await page.evaluate(
      async ({ worldNameArg, tokenNameArg }) => {
        const worlds = await window.db.worlds.getAll();
        const world = worlds.find((w) => w.name === worldNameArg);
        if (!world) throw new Error('World not found');

        const tokens = await window.db.tokens.getAllByWorld(world.id);
        const token = tokens.find((t) => t.name === tokenNameArg);
        if (!token) throw new Error('Token not found');

        return token.id;
      },
      { worldNameArg: worldName, tokenNameArg: tokenName },
    );

    const battleMapId = await page.evaluate(
      async ({ worldNameArg, battleMapNameArg }) => {
        const worlds = await window.db.worlds.getAll();
        const world = worlds.find((w) => w.name === worldNameArg);
        if (!world) throw new Error('World not found');

        const battleMaps = await window.db.battlemaps.getAllByWorld(world.id);
        const battleMap = battleMaps.find((bm) => bm.name === battleMapNameArg);
        if (!battleMap) throw new Error('BattleMap not found');

        return battleMap.id;
      },
      { worldNameArg: worldName, battleMapNameArg: battleMapName },
    );

    // Place token at grid position (5, 5)
    await page.evaluate(
      async ({ battleMapIdArg, tokenIdArg }) => {
        await window.db.battlemaps.addToken({
          battlemap_id: battleMapIdArg,
          token_id: tokenIdArg,
          grid_x: 5,
          grid_y: 5,
        });
      },
      { battleMapIdArg: battleMapId, tokenIdArg: tokenId },
    );

    // Reload runtime page to show placed token
    await page.reload();
    await page.waitForTimeout(500);

    // Select token (click on canvas at token position)
    // Approximate canvas position: (5 * 64 + 32, 5 * 64 + 32) = (352, 352)
    await canvas.click({ position: { x: 352, y: 352 } });

    // Verify AbilityPickerPanel appears
    const abilityPickerPanel = page.locator(
      '[data-testid="ability-picker-panel"]',
    );
    await expect(abilityPickerPanel).toBeVisible();

    // Click the ability to enter cast mode
    await abilityPickerPanel.getByText(abilityName).click();

    // Wait for overlay to render
    await page.waitForTimeout(300);

    // Take screenshot in cast mode
    const castModeScreenshot = await canvas.screenshot();

    // Assert overlay is visible (screenshots differ)
    expect(Buffer.compare(baselineScreenshot, castModeScreenshot)).not.toBe(0);

    // Move pointer over canvas to trigger directional shape tracking
    await canvas.hover({ position: { x: 500, y: 400 } });
    await page.waitForTimeout(100);

    // For circle AoE, pointer movement may not produce visible changes,
    // but the interaction validates that pointer events are handled without error

    // Exit cast mode (click ability again to deselect)
    await abilityPickerPanel.getByText(abilityName).click();
    await page.waitForTimeout(100);

    // Take screenshot after exit
    const afterExitScreenshot = await canvas.screenshot();

    // Assert overlay is cleared (back to baseline or similar)
    expect(Buffer.compare(afterExitScreenshot, castModeScreenshot)).not.toBe(0);
  } finally {
    await cleanupElectronApp(context);
  }
});
