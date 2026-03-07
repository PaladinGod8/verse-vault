import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createCampaign,
  createCampaignScopedToken,
  createWorld,
  createWorldScopedToken,
  deleteCampaign,
  deleteWorld,
  ensureWorldsLanding,
  getMoveButton,
  goToTokensPage,
  launchElectronApp,
  selectCampaignInMoveDialog,
  tokenRow,
} from './helpers';

let app: ElectronApplication | null = null;
let page: Page | null = null;
let worldId: number | null = null;
let userDataDir: string | null = null;

function requireContext(): { page: Page; worldId: number; } {
  if (!page || worldId === null) {
    throw new Error('Expected test context to be initialized.');
  }
  return { page, worldId };
}

test.beforeEach(async () => {
  const launched = await launchElectronApp();
  app = launched.app;
  page = launched.page;
  userDataDir = launched.userDataDir;

  await ensureWorldsLanding(launched.page);

  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const world = await createWorld(
    launched.page,
    `E2E Token Move World ${unique}`,
  );
  worldId = world.worldId;
});

test.afterEach(async () => {
  if (page && worldId !== null && !page.isClosed()) {
    await deleteWorld(page, worldId);
  }

  if (app && page && userDataDir) {
    await cleanupElectronApp({ app, page, userDataDir });
  } else if (app) {
    await app.close().catch((): undefined => undefined);
  }

  app = null;
  page = null;
  worldId = null;
  userDataDir = null;
});

