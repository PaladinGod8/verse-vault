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

test('@critical @ux act-level scenes page supports stray creation, regrouping, cross-act move, and cascade delete', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId: firstActId } = await createAct(page, arcId, `Act One ${Date.now()}`);
    const { actId: secondActId, actName: secondActName } = await createAct(
      page,
      arcId,
      `Act Two ${Date.now()}`,
    );
    const { sessionName } = await createSession(page, firstActId, `Session One ${Date.now()}`);
    const baseUrl = page.url().split('#')[0];

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${firstActId}/scenes`,
    );
    await expect(page.getByRole('button', { name: 'New Scene' })).toBeVisible();

    await page.getByRole('button', { name: 'New Scene' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Scene' });
    await createDialog.getByLabel('Name').fill('Roaming Scene');
    await createDialog.getByRole('button', { name: 'Create scene' }).click();

    await expect(page.getByText('Stray Scenes')).toBeVisible();
    const sceneRow = page.locator('tr').filter({ hasText: 'Roaming Scene' }).first();
    await expect(sceneRow).toBeVisible();

    // Regroup the stray scene into a session within the same act.
    await sceneRow.getByRole('button', { name: 'Move' }).click();
    const moveDialog = page.getByRole('dialog', { name: /Move.*Roaming Scene/i });
    await expect(moveDialog).toBeVisible();
    await moveDialog.getByRole('radio', { name: sessionName }).click();
    await moveDialog.getByRole('button', { name: 'Move' }).click();

    await expect(page.getByText(`Session: ${sessionName}`)).toBeVisible();
    await expect(page.locator('tr').filter({ hasText: 'Roaming Scene' }).first()).toBeVisible();

    // Move to a different act entirely (no session) - scene should leave this act's page.
    await page.locator('tr').filter({ hasText: 'Roaming Scene' }).first()
      .getByRole('button', { name: 'Move' }).click();
    const crossActMoveDialog = page.getByRole('dialog', { name: /Move.*Roaming Scene/i });
    await expect(crossActMoveDialog).toBeVisible();
    await crossActMoveDialog.getByRole('radio', { name: secondActName }).click();
    await crossActMoveDialog.getByRole('radio', { name: /No session \(stray\)/i }).click();
    await crossActMoveDialog.getByRole('button', { name: 'Move' }).click();

    await expect(page.getByText('No scenes yet.')).toBeVisible();

    await page.goto(
      `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${secondActId}/scenes`,
    );
    await expect(page.getByText('Stray Scenes')).toBeVisible();
    await expect(page.locator('tr').filter({ hasText: 'Roaming Scene' }).first()).toBeVisible();

    // Deleting the act cascades to its stray scene.
    const sceneId = await page.evaluate(
      async (actId) => {
        const scenes = await window.db.scenes.getAllByAct(actId);
        return scenes[0]?.id ?? null;
      },
      secondActId,
    );
    expect(sceneId).not.toBeNull();

    await page.evaluate(async (actId) => window.db.acts.delete(actId), secondActId);

    const sceneAfterActDelete = await page.evaluate(
      async (id) => window.db.scenes.getById(id),
      sceneId as number,
    );
    expect(sceneAfterActDelete).toBeNull();
  } finally {
    await cleanupElectronApp(context);
  }
});
