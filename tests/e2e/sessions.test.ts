import { expect, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createAct,
  createArc,
  createCampaign,
  createWorld,
  launchElectronApp,
} from './helpers';

test('@critical @ux sessions support create, edit, move, and delete', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId: actOneId } = await createAct(page, arcId, `Act One ${Date.now()}`);
    const { actId: actTwoId, actName: actTwoName } = await createAct(
      page,
      arcId,
      `Act Two ${Date.now()}`,
    );
    const baseUrl = page.url().split('#')[0];

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actOneId}/sessions`,
    );
    await expect(page.getByRole('button', { name: 'New Session' })).toBeVisible();

    await page.getByRole('button', { name: 'New Session' }).click();
    let dialog = page.getByRole('dialog', { name: 'New Session' });
    await dialog.getByLabel('Name').fill('Session One');
    await dialog.getByLabel('Notes (optional)').fill('Opening beats');
    await dialog.getByLabel('Planned date-time (optional)').fill('2026-03-10T09:45');
    await dialog.getByRole('button', { name: 'Create session' }).click();

    await page.getByRole('button', { name: 'New Session' }).click();
    dialog = page.getByRole('dialog', { name: 'New Session' });
    await dialog.getByLabel('Name').fill('Session Two');
    await dialog.getByRole('button', { name: 'Create session' }).click();

    const sessionOneRow = page.locator('tr').filter({ hasText: 'Session One' }).first();
    const sessionTwoRow = page.locator('tr').filter({ hasText: 'Session Two' }).first();
    await expect(sessionOneRow).toBeVisible();
    await expect(sessionTwoRow).toBeVisible();

    await sessionOneRow.getByRole('button', { name: 'Edit' }).click();
    dialog = page.getByRole('dialog', { name: 'Edit Session' });
    await dialog.getByLabel('Name').fill('Session One Prime');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    const updatedRow = page.locator('tr').filter({ hasText: 'Session One Prime' }).first();
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole('button', { name: 'Move' }).click();
    const moveDialog = page.getByRole('dialog', { name: /Move .* to Act/i });
    await expect(moveDialog).toBeVisible();
    await moveDialog.getByRole('radio', { name: actTwoName }).click();
    await moveDialog.getByRole('button', { name: 'Move' }).click();

    await expect(page.locator('tr').filter({ hasText: 'Session One Prime' })).toHaveCount(0);

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actTwoId}/sessions`,
    );
    await expect(page.locator('tr').filter({ hasText: 'Session One Prime' }).first()).toBeVisible();

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actOneId}/sessions`,
    );
    await sessionTwoRow.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Delete "Session Two"?' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No sessions yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
