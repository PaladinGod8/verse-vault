import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createWorldMapProtocolHandler,
  WORLD_MAP_PROTOCOL,
} from '../../../src/main/worldMapProtocol';

describe('createWorldMapProtocolHandler', () => {
  let tempDir: string;
  let manifestPath: string;
  let snapshotDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'vv-world-map-protocol-'));
    const vendorRoot = path.join(tempDir, 'vendor');
    const bundleDir = path.join(vendorRoot, '1.99');
    snapshotDir = path.join(tempDir, 'snapshots');

    await mkdir(bundleDir, { recursive: true });
    await mkdir(path.join(bundleDir, 'assets'), { recursive: true });
    await mkdir(snapshotDir, { recursive: true });
    await writeFile(path.join(bundleDir, 'index.html'), '<!doctype html><title>FMG</title>');
    await writeFile(path.join(bundleDir, 'assets', 'main.js'), 'console.log("ok");');
    await writeFile(path.join(snapshotDir, 'world-map-7.map.gz'), Buffer.from('gzip-bytes'));

    manifestPath = path.join(vendorRoot, 'MANIFEST.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        bundleDir: '1.99',
        entry: 'index.html',
        pinnedVersion: 'v1.99',
      }),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('serves host wrapper html with Verse Vault controls', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(`${WORLD_MAP_PROTOCOL}://app/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const body = await response.text();
    expect(body).toContain('Verse Vault World Map');
    expect(body).toContain('Save');
    expect(body).toContain('Regenerate');
    expect(body).toContain('Export Copy');
    expect(body).toContain('Close');
    expect(body).toContain('window.worldMapHost');
    expect(body).toContain('Verse Vault <strong>Save</strong> is canonical');
    expect(body).toContain('#loadButton');
    expect(body).toContain('autosaveIntervalInput');
    expect(body).toContain('onloadBehavior');
    expect(body).toContain('win.onbeforeunload = null;');
    expect(body).toContain('Use Save or Export Copy from host toolbar');
  });

  it('builds map file URLs only for basename storage keys', () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    expect(protocol.urls.mapFileUrl('world-map-7.map.gz')).toBe(
      `${WORLD_MAP_PROTOCOL}://app/maps/world-map-7.map.gz`,
    );
    expect(() => protocol.urls.mapFileUrl('nested/world-map-7.map.gz')).toThrow(
      'Invalid world map storage key',
    );
  });

  it('serves vendored FMG assets from the pinned bundle directory', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(`${WORLD_MAP_PROTOCOL}://app/vendor/assets/main.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/javascript');
    expect(await response.text()).toContain('console.log');
  });

  it('serves saved map snapshots via the maps path', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(
      `${WORLD_MAP_PROTOCOL}://app/maps/world-map-7.map.gz`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/gzip');
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('gzip-bytes');
  });

  it('serves host wrapper html from the protocol root path', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(`${WORLD_MAP_PROTOCOL}://app/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Verse Vault World Map');
  });

  it('rejects malformed request URLs', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle('not-a-url');

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Invalid world map request URL');
  });

  it('rejects mismatched protocols', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle('https://app/index.html');

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('World map protocol mismatch');
  });

  it('rejects unknown hosts', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(`${WORLD_MAP_PROTOCOL}://elsewhere/index.html`);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain('World map host not found');
  });

  it('returns 404 when vendored assets are missing', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(
      `${WORLD_MAP_PROTOCOL}://app/vendor/assets/missing.js`,
    );

    expect(response.status).toBe(404);
  });

  it('rejects directory traversal attempts for vendor assets', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(
      `${WORLD_MAP_PROTOCOL}://app/vendor/%2e%2e/secret.txt`,
    );

    expect(response.status).toBe(404);
  });

  it('rejects invalid world-map storage keys under maps', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(
      `${WORLD_MAP_PROTOCOL}://app/maps/nested/world-map-7.map.gz`,
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Invalid world map storage key');
  });

  it('returns 404 when a requested world-map snapshot is missing', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(
      `${WORLD_MAP_PROTOCOL}://app/maps/world-map-999.map.gz`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 for unknown world-map resources', async () => {
    const protocol = createWorldMapProtocolHandler({ manifestPath, snapshotDir });

    const response = await protocol.handle(`${WORLD_MAP_PROTOCOL}://app/unknown/resource.txt`);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain('World map resource not found');
  });
});
