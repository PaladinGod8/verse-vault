import {
  test,
  expect,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

// Requires `yarn package` to have been run first so that
// .vite/build/main.js and .vite/renderer/main_window/ exist.
const mainJs = path.join(__dirname, '../../.vite/build/main.js');

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

async function launchApp() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE; // CRITICAL: prevents Electron from running as plain Node
  app = await electron.launch({ args: [mainJs], env });
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

test.describe('Arc / Act full flow', () => {
  test.beforeAll(async () => {
    await launchApp();
  });

  test.afterAll(async () => {
    await app.close();
  });

  // ────────────────────────────────────────────────────────────────────────
  // World + Campaign setup
  // ────────────────────────────────────────────────────────────────────────

  test('creates a world and verifies home screen', async () => {
    await expect(
      page.getByRole('heading', { name: 'Worlds', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Create world' }).click();
    await page.getByLabel('Name').fill(WORLD_NAME);
    await page.getByRole('button', { name: 'Create world' }).click();

    await expect(page.getByLabel(`Open ${WORLD_NAME}`)).toBeVisible();
  });

  test('opens world and creates a campaign', async () => {
    await page.getByLabel(`Open ${WORLD_NAME}`).click();

    // Navigate to Campaigns via sidebar
    await page.getByRole('link', { name: 'Campaigns' }).click();
    await expect(
      page.getByRole('heading', { name: /campaigns/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /new campaign/i }).click();
    await page.getByLabel(/name/i).fill(CAMPAIGN_NAME);
    await page.getByRole('button', { name: /create campaign/i }).click();

    await expect(page.getByText(CAMPAIGN_NAME)).toBeVisible();
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
    await page.getByLabel(/name/i).fill(ARC_NAME);
    await page.getByRole('button', { name: /create arc/i }).click();

    await expect(page.getByText(ARC_NAME)).toBeVisible();
  });

  test('edits an arc', async () => {
    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME });
    await arcRow.getByRole('button', { name: 'Edit' }).click();

    const input = page.getByLabel(/name/i);
    await input.clear();
    await input.fill(ARC_NAME_RENAMED);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(ARC_NAME_RENAMED)).toBeVisible();
    expect(page.getByText(ARC_NAME)).not.toBeDefined();
  });

  test('creates a second arc for reparent tests', async () => {
    await page.getByRole('button', { name: /new arc/i }).click();
    await page.getByLabel(/name/i).fill(ARC2_NAME);
    await page.getByRole('button', { name: /create arc/i }).click();

    await expect(page.getByText(ARC2_NAME)).toBeVisible();
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
    await page.getByLabel(/name/i).fill(ACT_NAME);
    await page.getByRole('button', { name: /create act/i }).click();

    await expect(page.getByText(ACT_NAME)).toBeVisible();
  });

  test('edits an act', async () => {
    const actRow = page.locator('tr').filter({ hasText: ACT_NAME });
    await actRow.getByRole('button', { name: 'Edit' }).click();

    const input = page.getByLabel(/name/i);
    await input.clear();
    await input.fill(ACT_NAME_RENAMED);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(ACT_NAME_RENAMED)).toBeVisible();
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
    await page.getByLabel(/name/i).fill(SESSION_NAME);
    await page.getByRole('button', { name: /create session/i }).click();

    await expect(page.getByText(SESSION_NAME)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Move act to a different arc
  // ────────────────────────────────────────────────────────────────────────

  test('moves act to second arc via MoveActDialog', async () => {
    // Navigate back to the first arc's acts page
    await page.getByRole('link', { name: /arcs/i }).click();

    // Wait for arc list
    await expect(page.getByText(ARC_NAME_RENAMED)).toBeVisible();

    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME_RENAMED });
    await arcRow.getByRole('link', { name: 'Acts' }).click();

    await expect(page.getByText(ACT_NAME_RENAMED)).toBeVisible();

    // Click Move
    const actRow = page.locator('tr').filter({ hasText: ACT_NAME_RENAMED });
    await actRow.getByRole('button', { name: 'Move' }).click();

    // MoveActDialog should appear with Arc Beta as option
    await expect(page.getByText(ARC2_NAME)).toBeVisible();

    await page.getByRole('radio', { name: new RegExp(ARC2_NAME, 'i') }).click();
    await page.getByRole('button', { name: 'Move' }).click();

    // Act should disappear from first arc's list
    await expect(page.getByText(ACT_NAME_RENAMED)).not.toBeVisible();
    await expect(page.getByText('No acts yet.')).toBeVisible();
  });

  test('verifies moved act appears under the second arc', async () => {
    await page.getByRole('link', { name: /arcs/i }).click();
    await expect(page.getByText(ARC2_NAME)).toBeVisible();

    const arc2Row = page.locator('tr').filter({ hasText: ARC2_NAME });
    await arc2Row.getByRole('link', { name: 'Acts' }).click();

    await expect(page.getByText(ACT_NAME_RENAMED)).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Delete arc
  // ────────────────────────────────────────────────────────────────────────

  test('deletes first arc (now empty)', async () => {
    await page.getByRole('link', { name: /arcs/i }).click();
    await expect(page.getByText(ARC_NAME_RENAMED)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    const arcRow = page.locator('tr').filter({ hasText: ARC_NAME_RENAMED });
    await arcRow.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(ARC_NAME_RENAMED)).not.toBeVisible();
  });
});
