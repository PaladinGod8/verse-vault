import { expect, type Page, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createAct,
  createArc,
  createCampaign,
  createWorld,
  launchElectronApp,
} from './helpers';

function rowByText(page: Page, text: string) {
  return page.locator('tbody tr').filter({ hasText: text }).first();
}

test.describe('@critical @runtime @ux Arc / Act full flow', () => {
  test('@runtime creates a world, adds a campaign, and manages arcs from campaign navigation', async () => {
    const context = await launchElectronApp();

    try {
      const { page } = context;
      const worldName = `E2E Arc World ${Date.now()}`;
      const campaignName = `E2E Campaign ${Date.now()}`;
      const arcName = `Arc Alpha ${Date.now()}`;
      const renamedArcName = `${arcName} Prime`;

      await expect(page.getByRole('heading', { name: 'Worlds', level: 1 })).toBeVisible();

      await page.getByRole('button', { name: 'Create world', exact: true }).click();
      const worldDialog = page.getByRole('dialog', { name: 'Create world' });
      await expect(worldDialog).toBeVisible();
      await worldDialog.getByLabel('Name').fill(worldName);
      await worldDialog.getByRole('button', { name: 'Create world', exact: true }).click();
      await expect(page.getByRole('button', { name: `Open ${worldName}` })).toBeVisible();

      await page.getByRole('button', { name: `Open ${worldName}` }).click();
      await page.getByRole('link', { name: 'Campaigns' }).click();
      await expect(page.getByRole('heading', { name: worldName, level: 1 })).toBeVisible();

      await page.getByRole('button', { name: /new campaign/i }).click();
      const campaignDialog = page.getByRole('dialog', { name: 'New Campaign' });
      await expect(campaignDialog).toBeVisible();
      await campaignDialog.getByRole('textbox', { name: /^name/i }).fill(campaignName);
      await campaignDialog.getByRole('button', { name: /create campaign/i }).click();

      const campaignRow = page.locator('tr, li, article').filter({ hasText: campaignName });
      await expect(campaignRow).toBeVisible();
      await campaignRow.getByRole('link', { name: 'Arcs' }).click();

      await expect(page.getByRole('heading', { name: /arcs/i })).toBeVisible();
      await expect(page.getByText('No arcs yet.')).toBeVisible();

      await page.getByRole('button', { name: /new arc/i }).click();
      const createArcDialog = page.getByRole('dialog', { name: 'New Arc' });
      await createArcDialog.getByRole('textbox', { name: /^name/i }).fill(arcName);
      await createArcDialog.getByRole('button', { name: /create arc/i }).click();

      const createdArcRow = rowByText(page, arcName);
      await expect(createdArcRow).toBeVisible();
      await createdArcRow.getByRole('button', { name: 'Edit' }).click();

      const editArcDialog = page.getByRole('dialog', { name: 'Edit Arc' });
      await editArcDialog.getByRole('textbox', { name: /^name/i }).fill(renamedArcName);
      await editArcDialog.getByRole('button', { name: 'Save' }).click();

      const renamedArcRow = rowByText(page, renamedArcName);
      await expect(renamedArcRow).toBeVisible();
      await renamedArcRow.getByRole('button', { name: 'Delete' }).click();

      const confirmDialog = page.locator('.modal.modal-open').last();
      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(rowByText(page, renamedArcName)).toHaveCount(0);
      await expect(page.getByText('No arcs yet.')).toBeVisible();
    } finally {
      await cleanupElectronApp(context);
    }
  });

  test('@runtime acts page supports create, edit, and move to another arc', async () => {
    const context = await launchElectronApp();

    try {
      const { page } = context;
      const { worldId } = await createWorld(page);
      const { campaignId } = await createCampaign(page, worldId);
      const { arcId: firstArcId, arcName: firstArcName } = await createArc(
        page,
        campaignId,
        `Arc One ${Date.now()}`,
      );
      const { arcId: secondArcId, arcName: secondArcName } = await createArc(
        page,
        campaignId,
        `Arc Two ${Date.now()}`,
      );
      const baseUrl = page.url().split('#')[0];
      const actName = `Chapter One ${Date.now()}`;
      const renamedActName = `${actName} Prime`;

      await page.goto(`${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${firstArcId}/acts`);
      await expect(page.getByRole('heading', { name: /acts/i })).toBeVisible();
      await expect(page.getByText('No acts yet.')).toBeVisible();

      await page.getByRole('button', { name: /new act/i }).click();
      const createActDialog = page.getByRole('dialog', { name: 'New Act' });
      await createActDialog.getByRole('textbox', { name: /^name/i }).fill(actName);
      await createActDialog.getByRole('button', { name: /create act/i }).click();

      const createdActRow = rowByText(page, actName);
      await expect(createdActRow).toBeVisible();
      await createdActRow.getByRole('button', { name: 'Edit' }).click();

      const editActDialog = page.getByRole('dialog', { name: 'Edit Act' });
      await editActDialog.getByRole('textbox', { name: /^name/i }).fill(renamedActName);
      await editActDialog.getByRole('button', { name: 'Save' }).click();

      const renamedActRow = rowByText(page, renamedActName);
      await expect(renamedActRow).toBeVisible();
      await renamedActRow.getByRole('button', { name: 'Move' }).click();

      const moveDialog = page.locator('.modal.modal-open').last();
      await expect(moveDialog).toBeVisible();
      await expect(moveDialog.getByText(secondArcName)).toBeVisible();
      await moveDialog.getByRole('radio', { name: new RegExp(secondArcName, 'i') }).click();
      await moveDialog.getByRole('button', { name: 'Move' }).click();

      await expect(rowByText(page, renamedActName)).toHaveCount(0);
      await expect(page.getByText('No acts yet.')).toBeVisible();

      await page.goto(
        `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${secondArcId}/acts`,
      );
      await expect(page.getByRole('heading', { name: /acts/i })).toBeVisible();
      await expect(rowByText(page, renamedActName)).toBeVisible();
      await expect(page.getByText(secondArcName)).toBeVisible();
      await expect(page.getByText(firstArcName)).toHaveCount(0);
    } finally {
      await cleanupElectronApp(context);
    }
  });

  test('@runtime sessions page supports session creation from an act', async () => {
    const context = await launchElectronApp();

    try {
      const { page } = context;
      const { worldId } = await createWorld(page);
      const { campaignId } = await createCampaign(page, worldId);
      const { arcId } = await createArc(page, campaignId);
      const { actId } = await createAct(page, arcId, `Act ${Date.now()}`);
      const baseUrl = page.url().split('#')[0];
      const sessionName = `Session One ${Date.now()}`;

      await page.goto(
        `${baseUrl}#/world/${worldId}/campaign/${campaignId}/arc/${arcId}/act/${actId}/sessions`,
      );
      await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
      await expect(page.getByText('No sessions yet.')).toBeVisible();

      await page.getByRole('button', { name: /new session/i }).click();
      const createSessionDialog = page.getByRole('dialog', { name: 'New Session' });
      await createSessionDialog.getByRole('textbox', { name: /^name/i }).fill(sessionName);
      await createSessionDialog.getByRole('button', { name: /create session/i }).click();

      await expect(rowByText(page, sessionName)).toBeVisible();
    } finally {
      await cleanupElectronApp(context);
    }
  });
});
