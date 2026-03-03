import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

const mainJs = path.join(__dirname, '../../.vite/build/main.js');

function battleMapRow(
  window: import('@playwright/test').Page,
  battleMapName: string,
) {
  return window.locator('tbody tr').filter({ hasText: battleMapName }).first();
}

test('battlemaps CRUD flow works end to end', async () => {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({ args: [mainJs], env });

  try {
    const window = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) {
        return;
      }
      win.setSize(1440, 960);
      win.center();
      win.focus();
    });
    await window.bringToFront();
    await window.waitForLoadState('domcontentloaded');

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
    await app.close();
  }
});
