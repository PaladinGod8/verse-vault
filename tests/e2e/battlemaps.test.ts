import { expect, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

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

test('battlemaps CRUD flow works end to end', async () => {
  const { app, userDataDir } = await launchApp();

  try {
    const window = await getMainWindow(app);
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find((candidate) => {
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
    const worldName = `E2E BattleMap World ${unique}`;
    const battleMapName = `Dungeon Grid ${unique}`;
    const renamedBattleMapName = `${battleMapName} Updated`;

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

    await window.getByRole('link', { name: 'BattleMaps' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();
    await expect(window.getByText('No BattleMaps yet.')).toBeVisible();

    await window.getByRole('button', { name: 'New BattleMap' }).click();
    const createDialog = window.getByRole('dialog', { name: 'New BattleMap' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name').fill(battleMapName);
    await createDialog
      .getByRole('button', { name: 'Create BattleMap' })
      .click();
    await expect(battleMapRow(window, battleMapName)).toBeVisible();
    await expect(
      battleMapRow(window, battleMapName).getByRole('link', { name: 'Play' }),
    ).toBeVisible();

    await battleMapRow(window, battleMapName)
      .getByRole('link', { name: 'Play' })
      .click();
    await expect(window.getByText('Runtime Canvas')).toBeVisible();
    await expect(
      window.getByRole('button', { name: 'Exit Runtime' }),
    ).toBeVisible();
    await window.getByRole('button', { name: 'Exit Runtime' }).click();
    await expect(battleMapRow(window, battleMapName)).toBeVisible();

    await battleMapRow(window, battleMapName)
      .getByRole('button', { name: 'Edit' })
      .click();
    const editDialog = window.getByRole('dialog', { name: 'Edit BattleMap' });
    await expect(editDialog).toBeVisible();
    const editNameInput = editDialog.getByLabel('Name');
    await editNameInput.fill(renamedBattleMapName);
    await editNameInput.press('Enter');
    await expect(battleMapRow(window, renamedBattleMapName)).toBeVisible();

    await battleMapRow(window, renamedBattleMapName)
      .getByRole('button', { name: 'Delete' })
      .click();
    const deleteDialog = window.locator('.modal.modal-open').last();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(battleMapRow(window, renamedBattleMapName)).toHaveCount(0);
    await expect(window.getByText('No BattleMaps yet.')).toBeVisible();
  } finally {
    await closeApp(app, userDataDir);
  }
});
