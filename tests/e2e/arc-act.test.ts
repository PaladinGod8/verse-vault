import { type ElectronApplication, expect, type Page, test } from '@playwright/test';
import { closeApp, launchApp as electronLaunchApp } from './helpers/launchApp';

// Unique suffix so repeated test runs don't collide on existing DB rows.
const TS = Date.now();
const WORLD_NAME = `E2E Arc World ${TS}`;
const CAMPAIGN_NAME = `E2E Campaign ${TS}`;
const ARC_NAME = `Arc Alpha ${TS}`;
const ARC_NAME_RENAMED = `Arc Alpha Renamed ${TS}`;
const ARC2_NAME = `Arc Beta ${TS}`;
const ACT_NAME = `Chapter One ${TS}`;
const ACT_NAME_RENAMED = `Chapter One Renamed ${TS}`;
const SESSION_NAME = `Session One ${TS}`;

let app: ElectronApplication;
let page: Page;
let userDataDir: string;

function tableRowByText(text: string) {
  return page.locator('tbody tr').filter({ hasText: text }).first();
}

async function setupApp() {
  const result = await electronLaunchApp();
  app = result.app;
  userDataDir = result.userDataDir;

  page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    win.setSize(1440, 960);
    win.center();
    win.focus();
  });
  await page.bringToFront();
  await page.waitForLoadState('domcontentloaded');
}

async function ensurePageIsAvailable() {
  if (!page.isClosed()) {
    return;
  }

  try {
    const windows = app.windows();
    if (windows.length > 0) {
      [page] = windows;
      await page.bringToFront();
      await page.waitForLoadState('domcontentloaded');
      return;
    }
  } catch {
    // Relaunch below when the Electron connection is no longer available.
  }

  await setupApp();
}

