import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanupElectronApp, type E2EAppContext, launchElectronApp } from './helpers';

// The `importImage` IPC handlers decode caller-supplied bytes, write them to a
// per-host directory under userData, and return a `vv-media://<host>/<file>` URL
// that the custom protocol later serves back to the renderer. Only a single UI
// world-thumbnail happy path existed; nothing drove the IPC directly nor proved
// the bytes actually reached disk intact. These specs exercise the full
// base64 -> disk -> media-url seam for tokens and worlds.
//
// NOTE: file cleanup on owner delete is deliberately NOT asserted here. The delete
// handlers do not remove media files from disk today (only world-map snapshots are
// cleaned up), so imported images currently leak. That is a product decision to
// make separately, not something these round-trip specs should lock in.

// 1x1 transparent PNG, decoded Node-side. `page.evaluate` cannot receive a real
// Uint8Array as an argument, so we pass this plain number[] and rebuild the
// Uint8Array inside the renderer before handing it to the IPC bridge.
const PNG_BYTES = Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6mR3sAAAAASUVORK5CYII=',
    'base64',
  ),
);

function fileNameFromMediaUrl(mediaUrl: string): string {
  const withoutScheme = mediaUrl.replace(/^vv-media:\/\/[^/]+\//, '');
  return decodeURIComponent(withoutScheme);
}

test.describe.serial('@critical Image import round-trip', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('token importImage writes the bytes to disk and returns a vv-media url', async () => {
    const { page, userDataDir } = context;

    const imageSrc = await page.evaluate(async (bytes) => {
      const result = await window.db.tokens.importImage({
        fileName: 'goblin.png',
        mimeType: 'image/png',
        bytes: new Uint8Array(bytes),
      });
      return result.image_src;
    }, PNG_BYTES);

    expect(imageSrc).toMatch(/^vv-media:\/\/token-images\//);

    const onDisk = await readFile(
      path.join(userDataDir, 'token-images', fileNameFromMediaUrl(imageSrc)),
    );
    expect(Array.from(onDisk)).toEqual(PNG_BYTES);
  });

  test('world importImage writes the bytes to disk and returns a vv-media url', async () => {
    const { page, userDataDir } = context;

    const imageSrc = await page.evaluate(async (bytes) => {
      const result = await window.db.worlds.importImage({
        fileName: 'realm.png',
        mimeType: 'image/png',
        bytes: new Uint8Array(bytes),
      });
      return result.image_src;
    }, PNG_BYTES);

    expect(imageSrc).toMatch(/^vv-media:\/\/world-images\//);

    const onDisk = await readFile(
      path.join(userDataDir, 'world-images', fileNameFromMediaUrl(imageSrc)),
    );
    expect(Array.from(onDisk)).toEqual(PNG_BYTES);
  });

  test('rejects an unsupported image mimeType', async () => {
    const { page } = context;

    const error = await page.evaluate(async (bytes) => {
      try {
        await window.db.tokens.importImage({
          fileName: 'note.txt',
          mimeType: 'text/plain',
          bytes: new Uint8Array(bytes),
        });
        return null;
      } catch (err) {
        return (err as Error).message;
      }
    }, PNG_BYTES);

    expect(error).toContain('Unsupported token image mimeType');
  });
});
