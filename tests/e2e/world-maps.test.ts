import { expect, test } from '@playwright/test';
import { cleanupElectronApp, createWorld, launchElectronApp } from './helpers';

function attachDialogAutoDismiss(
  app: Awaited<ReturnType<typeof launchElectronApp>>['app'],
): void {
  const attach = (page: Awaited<ReturnType<typeof launchElectronApp>>['page']) => {
    page.on('dialog', (dialog) => {
      void dialog.dismiss().catch((): undefined => undefined);
    });
  };

  app.windows().forEach(attach);
  app.on('window', attach);
}

async function getWorldMapHostWindow(
  app: Awaited<ReturnType<typeof launchElectronApp>>['app'],
): Promise<
  {
    title: string;
    url: string;
    bodyText: string;
    status: string;
    closeDisabled: boolean | null;
  } | null
> {
  return app.evaluate(async ({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows().filter((candidate) => {
      return !candidate.webContents.getURL().startsWith('devtools://');
    });
    const hostWindow = windows.find((candidate) => {
      return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
    });
    if (!hostWindow) {
      return null;
    }

    const [title, bodyText, status, closeDisabled] = await Promise.all([
      hostWindow.webContents.executeJavaScript('document.title', true),
      hostWindow.webContents.executeJavaScript('document.body?.innerText ?? ""', true),
      hostWindow.webContents.executeJavaScript(
        'document.getElementById("status-line")?.textContent ?? ""',
        true,
      ),
      hostWindow.webContents.executeJavaScript(
        'document.getElementById("close-button")?.disabled ?? null',
        true,
      ),
    ]);

    return {
      title,
      url: hostWindow.webContents.getURL(),
      bodyText,
      status,
      closeDisabled,
    };
  });
}

async function getWorldMapRow(
  worldId: number,
  page: Awaited<ReturnType<typeof launchElectronApp>>['page'],
) {
  return page.evaluate(async (targetWorldId) => {
    const row = await window.db.worldMaps.getByWorld(targetWorldId);
    return row
      ? {
        id: row.id,
        storage_key: row.storage_key,
        updated_at: row.updated_at,
      }
      : null;
  }, worldId);
}

test('@critical world map button opens dedicated editor window without precreating row', async () => {
  const context = await launchElectronApp();

  try {
    const { app, page } = context;
    const { worldId, worldName } = await createWorld(page, `World Map ${Date.now()}`);
    const baseUrl = page.url().split('#')[0];

    await page.goto(`${baseUrl}#/world/${worldId}/levels`);
    await expect(page.getByRole('button', { name: 'World Map' })).toBeVisible();

    await page.getByRole('button', { name: 'World Map' }).click();

    let hostWindow: Awaited<ReturnType<typeof getWorldMapHostWindow>> = null;
    await expect.poll(async () => {
      hostWindow = await getWorldMapHostWindow(app);
      return Boolean(
        hostWindow?.bodyText.includes(`${worldName} World Map`)
          && hostWindow.status.includes('Fresh generated map ready.')
          && hostWindow.closeDisabled === false,
      );
    }, { timeout: 30000 }).toBe(true);

    expect(hostWindow?.url).toBe('vv-fmg://app/index.html');
    expect(hostWindow?.bodyText).toContain('Verse Vault Save is canonical');
    await expect.poll(async () => {
      return getWorldMapRow(worldId, page);
    }).toBeNull();
  } finally {
    await context.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .filter((candidate) => {
          return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
        })
        .forEach((candidate) => candidate.destroy());
    }).catch((): undefined => undefined);
    await cleanupElectronApp(context);
  }
});

test('world map editor window closes when native window close is requested', async () => {
  const context = await launchElectronApp();

  try {
    const { app, page } = context;
    attachDialogAutoDismiss(app);
    const { worldId, worldName } = await createWorld(page, `World Map Close ${Date.now()}`);
    const baseUrl = page.url().split('#')[0];

    await page.goto(`${baseUrl}#/world/${worldId}/levels`);
    await expect(page.getByRole('button', { name: 'World Map' })).toBeVisible();

    await page.getByRole('button', { name: 'World Map' }).click();

    let hostWindow: Awaited<ReturnType<typeof getWorldMapHostWindow>> = null;
    await expect.poll(async () => {
      hostWindow = await getWorldMapHostWindow(app);
      return Boolean(
        hostWindow?.bodyText.includes(`${worldName} World Map`)
          && hostWindow.status.includes('Fresh generated map ready.')
          && hostWindow.closeDisabled === false,
      );
    }, { timeout: 30000 }).toBe(true);

    const hostPage = app.windows().find((candidate) => {
      return candidate.url().startsWith('vv-fmg://app/index.html');
    });
    hostPage?.on('dialog', (dialog) => {
      void dialog.dismiss().catch((): undefined => undefined);
    });

    await app.evaluate(({ BrowserWindow }) => {
      const hostWindow = BrowserWindow.getAllWindows().find((candidate) => {
        return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
      });
      hostWindow?.close();
    });

    await expect.poll(async () => {
      try {
        return await getWorldMapHostWindow(app);
      } catch {
        return null;
      }
    }, { timeout: 30000 }).toBeNull();
  } finally {
    await context.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .filter((candidate) => {
          return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
        })
        .forEach((candidate) => candidate.destroy());
    }).catch((): undefined => undefined);
    await cleanupElectronApp(context);
  }
});

test('world map editor window closes when host Close button is clicked', async () => {
  const context = await launchElectronApp();

  try {
    const { app, page } = context;
    attachDialogAutoDismiss(app);
    const { worldId, worldName } = await createWorld(page, `World Map Host Close ${Date.now()}`);
    const baseUrl = page.url().split('#')[0];

    await page.goto(`${baseUrl}#/world/${worldId}/levels`);
    await expect(page.getByRole('button', { name: 'World Map' })).toBeVisible();

    await page.getByRole('button', { name: 'World Map' }).click();

    let hostWindow: Awaited<ReturnType<typeof getWorldMapHostWindow>> = null;
    await expect.poll(async () => {
      hostWindow = await getWorldMapHostWindow(app);
      return Boolean(
        hostWindow?.bodyText.includes(`${worldName} World Map`)
          && hostWindow.status.includes('Fresh generated map ready.')
          && hostWindow.closeDisabled === false,
      );
    }, { timeout: 30000 }).toBe(true);

    const hostPage = app.windows().find((candidate) => {
      return candidate.url().startsWith('vv-fmg://app/index.html');
    });
    hostPage?.on('dialog', (dialog) => {
      void dialog.dismiss().catch((): undefined => undefined);
    });

    await app.evaluate(({ BrowserWindow }) => {
      const hostWindow = BrowserWindow.getAllWindows().find((candidate) => {
        return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
      });
      return hostWindow?.webContents.executeJavaScript(
        'document.getElementById("close-button")?.click()',
        true,
      );
    });

    await expect.poll(async () => {
      try {
        return await getWorldMapHostWindow(app);
      } catch {
        return null;
      }
    }, { timeout: 30000 }).toBeNull();
  } finally {
    await context.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .filter((candidate) => {
          return candidate.webContents.getURL().startsWith('vv-fmg://app/index.html');
        })
        .forEach((candidate) => candidate.destroy());
    }).catch((): undefined => undefined);
    await cleanupElectronApp(context);
  }
});
