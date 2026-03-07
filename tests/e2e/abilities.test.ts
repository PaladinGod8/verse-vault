import { expect, test } from '@playwright/test';
import { closeApp, launchApp } from './helpers/launchApp';

function abilityRow(
  window: import('@playwright/test').Page,
  abilityName: string,
) {
  return window.locator('tbody tr').filter({ hasText: abilityName }).first();
}

test('abilities CRUD and child-link flow works end to end', async () => {
  const { app, userDataDir } = await launchApp();

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
    const worldName = `E2E World ${unique}`;
    const parentAbilityName = `Anchor ${unique}`;
    const childAbilityName = `Spark ${unique}`;
    const childAbilityUpdatedName = `${childAbilityName} Updated`;

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
    await window.getByRole('link', { name: 'Abilities' }).click();
    await expect(
      window.getByRole('heading', { name: worldName, level: 1 }),
    ).toBeVisible();

    await window.getByRole('button', { name: 'New Ability' }).click();
    const createParentDialog = window.getByRole('dialog', {
      name: 'New Ability',
    });
    await expect(createParentDialog).toBeVisible();
    await createParentDialog.getByLabel('Name').fill(parentAbilityName);
    await createParentDialog.getByLabel('Type').selectOption('passive');
    await createParentDialog
      .getByLabel('Passive subtype (optional)')
      .selectOption('linchpin');
    await createParentDialog
      .getByRole('button', { name: 'Create ability' })
      .click();
    await expect(abilityRow(window, parentAbilityName)).toBeVisible();

    await window.getByRole('button', { name: 'New Ability' }).click();
    const createChildDialog = window.getByRole('dialog', {
      name: 'New Ability',
    });
    await expect(createChildDialog).toBeVisible();
    await createChildDialog.getByLabel('Name').fill(childAbilityName);
    await createChildDialog.getByLabel('Type').selectOption('active');
    await createChildDialog
      .getByRole('button', { name: 'Create ability' })
      .click();
    await expect(abilityRow(window, childAbilityName)).toBeVisible();

    await abilityRow(window, childAbilityName)
      .getByRole('button', { name: 'Edit' })
      .click();
    const editDialog = window.getByRole('dialog', { name: 'Edit Ability' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Name').fill(childAbilityUpdatedName);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(abilityRow(window, childAbilityUpdatedName)).toBeVisible();

    await abilityRow(window, parentAbilityName)
      .getByRole('button', { name: 'Manage children' })
      .click();
    const childrenDialog = window.getByRole('dialog', {
      name: `Manage children - ${parentAbilityName}`,
    });
    await expect(childrenDialog).toBeVisible();

    const availableSection = childrenDialog
      .getByRole('heading', { name: 'Available abilities' })
      .locator('..');
    await availableSection
      .locator('li')
      .filter({ hasText: childAbilityUpdatedName })
      .getByRole('button', { name: 'Add' })
      .click();

    const linkedSection = childrenDialog
      .getByRole('heading', { name: 'Linked children' })
      .locator('..');
    const linkedChild = linkedSection
      .locator('li')
      .filter({ hasText: childAbilityUpdatedName });
    await expect(linkedChild).toBeVisible();
    await linkedChild.getByRole('button', { name: 'Remove' }).click();
    await expect(linkedChild).toHaveCount(0);
    await childrenDialog.getByRole('button', { name: 'Close' }).click();

    await abilityRow(window, childAbilityUpdatedName)
      .getByRole('button', { name: 'Delete' })
      .click();
    const childDeleteDialog = window.locator('.modal.modal-open').last();
    await expect(childDeleteDialog).toBeVisible();
    await childDeleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(abilityRow(window, childAbilityUpdatedName)).toHaveCount(0);

    await abilityRow(window, parentAbilityName)
      .getByRole('button', { name: 'Delete' })
      .click();
    const parentDeleteDialog = window.locator('.modal.modal-open').last();
    await expect(parentDeleteDialog).toBeVisible();
    await parentDeleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(abilityRow(window, parentAbilityName)).toHaveCount(0);
  } finally {
    await closeApp(app, userDataDir);
  }
});
