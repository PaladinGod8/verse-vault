/**
 * @role World-map protocol registry
 * @owns The privileged `vv-fmg` protocol for wrapper HTML, vendored FMG assets, and map snapshots
 * @seam Main-process file-serving layer isolated from BrowserWindow + persistence orchestration
 * @calls node:fs, path safety checks, and buildWorldMapHostPageHtml only
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildWorldMapHostPageHtml } from './worldMapHostPage';
import { WORLD_MAP_HOST_PAGE_SCRIPT } from './worldMapHostPageScript';
import { WORLD_MAP_HOST_PAGE_STYLE } from './worldMapHostPageStyle';

export const WORLD_MAP_PROTOCOL = 'vv-fmg';
export const WORLD_MAP_PROTOCOL_HOST = 'app';

interface WorldMapVendorManifest {
  bundleDir: string;
  entry: string;
  pinnedVersion: string;
}

export interface WorldMapProtocolUrls {
  hostPageUrl: string;
  vendorEntryUrl: string;
  mapFileUrl(storageKey: string): string;
}

export interface WorldMapProtocolHandler {
  urls: WorldMapProtocolUrls;
  handle(requestUrl: string): Promise<Response>;
}

const MIME_TYPES: Array<[suffix: string, mimeType: string]> = [
  ['.map.gz', 'application/gzip'],
  ['.gz', 'application/gzip'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
];

function mimeTypeFor(filePath: string): string {
  const normalized = filePath.toLowerCase();
  return MIME_TYPES.find(([suffix]) => normalized.endsWith(suffix))?.[1]
    ?? 'application/octet-stream';
}

function okText(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function okScript(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
  });
}

function okStyle(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/css; charset=utf-8' },
  });
}

function errorResponse(message: string, status: number): Response {
  return new Response(message, { status });
}

function requireBasenameOnly(storageKey: string): string {
  const fileName = path.basename(storageKey);
  if (!fileName || fileName !== storageKey) {
    throw new Error('Invalid world map storage key');
  }
  return fileName;
}

async function fileResponse(filePath: string): Promise<Response> {
  const bytes = await readFile(filePath);
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': mimeTypeFor(filePath) },
  });
}

function resolveVendorAsset(vendorDir: string, requestPath: string): string {
  const relativePath = requestPath.replace(/^vendor\//, '');
  const decoded = decodeURIComponent(relativePath).replace(/^\/+/, '');
  const filePath = path.resolve(path.join(vendorDir, decoded));
  if (!decoded || !filePath.startsWith(`${vendorDir}${path.sep}`) && filePath !== vendorDir) {
    throw new Error('Invalid FMG asset path');
  }
  return filePath;
}

function loadManifest(manifestPath: string): WorldMapVendorManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as WorldMapVendorManifest;
}

async function routeHostRequest(
  requestPath: string,
  context: { manifest: WorldMapVendorManifest; vendorDir: string; snapshotDir: string; },
): Promise<Response> {
  const { manifest, vendorDir, snapshotDir } = context;

  if (requestPath === '' || requestPath === 'index.html') {
    return okText(buildWorldMapHostPageHtml(manifest.pinnedVersion));
  }
  if (requestPath === 'script.js') {
    return okScript(WORLD_MAP_HOST_PAGE_SCRIPT);
  }
  if (requestPath === 'style.css') {
    return okStyle(WORLD_MAP_HOST_PAGE_STYLE);
  }

  if (requestPath.startsWith('vendor/')) {
    try {
      return await fileResponse(resolveVendorAsset(vendorDir, requestPath));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FMG asset not found';
      return errorResponse(message, message.includes('Invalid') ? 400 : 404);
    }
  }

  if (requestPath.startsWith('maps/')) {
    try {
      const storageKey = requireBasenameOnly(requestPath.replace(/^maps\//, ''));
      const filePath = path.resolve(path.join(snapshotDir, storageKey));
      if (path.dirname(filePath) !== snapshotDir) {
        return errorResponse('Invalid world map storage key', 400);
      }
      return await fileResponse(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'World map snapshot not found';
      return errorResponse(message, message.includes('Invalid') ? 400 : 404);
    }
  }

  return errorResponse('World map resource not found', 404);
}

export function createWorldMapProtocolHandler(options: {
  manifestPath: string;
  snapshotDir: string;
}): WorldMapProtocolHandler {
  const manifest = loadManifest(options.manifestPath);
  const vendorDir = path.resolve(path.join(path.dirname(options.manifestPath), manifest.bundleDir));
  const snapshotDir = path.resolve(options.snapshotDir);
  const hostPageUrl = `${WORLD_MAP_PROTOCOL}://${WORLD_MAP_PROTOCOL_HOST}/index.html`;
  const vendorEntryUrl =
    `${WORLD_MAP_PROTOCOL}://${WORLD_MAP_PROTOCOL_HOST}/vendor/${manifest.entry}`;

  return {
    urls: {
      hostPageUrl,
      vendorEntryUrl,
      mapFileUrl(storageKey: string): string {
        return `${WORLD_MAP_PROTOCOL}://${WORLD_MAP_PROTOCOL_HOST}/maps/${
          encodeURIComponent(requireBasenameOnly(storageKey))
        }`;
      },
    },

    async handle(requestUrl: string): Promise<Response> {
      let url: URL;
      try {
        url = new URL(requestUrl);
      } catch {
        return errorResponse('Invalid world map request URL', 400);
      }

      if (url.protocol !== `${WORLD_MAP_PROTOCOL}:`) {
        return errorResponse('World map protocol mismatch', 400);
      }
      if (url.hostname !== WORLD_MAP_PROTOCOL_HOST) {
        return errorResponse('World map host not found', 404);
      }

      const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      return routeHostRequest(requestPath, { manifest, vendorDir, snapshotDir });
    },
  };
}
