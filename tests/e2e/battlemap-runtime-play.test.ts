import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

const mainJs = path.join(__dirname, '../../.vite/build/main.js');

async function getMainWindow(
  app: import('playwright').ElectronApplication,
): Promise<import('@playwright/test').Page> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const windows = app.windows();
    const mainWindow = windows.find(
      (candidate) => !candidate.url().startsWith('devtools://'),
    );
    if (mainWindow) {
      return mainWindow;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Unable to find Electron main window for E2E test.');
}

function battleMapRow(
  window: import('@playwright/test').Page,
  battleMapName: string,
) {
  return window.locator('tbody tr').filter({ hasText: battleMapName }).first();
}

async function ensureWorldsLanding(window: import('@playwright/test').Page) {
  if (await window.getByRole('button', { name: 'Create world' }).isVisible()) {
    return;
  }

  const backToWorldsLink = window.getByRole('link', { name: 'Back to worlds' });
  if (await backToWorldsLink.isVisible().catch(() => false)) {
    await backToWorldsLink.click();
  } else {
    const backToWorldLink = window.getByRole('link', { name: 'Back to world' });
    if (await backToWorldLink.isVisible().catch(() => false)) {
      await backToWorldLink.click();
    }

    if (await backToWorldsLink.isVisible().catch(() => false)) {
      await backToWorldsLink.click();
    }
  }

  await expect(
    window.getByRole('heading', { name: 'Worlds', level: 1 }),
  ).toBeVisible();
  await expect(
    window.getByRole('button', { name: 'Create world' }),
  ).toBeVisible();
}

