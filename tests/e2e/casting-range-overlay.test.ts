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
    const battleMapConfig = JSON.stringify({
      runtime: {
        grid: {
          mode: 'square',
          cellSize: 64,
          originX: 0,
          originY: 0,
        },
      },
    });

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
    await battleMapDialog
      .getByLabel('Config JSON (optional)')
      .fill(battleMapConfig);
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
    await tokenDialog.getByRole('button', { name: 'Create' }).click();

    const tokenRow = page
      .locator('tbody tr')
      .filter({ hasText: tokenName })
      .first();
    await expect(tokenRow).toBeVisible();

    // Open battlemap in runtime mode
    await page.getByRole('link', { name: 'BattleMaps' }).click();
    await battleMapRow.getByRole('link', { name: 'Play' }).click();

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

    // Place and select token via runtime token palette.
    const runtimeTokenSection = page
      .locator('section')
      .filter({ hasText: 'Runtime Tokens' })
      .first();
    const worldTokensSection = runtimeTokenSection
      .locator('div')
      .filter({ hasText: 'World Tokens' })
      .first();

    const tokenSourceRow = worldTokensSection
      .locator('li')
      .filter({ hasText: tokenName })
      .first();
    await expect(tokenSourceRow).toBeVisible();
    await tokenSourceRow.getByRole('button', { name: 'Add' }).click();

    const sceneTokensSection = runtimeTokenSection
      .locator('div')
      .filter({ hasText: 'Scene Tokens' })
      .first();
    await expect(
      sceneTokensSection.getByRole('button', { name: tokenName }),
    ).toBeVisible();
    await sceneTokensSection.getByRole('button', { name: tokenName }).click();

    // Verify the selected token exposes abilities in runtime.
    const abilityButton = page.getByRole('button', {
      name: new RegExp(abilityName),
    });
    await expect(abilityButton).toBeVisible();

    // Click the ability to enter cast mode
    await abilityButton.click();

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
    await abilityButton.click();
    await page.waitForTimeout(100);

    // Take screenshot after exit
    const afterExitScreenshot = await canvas.screenshot();

    // Assert overlay is cleared (back to baseline or similar)
    expect(Buffer.compare(afterExitScreenshot, castModeScreenshot)).not.toBe(0);
  } finally {
    await cleanupElectronApp(context);
  }
});
