import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

test('@ux rich-text editor formats prose, saves markdown, and renders sanitized HTML', async () => {
  const context = await launchElectronApp();

  try {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const baseUrl = page.url().split('#')[0];
    const noteName = `Rich Note ${Date.now()}`;

    await page.goto(`${baseUrl}#/world/${worldId}/lore-notes`);
    await expect(page.getByRole('button', { name: 'New Lore Note' })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'New Lore Note' }).click();
    const createDialog = page.getByRole('dialog', { name: 'New Lore Note' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Name *').fill(noteName);

    // Drive the ProseMirror surface with real keystrokes (fill() is unreliable
    // on contenteditable). Markdown input rules auto-format as we type.
    const editor = createDialog.getByLabel('Content');
    await editor.click();
    await page.keyboard.type('# Heading');
    await page.keyboard.press('Enter');
    await page.keyboard.type('The **Iron Dukes** rule the north.');

    // Toolbar Bold toggle on a fresh selection.
    await page.keyboard.press('Enter');
    await page.keyboard.type('bolded');
    await page.keyboard.press('Shift+Home');
    await createDialog.getByRole('button', { name: 'Bold' }).click();

    await createDialog.getByRole('button', { name: 'Create' }).click();

    // Detail view renders formatted, sanitized markdown.
    await page.getByRole('button', { name: `Open ${noteName}` }).click();
    await expect(page.getByRole('heading', { name: noteName, level: 1 })).toBeVisible();

    const markdownView = page.locator('.markdown-view').first();
    await expect(markdownView.locator('h1')).toHaveText('Heading');
    await expect(markdownView.locator('strong').first()).toHaveText('Iron Dukes');

    // Reopen: markdown re-hydrates into the editor.
    await page.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Lore Note' });
    await expect(editDialog).toBeVisible();
    await expect(editDialog.getByLabel('Content').locator('strong').first()).toHaveText(
      'Iron Dukes',
    );
  } finally {
    await cleanupElectronApp(context);
  }
});
