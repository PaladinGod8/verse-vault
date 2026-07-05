import { expect, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createAct,
  createArc,
  createCampaign,
  createSession,
  createWorld,
  launchElectronApp,
} from './helpers';

test('@critical @ux campaign and session scenes routes support listing, edit, move, and delete', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId, campaignName } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId } = await createAct(page, arcId);
    const { sessionId: firstSessionId, sessionName: firstSessionName } = await createSession(
      page,
      actId,
      `Session One ${Date.now()}`,
    );
    const { sessionId: secondSessionId, sessionName: secondSessionName } = await createSession(
      page,
      actId,
      `Session Two ${Date.now()}`,
    );
    const baseUrl = page.url().split('#')[0];

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actId}/session/${firstSessionId}/scenes`,
    );
    await expect(page.getByRole('button', { name: 'New Scene' })).toBeVisible();

    await page.getByRole('button', { name: 'New Scene' }).click();
    let dialog = page.getByRole('dialog', { name: 'New Scene' });
    await dialog.getByLabel('Name').fill('The Opening');
    await dialog.getByLabel('Notes (optional)').fill('Players arrive.');
    await dialog.getByRole('button', { name: 'Create scene' }).click();

    const sceneRow = page.locator('tr').filter({ hasText: 'The Opening' }).first();
    await expect(sceneRow).toBeVisible();

    await sceneRow.getByRole('button', { name: 'Edit' }).click();
    dialog = page.getByRole('dialog', { name: 'Edit Scene' });
    await dialog.getByLabel('Name').fill('The Opening Prime');
    await dialog.getByLabel('Notes (optional)').fill('Players arrive in storm.');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.locator('tr').filter({ hasText: 'The Opening Prime' }).first()).toBeVisible();

    await page.goto(`${baseUrl}#/world/${worldId}/campaign/${campaignId}/scenes`);
    await expect(
      page.getByRole('heading', { name: `${campaignName} - Scenes`, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'The Opening Prime' })).toBeVisible();
    await expect(page.getByText(firstSessionName)).toBeVisible();
    await page.getByRole('link', { name: 'Open Session Scenes' }).click();

    await expect(page.getByRole('heading', { name: firstSessionName, level: 1 })).toBeVisible();
    const updatedRow = page.locator('tr').filter({ hasText: 'The Opening Prime' }).first();
    await updatedRow.getByRole('button', { name: 'Move' }).click();

    const moveDialog = page.getByRole('dialog', { name: /Move .*The Opening Prime.*/i });
    await expect(moveDialog).toBeVisible();
    await moveDialog.getByRole('radio', { name: secondSessionName }).click();
    await moveDialog.getByRole('button', { name: 'Move' }).click();

    await expect(page.getByText('No scenes yet.')).toBeVisible();

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actId}/session/${secondSessionId}/scenes`,
    );
    const movedRow = page.locator('tr').filter({ hasText: 'The Opening Prime' }).first();
    await expect(movedRow).toBeVisible();

    await movedRow.getByRole('button', { name: 'Delete' }).click();
    const confirmDialog = page.getByRole('dialog', { name: 'Delete "The Opening Prime"?' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No scenes yet.')).toBeVisible();
  } finally {
    await cleanupElectronApp(context);
  }
});
