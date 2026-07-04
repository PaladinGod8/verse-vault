import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFsWorldMediaReader,
  createFsWorldMediaWriter,
} from '../../../../src/main/worldTransfer/fsMedia';

const TEMP_DIRS: string[] = [];

afterEach(() => {
  while (TEMP_DIRS.length > 0) {
    const dir = TEMP_DIRS.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'vv-world-transfer-'));
  TEMP_DIRS.push(dir);
  return dir;
}

describe('fsMedia world-transfer adapter', () => {
  it('reads existing media and snapshots, rejects unsafe names, and returns null for missing files', () => {
    const dir = makeTempDir();
    const mediaDir = path.join(dir, 'world-images');
    const snapshotDir = path.join(dir, 'world-maps');
    mkdirSync(mediaDir, { recursive: true });
    mkdirSync(snapshotDir, { recursive: true });
    writeFileSync(path.join(mediaDir, 'alpha.png'), 'media-bytes');
    writeFileSync(path.join(snapshotDir, 'world-map-1.map.gz'), 'snapshot-bytes');

    const reader = createFsWorldMediaReader(dir);

    expect(reader.readMedia('world-images', 'alpha.png')?.toString()).toBe('media-bytes');
    expect(reader.readSnapshot('world-map-1.map.gz')?.toString()).toBe('snapshot-bytes');
    expect(reader.readMedia('world-images', '../escape.png')).toBeNull();
    expect(reader.readMedia('world-images', 'missing.png')).toBeNull();
    expect(reader.readSnapshot('../escape.map.gz')).toBeNull();
  });

  it('writes media and snapshots under userData-safe folders', () => {
    const dir = makeTempDir();
    const writer = createFsWorldMediaWriter(dir);

    const mediaUrl = writer.writeMedia('world-images', 'alpha.png', Buffer.from('media'));
    const snapshotKey = writer.writeSnapshot(7, Buffer.from('snapshot'));

    expect(mediaUrl).toMatch(/^vv-media:\/\/world-images\//);
    expect(snapshotKey).toBe('world-map-7.map.gz');

    const mediaFileName = decodeURIComponent(new URL(mediaUrl).pathname.replace(/^\/+/, ''));
    expect(readFileSync(path.join(dir, 'world-images', mediaFileName)).toString()).toBe('media');
    expect(readFileSync(path.join(dir, 'world-maps', snapshotKey)).toString()).toBe('snapshot');
  });
});