async function navigateToCampaignArcsPage() {
  await ensurePageIsAvailable();

  if (
    await page
      .getByRole('heading', { name: /arcs/i })
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  const campaignsLink = page.getByRole('link', { name: 'Campaigns' });
  if (await campaignsLink.isVisible().catch(() => false)) {
    await campaignsLink.click();
  } else {
    await page.getByLabel(`Open ${WORLD_NAME}`).click();
    await page.getByRole('link', { name: 'Campaigns' }).click();
  }

  const campaignRow = page
    .locator('tr, li, article')
    .filter({ hasText: CAMPAIGN_NAME });
  await campaignRow.getByRole('link', { name: 'Arcs' }).click();
  await expect(page.getByRole('heading', { name: /arcs/i })).toBeVisible();
}

test.describe('Arc / Act full flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await setupApp();
  });

  test.afterAll(async () => {
    await closeApp(app, userDataDir);
  });

  // ────────────────────────────────────────────────────────────────────────
  // World + Campaign setup
  // ────────────────────────────────────────────────────────────────────────

  test('creates a world and verifies home screen', async () => {
    await expect(
      page.getByRole('heading', { name: 'Worlds', level: 1 }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Create world', exact: true })
      .click();
    const worldDialog = page.getByRole('dialog', { name: 'Create world' });
    await expect(worldDialog).toBeVisible();
    await worldDialog.getByLabel('Name').fill(WORLD_NAME);
    await worldDialog
      .getByRole('button', { name: 'Create world', exact: true })
      .click();

    await expect(page.getByLabel(`Open ${WORLD_NAME}`)).toBeVisible();
  });

  test('opens world and creates a campaign', async () => {
    await page.getByLabel(`Open ${WORLD_NAME}`).click();

    // Navigate to Campaigns via sidebar
    await page.getByRole('link', { name: 'Campaigns' }).click();
    await expect(
      page.getByRole('heading', { name: WORLD_NAME, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /new campaign/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /new campaign/i }).click();
    const campaignDialog = page.getByRole('dialog', { name: 'New Campaign' });
    await expect(campaignDialog).toBeVisible();
    await campaignDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(CAMPAIGN_NAME);
    await campaignDialog
      .getByRole('button', { name: /create campaign/i })
      .click();

    await expect(tableRowByText(CAMPAIGN_NAME)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Arc CRUD
  // ────────────────────────────────────────────────────────────────────────

  test('navigates to ArcsPage from campaigns list', async () => {
    // Click the Arcs link for the campaign we just created
    const campaignRow = page.locator('tr, li, article').filter({
      hasText: CAMPAIGN_NAME,
    });
    await campaignRow.getByRole('link', { name: 'Arcs' }).click();

    await expect(page.getByRole('heading', { name: /arcs/i })).toBeVisible();
    await expect(page.getByText('No arcs yet.')).toBeVisible();
  });

  test('creates an arc', async () => {
    await page.getByRole('button', { name: /new arc/i }).click();
    const createArcDialog = page.getByRole('dialog', { name: 'New Arc' });
    await expect(createArcDialog).toBeVisible();
    await createArcDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(ARC_NAME);
    await createArcDialog.getByRole('button', { name: /create arc/i }).click();

    await expect(tableRowByText(ARC_NAME)).toBeVisible();
  });

  test('edits an arc', async () => {
    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME });
    await arcRow.getByRole('button', { name: 'Edit' }).click();

    const editArcDialog = page.getByRole('dialog', { name: 'Edit Arc' });
    await expect(editArcDialog).toBeVisible();
    const input = editArcDialog.getByRole('textbox', { name: /^name/i });
    await input.clear();
    await input.fill(ARC_NAME_RENAMED);
    await editArcDialog.getByRole('button', { name: 'Save' }).click();

    await expect(tableRowByText(ARC_NAME_RENAMED)).toBeVisible();
    await expect(tableRowByText(ARC_NAME)).toHaveCount(0);
  });

  test('creates a second arc for reparent tests', async () => {
    await page.getByRole('button', { name: /new arc/i }).click();
    const createArcDialog = page.getByRole('dialog', { name: 'New Arc' });
    await expect(createArcDialog).toBeVisible();
    await createArcDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(ARC2_NAME);
    await createArcDialog.getByRole('button', { name: /create arc/i }).click();

    await expect(tableRowByText(ARC2_NAME)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Act CRUD (inside first arc)
  // ────────────────────────────────────────────────────────────────────────

  test('navigates from arc to ActsPage', async () => {
    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME_RENAMED });
    await arcRow.getByRole('link', { name: 'Acts' }).click();

    await expect(page.getByRole('heading', { name: /acts/i })).toBeVisible();
    await expect(page.getByText('No acts yet.')).toBeVisible();
  });

  test('creates an act', async () => {
    await page.getByRole('button', { name: /new act/i }).click();
    const createActDialog = page.getByRole('dialog', { name: 'New Act' });
    await expect(createActDialog).toBeVisible();
    await createActDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(ACT_NAME);
    await createActDialog.getByRole('button', { name: /create act/i }).click();

    await expect(tableRowByText(ACT_NAME)).toBeVisible();
  });

  test('edits an act', async () => {
    const actRow = page.locator('tr').filter({ hasText: ACT_NAME });
    await actRow.getByRole('button', { name: 'Edit' }).click();

    const editActDialog = page.getByRole('dialog', { name: 'Edit Act' });
    await expect(editActDialog).toBeVisible();
    const input = editActDialog.getByRole('textbox', { name: /^name/i });
    await input.clear();
    await input.fill(ACT_NAME_RENAMED);
    await editActDialog.getByRole('button', { name: 'Save' }).click();

    await expect(tableRowByText(ACT_NAME_RENAMED)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Session under an act
  // ────────────────────────────────────────────────────────────────────────

  test('navigates from act to SessionsPage and creates a session', async () => {
    const actRow = page.locator('tr').filter({ hasText: ACT_NAME_RENAMED });
    await actRow.getByRole('link', { name: 'Sessions' }).click();

    await expect(
      page.getByRole('heading', { name: /sessions/i }),
    ).toBeVisible();
    await expect(page.getByText('No sessions yet.')).toBeVisible();

    await page.getByRole('button', { name: /new session/i }).click();
    const createSessionDialog = page.getByRole('dialog', {
      name: 'New Session',
    });
    await expect(createSessionDialog).toBeVisible();
    await createSessionDialog
      .getByRole('textbox', { name: /^name/i })
      .fill(SESSION_NAME);
    await createSessionDialog
      .getByRole('button', { name: /create session/i })
      .click();

    await expect(tableRowByText(SESSION_NAME)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Move act to a different arc
  // ────────────────────────────────────────────────────────────────────────

  test('moves act to second arc via MoveActDialog', async () => {
    await navigateToCampaignArcsPage();
    await expect(tableRowByText(ARC_NAME_RENAMED)).toBeVisible();

    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME_RENAMED });
    await arcRow.getByRole('link', { name: 'Acts' }).click();

    await expect(tableRowByText(ACT_NAME_RENAMED)).toBeVisible();

    // Click Move
    const actRow = page.locator('tr').filter({ hasText: ACT_NAME_RENAMED });
    await actRow.getByRole('button', { name: 'Move' }).click();

    // MoveActDialog should appear with Arc Beta as option
    const moveDialog = page.locator('.modal.modal-open').last();
    await expect(moveDialog).toBeVisible();
    await expect(moveDialog.getByText(ARC2_NAME)).toBeVisible();
    await moveDialog
      .getByRole('radio', { name: new RegExp(ARC2_NAME, 'i') })
      .click();
    await moveDialog.getByRole('button', { name: 'Move' }).click();

    // Act should disappear from first arc's list
    await expect(tableRowByText(ACT_NAME_RENAMED)).toHaveCount(0);
    await expect(page.getByText('No acts yet.')).toBeVisible();
  });

  test('verifies moved act appears under the second arc', async () => {
    await navigateToCampaignArcsPage();
    await expect(tableRowByText(ARC2_NAME)).toBeVisible();

    const arc2Row = page.locator('tr').filter({ hasText: ARC2_NAME });
    await arc2Row.getByRole('link', { name: 'Acts' }).click();

    await expect(tableRowByText(ACT_NAME_RENAMED)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Delete arc
  // ────────────────────────────────────────────────────────────────────────

  test('deletes first arc (now empty)', async () => {
    await navigateToCampaignArcsPage();
    await expect(tableRowByText(ARC_NAME_RENAMED)).toBeVisible();

    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME_RENAMED });
    await arcRow.getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = page.locator('.modal.modal-open').last();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(tableRowByText(ARC_NAME_RENAMED)).toHaveCount(0);
  });
});