test.describe('Token Move Flows', () => {
  test('should move world-scoped token to campaign via dialog', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Movable Token ${unique}`;
    const { campaignName } = await createCampaign(
      window,
      targetWorldId,
      `Target Campaign ${unique}`,
    );

    await createWorldScopedToken(window, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      'World',
    );

    await getMoveButton(window, tokenName, 'to-campaign').click();

    const dialog = window.getByRole('dialog', {
      name: 'Move Token to Campaign',
    });
    await expect(dialog).toBeVisible();

    await selectCampaignInMoveDialog(window, campaignName);
    await dialog.getByRole('button', { name: 'Move' }).click();

    await expect(
      window.getByText(`Moved "${tokenName}" to ${campaignName}.`),
    ).toBeVisible();
    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      `Campaign: ${campaignName}`,
    );
  });

  test('should move campaign-scoped token to world via dialog', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Campaign Token ${unique}`;
    const { campaignId, campaignName } = await createCampaign(
      window,
      targetWorldId,
      `Source Campaign ${unique}`,
    );

    await createCampaignScopedToken(window, campaignId, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      `Campaign: ${campaignName}`,
    );

    await getMoveButton(window, tokenName, 'to-world').click();

    const dialog = window.getByRole('dialog', { name: 'Move Token to World' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Move' }).click();

    await expect(
      window.getByText(`Moved "${tokenName}" to World.`),
    ).toBeVisible();
    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      'World',
    );
  });

  test('should move token between campaigns in same world', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Multi-Campaign Token ${unique}`;
    const { campaignId: campaign1Id, campaignName: campaign1Name } = await createCampaign(
      window,
      targetWorldId,
      `Campaign 1 ${unique}`,
    );
    const { campaignName: campaign2Name } = await createCampaign(
      window,
      targetWorldId,
      `Campaign 2 ${unique}`,
    );

    await createCampaignScopedToken(window, campaign1Id, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      `Campaign: ${campaign1Name}`,
    );

    await getMoveButton(window, tokenName, 'to-campaign').click();
    const dialog = window.getByRole('dialog', {
      name: 'Move Token to Campaign',
    });
    await selectCampaignInMoveDialog(window, campaign2Name);
    await dialog.getByRole('button', { name: 'Move' }).click();

    await expect(
      window.getByText(`Moved "${tokenName}" to ${campaign2Name}.`),
    ).toBeVisible();
    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      `Campaign: ${campaign2Name}`,
    );
  });

  test('should cancel move without changes', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Cancellable Token ${unique}`;
    const { campaignId, campaignName } = await createCampaign(
      window,
      targetWorldId,
      `Campaign ${unique}`,
    );

    await createCampaignScopedToken(window, campaignId, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await getMoveButton(window, tokenName, 'to-world').click();

    const dialog = window.getByRole('dialog', { name: 'Move Token to World' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      `Campaign: ${campaignName}`,
    );
  });

  test('should disable confirm button when moving to campaign with no campaigns available', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Validation Token ${unique}`;

    await createWorldScopedToken(window, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await getMoveButton(window, tokenName, 'to-campaign').click();

    const dialog = window.getByRole('dialog', {
      name: 'Move Token to Campaign',
    });
    const confirmButton = dialog.getByRole('button', { name: 'Move' });

    await expect(confirmButton).toBeDisabled();
    await expect(
      dialog.getByText('No campaigns available in this world.'),
    ).toBeVisible();
  });

  test('world-scoped token shows Move to Campaign action only', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `World Token ${unique}`;

    await createWorldScopedToken(window, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    const row = tokenRow(window, tokenName);

    await expect(
      row.getByRole('button', { name: 'Move to Campaign' }),
    ).toBeVisible();
    await expect(
      row.getByRole('button', { name: 'Copy to Campaign' }),
    ).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('campaign-scoped token shows Move to World and Move to Campaign actions', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Campaign Token ${unique}`;
    const { campaignId } = await createCampaign(
      window,
      targetWorldId,
      `Campaign ${unique}`,
    );

    await createCampaignScopedToken(window, campaignId, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    const row = tokenRow(window, tokenName);

    await expect(
      row.getByRole('button', { name: 'Move to World' }),
    ).toBeVisible();
    await expect(
      row.getByRole('button', { name: 'Move to Campaign' }),
    ).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('should display error if campaign was deleted before confirm', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Orphan Token ${unique}`;
    const { campaignId, campaignName } = await createCampaign(
      window,
      targetWorldId,
      `Temp Campaign ${unique}`,
    );

    await createWorldScopedToken(window, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    await getMoveButton(window, tokenName, 'to-campaign').click();
    const dialog = window.getByRole('dialog', {
      name: 'Move Token to Campaign',
    });
    await expect(dialog).toBeVisible();
    await selectCampaignInMoveDialog(window, campaignName);

    await deleteCampaign(window, campaignId);

    await dialog.getByRole('button', { name: 'Move' }).click();

    await expect(window.getByText('Failed to move token.')).toBeVisible();
    await expect(window.getByText('Campaign not found')).toBeVisible();
    await expect(tokenRow(window, tokenName).locator('td').nth(3)).toHaveText(
      'World',
    );
  });

  test('token table refreshes immediately after successful move', async () => {
    const { page: window, worldId: targetWorldId } = requireContext();
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tokenName = `Refresh Token ${unique}`;
    const { campaignName } = await createCampaign(
      window,
      targetWorldId,
      `Campaign ${unique}`,
    );

    await createWorldScopedToken(window, {
      worldId: targetWorldId,
      name: tokenName,
    });
    await goToTokensPage(window, targetWorldId);

    const scopeCell = tokenRow(window, tokenName).locator('td').nth(3);
    await expect(scopeCell).toHaveText('World');

    await getMoveButton(window, tokenName, 'to-campaign').click();
    const dialog = window.getByRole('dialog', {
      name: 'Move Token to Campaign',
    });
    await selectCampaignInMoveDialog(window, campaignName);
    await dialog.getByRole('button', { name: 'Move' }).click();

    await expect(
      window.getByText(new RegExp(`Moved "${tokenName}"`)),
    ).toBeVisible({
      timeout: 5000,
    });
    await expect(scopeCell).toHaveText(`Campaign: ${campaignName}`);
    await expect(window).toHaveURL(
      new RegExp(`/world/${targetWorldId}/tokens$`),
    );
  });
});