test('battlemap play runtime flow supports render, grid, token, camera, and exit', async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({ args: [mainJs], env });

  try {
    const window = await getMainWindow(app);
    await app.evaluate(({ BrowserWindow }) => {
      const win =
        BrowserWindow.getAllWindows().find((candidate) => {
          const url = candidate.webContents.getURL();
          return !url.startsWith('devtools://');
        }) ?? BrowserWindow.getAllWindows()[0];
      if (!win) {
        return;
      }
      win.setSize(1440, 960);
      win.center();
      win.focus();
    });
    await window.bringToFront();
    await window.waitForLoadState('domcontentloaded');
    await ensureWorldsLanding(window);

    const unique = Date.now().toString();
    const worldName = `E2E Runtime World ${unique}`;
    const campaignName = `E2E Runtime Campaign ${unique}`;
    const battleMapName = `E2E Runtime BattleMap ${unique}`;
    const tokenName = `E2E Runtime Token ${unique}`;

    await window.getByRole('button', { name: 'Create world' }).click();
    const worldDialog = window.getByRole('dialog', { name: 'Create world' });
    await expect(worldDialog).toBeVisible();
    await worldDialog.getByLabel('Name').fill(worldName);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();
    await expect(
      window.getByRole('button', { name: `Open ${worldName}` }),
    ).toBeVisible();
    await window.getByRole('button', { name: `Open ${worldName}` }).click();
    await expect(
      window.getByRole('heading', { name: 'World Overview', level: 1 }),
    ).toBeVisible();

    await window.getByRole('link', { name: 'Campaigns' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await window.getByRole('button', { name: 'New Campaign' }).click();
    const campaignDialog = window.getByRole('dialog', { name: 'New Campaign' });
    await expect(campaignDialog).toBeVisible();
    await campaignDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(campaignName);
    await campaignDialog
      .getByRole('button', { name: /create campaign/i })
      .click();
    await expect(
      window.locator('tbody tr').filter({ hasText: campaignName }).first(),
    ).toBeVisible();

    await window.getByRole('link', { name: 'BattleMaps' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await window.getByRole('button', { name: 'New BattleMap' }).click();
    const battleMapDialog = window.getByRole('dialog', {
      name: 'New BattleMap',
    });
    await expect(battleMapDialog).toBeVisible();
    await battleMapDialog.getByLabel('Name').fill(battleMapName);
    await battleMapDialog
      .getByRole('button', { name: 'Create BattleMap' })
      .click();
    await expect(battleMapRow(window, battleMapName)).toBeVisible();

    const seededRuntimeIds = await window.evaluate(
      async ({
        nextWorldName,
        nextCampaignName,
        nextBattleMapName,
        nextTokenName,
      }) => {
        const worlds = await window.db.worlds.getAll();
        const world = worlds.find(
          (candidate) => candidate.name === nextWorldName,
        );
        if (!world) {
          throw new Error('Unable to find world for runtime E2E setup.');
        }

        const campaigns = await window.db.campaigns.getAllByWorld(world.id);
        const campaign = campaigns.find(
          (candidate) => candidate.name === nextCampaignName,
        );
        if (!campaign) {
          throw new Error('Unable to find campaign for runtime E2E setup.');
        }

        const battlemaps = await window.db.battlemaps.getAllByWorld(world.id);
        const battlemap = battlemaps.find(
          (candidate) => candidate.name === nextBattleMapName,
        );
        if (!battlemap) {
          throw new Error('Unable to find battlemap for runtime E2E setup.');
        }

        await window.db.tokens.add({
          campaign_id: campaign.id,
          name: nextTokenName,
          is_visible: 1,
        });

        return {
          campaignId: campaign.id,
          battleMapId: battlemap.id,
        };
      },
      {
        nextWorldName: worldName,
        nextCampaignName: campaignName,
        nextBattleMapName: battleMapName,
        nextTokenName: tokenName,
      },
    );

    await battleMapRow(window, battleMapName)
      .getByRole('link', { name: 'Play' })
      .click();
    await expect(window.getByText('Runtime Canvas')).toBeVisible();

    const runtimeCanvas = window.locator('canvas').first();
    await expect(runtimeCanvas).toBeVisible();

    const gridControls = window
      .locator('section')
      .filter({ hasText: 'Runtime Grid Controls' })
      .first();
    const gridModeSelect = gridControls.locator('select').first();
    await expect(gridModeSelect).toHaveValue('square');

    const squareGridSnapshot = await runtimeCanvas.screenshot();
    await gridModeSelect.selectOption('none');
    await expect(gridModeSelect).toHaveValue('none');
    await expect
      .poll(
        async () =>
          window.evaluate(async (battleMapId) => {
            const battlemap = await window.db.battlemaps.getById(battleMapId);
            if (!battlemap) {
              return null;
            }
            const parsed = JSON.parse(battlemap.config) as {
              runtime?: { grid?: { mode?: string } };
            };
            return parsed.runtime?.grid?.mode ?? 'square';
          }, seededRuntimeIds.battleMapId),
        { timeout: 5000 },
      )
      .toBe('none');
    await window.waitForTimeout(250);
    const noGridSnapshot = await runtimeCanvas.screenshot();
    expect(noGridSnapshot.equals(squareGridSnapshot)).toBe(false);

    await window.getByRole('button', { name: 'Exit Runtime' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await expect(battleMapRow(window, battleMapName)).toBeVisible();

    await battleMapRow(window, battleMapName)
      .getByRole('link', { name: 'Play' })
      .click();
    await expect(window.getByText('Runtime Canvas')).toBeVisible();

    const reloadedGridModeSelect = window
      .locator('section')
      .filter({ hasText: 'Runtime Grid Controls' })
      .first()
      .locator('select')
      .first();
    await expect(reloadedGridModeSelect).toHaveValue('none');

    const runtimeTokenSection = window
      .locator('section')
      .filter({ hasText: 'Runtime Tokens' })
      .first();
    const campaignSelect = runtimeTokenSection.locator('select').first();
    await expect(campaignSelect).toBeVisible();
    await campaignSelect.selectOption(String(seededRuntimeIds.campaignId));
    const tokenSourceItem = runtimeTokenSection
      .locator('li')
      .filter({ hasText: tokenName })
      .first();
    await expect(tokenSourceItem).toBeVisible();
    await tokenSourceItem.getByRole('button', { name: 'Add' }).click();
    await expect(
      tokenSourceItem.getByRole('button', { name: 'Placed' }),
    ).toBeDisabled();
    await expect(
      runtimeTokenSection.getByRole('heading', { name: 'Scene Tokens (1)' }),
    ).toBeVisible();

    const placedTokenButton = runtimeTokenSection
      .getByRole('button', { name: tokenName })
      .first();
    await placedTokenButton.click();
    await window.waitForTimeout(450);

    const runtimeCanvasAfterReload = window.locator('canvas').first();
    await expect(runtimeCanvasAfterReload).toBeVisible();
    const canvasBounds = await runtimeCanvasAfterReload.boundingBox();
    expect(canvasBounds).not.toBeNull();
    if (!canvasBounds) {
      throw new Error('Runtime canvas bounds unavailable.');
    }

    const centerX = canvasBounds.x + canvasBounds.width * 0.5;
    const centerY = canvasBounds.y + canvasBounds.height * 0.5;

    const beforeTokenDrag = await runtimeCanvasAfterReload.screenshot();
    await window.mouse.move(centerX, centerY);
    await window.mouse.down();
    await window.mouse.move(centerX + 120, centerY + 75, { steps: 10 });
    await window.mouse.up();
    await window.waitForTimeout(250);
    const afterTokenDrag = await runtimeCanvasAfterReload.screenshot();
    const tokenDragChangedFrame = !afterTokenDrag.equals(beforeTokenDrag);

    const panStartX = canvasBounds.x + canvasBounds.width * 0.2;
    const panStartY = canvasBounds.y + canvasBounds.height * 0.2;
    const beforeCameraPan = await runtimeCanvasAfterReload.screenshot();
    await window.mouse.move(panStartX, panStartY);
    await window.mouse.down();
    await window.mouse.move(panStartX + 110, panStartY + 90, { steps: 10 });
    await window.mouse.up();
    await window.waitForTimeout(250);
    const afterCameraPan = await runtimeCanvasAfterReload.screenshot();
    expect(tokenDragChangedFrame || !afterCameraPan.equals(beforeCameraPan)).toBe(
      true,
    );
    expect(afterCameraPan.equals(beforeCameraPan)).toBe(false);

    await window.getByRole('button', { name: 'Exit Runtime' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await expect(battleMapRow(window, battleMapName)).toBeVisible();
    await expect(
      battleMapRow(window, battleMapName).getByRole('link', { name: 'Play' }),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});
