import type {
  WorldMap,
  WorldMapEditorSession,
  WorldMapOpenEditorResult,
  WorldMapSaveMeta,
} from '../shared/contracts/domainTypes';
import type { WorldMapHostCloseDecision, WorldMapHostOk } from '../shared/contracts/worldMapHost';
import type { WorldMapPersistence } from './worldMapPersistence';

/**
 * @role World-map editor window manager
 * @owns Window reuse, editor-session lookup, close interception, and host commands
 * @seam Deep module hiding BrowserWindow/session lifecycle behind a small interface
 * @calls Injected window factory, persistence, protocol URL builders, and export/confirm deps
 */
export interface WorldMapEditorWindow {
  webContents: {
    id: number;
    executeJavaScript(script: string): Promise<unknown>;
    on(event: 'will-prevent-unload', listener: (event: { preventDefault(): void; }) => void): void;
  };
  focus(): void;
  close(): void;
  isDestroyed(): boolean;
  on(event: 'closed', listener: () => void): void;
  on(event: 'close', listener: (event: { preventDefault(): void; }) => void): void;
}

interface WorldSummary {
  id: number;
  name: string;
}

export interface WorldMapEditorManagerDeps {
  getWorld(worldId: number): WorldSummary | null;
  persistence: WorldMapPersistence;
  createWindow(worldId: number): WorldMapEditorWindow;
  vendorEntryUrl: string;
  mapFileUrl(storageKey: string): string;
  exportCopy(worldId: number, mapData: string, suggestedName: string): Promise<WorldMapHostOk>;
  confirmDiscardOnCloseFailure(
    worldId: number,
    errorMessage: string,
  ): Promise<boolean>;
}

export interface WorldMapEditorManager {
  openWorldMapEditor(worldId: number): Promise<WorldMapOpenEditorResult>;
  resolveWorldId(webContentsId: number): number | null;
  buildSession(worldId: number): WorldMapEditorSession;
  saveWorldMapSnapshot(
    worldId: number,
    mapData: string,
    meta: WorldMapSaveMeta,
  ): Promise<WorldMap>;
  regenerateWorldMap(_worldId: number): Promise<WorldMapHostOk>;
  exportWorldMapCopy(
    worldId: number,
    mapData: string,
    suggestedName: string,
  ): Promise<WorldMapHostOk>;
  closeWorldMapWindow(
    webContentsId: number,
    decision?: WorldMapHostCloseDecision,
  ): Promise<WorldMapHostOk>;
}

interface WorldMapWindowRecord {
  allowClose: boolean;
  closeCheckInFlight: boolean;
  webContentsId: number;
  window: WorldMapEditorWindow;
  worldId: number;
}

const CLOSE_REQUEST_SCRIPT = `(() => {
  const host = window.__VV_WORLD_MAP_HOST__;
  const pendingDecision = host?.consumeWindowCloseDecision?.();
  if (pendingDecision != null) {
    return pendingDecision;
  }
  const handler = host?.handleWindowCloseRequest;
  return typeof handler === 'function' ? handler() : { ok: true };
})()`;

function ensureWorld(
  getWorld: WorldMapEditorManagerDeps['getWorld'],
  worldId: number,
): WorldSummary {
  const world = getWorld(worldId);
  if (!world) {
    throw new Error(`World ${worldId} not found`);
  }
  return world;
}

function attachCloseInterception(
  deps: WorldMapEditorManagerDeps,
  record: WorldMapWindowRecord,
  windowsByWorld: Map<number, WorldMapWindowRecord>,
  worldsByWebContents: Map<number, number>,
): void {
  record.window.webContents.on('will-prevent-unload', (event) => {
    // FMG installs its own beforeunload guard. Verse Vault owns save/discard flow,
    // so ignore upstream unload vetoes for this dedicated host window.
    event.preventDefault();
  });

  record.window.on('close', (event) => {
    if (record.allowClose) {
      return;
    }
    event.preventDefault();
    if (record.closeCheckInFlight) {
      return;
    }
    record.closeCheckInFlight = true;

    void (async () => {
      try {
        if (record.window.isDestroyed()) {
          return;
        }
        const decision = await record.window.webContents.executeJavaScript(CLOSE_REQUEST_SCRIPT) as
          | { ok?: boolean; errorMessage?: string; }
          | undefined;
        if (decision?.ok !== false) {
          record.allowClose = true;
          closeIfAlive(record);
          return;
        }

        const discard = await deps.confirmDiscardOnCloseFailure(
          record.worldId,
          decision.errorMessage ?? 'World map save failed during close',
        );
        if (discard) {
          record.allowClose = true;
          closeIfAlive(record);
        }
      } finally {
        record.closeCheckInFlight = false;
      }
    })();
  });

  record.window.on('closed', () => {
    const current = windowsByWorld.get(record.worldId);
    if (current === record) {
      windowsByWorld.delete(record.worldId);
    }
    worldsByWebContents.delete(record.webContentsId);
  });
}

async function resolveRendererCloseDecision(
  deps: WorldMapEditorManagerDeps,
  record: WorldMapWindowRecord,
  decision?: WorldMapHostCloseDecision,
): Promise<boolean> {
  if (decision?.ok === false) {
    return deps.confirmDiscardOnCloseFailure(
      record.worldId,
      decision.errorMessage ?? 'World map save failed during close',
    );
  }

  return true;
}

function closeIfAlive(record: WorldMapWindowRecord): void {
  if (record.window.isDestroyed()) {
    return;
  }
  record.window.close();
}

function scheduleAllowedClose(record: WorldMapWindowRecord): void {
  setImmediate(() => {
    closeIfAlive(record);
  });
}

function openWindow(
  deps: WorldMapEditorManagerDeps,
  worldId: number,
  windowsByWorld: Map<number, WorldMapWindowRecord>,
  worldsByWebContents: Map<number, number>,
): void {
  const editorWindow = deps.createWindow(worldId);
  const webContentsId = editorWindow.webContents.id;
  const record: WorldMapWindowRecord = {
    allowClose: false,
    closeCheckInFlight: false,
    webContentsId,
    window: editorWindow,
    worldId,
  };
  windowsByWorld.set(worldId, record);
  worldsByWebContents.set(webContentsId, worldId);
  attachCloseInterception(deps, record, windowsByWorld, worldsByWebContents);
}

export function createWorldMapEditorManager(
  deps: WorldMapEditorManagerDeps,
): WorldMapEditorManager {
  const windowsByWorld = new Map<number, WorldMapWindowRecord>();
  const worldsByWebContents = new Map<number, number>();

  return {
    async openWorldMapEditor(worldId: number): Promise<WorldMapOpenEditorResult> {
      ensureWorld(deps.getWorld, worldId);

      const existing = windowsByWorld.get(worldId);
      if (existing && !existing.window.isDestroyed()) {
        existing.window.focus();
      } else {
        openWindow(deps, worldId, windowsByWorld, worldsByWebContents);
      }

      const row = deps.persistence.getByWorld(worldId);
      return { opened: true, worldMapId: row?.id ?? null };
    },

    resolveWorldId(webContentsId: number): number | null {
      return worldsByWebContents.get(webContentsId) ?? null;
    },

    buildSession(worldId: number): WorldMapEditorSession {
      const world = ensureWorld(deps.getWorld, worldId);
      const row = deps.persistence.getByWorld(worldId);
      return {
        worldId,
        worldName: world.name,
        worldMapId: row?.id ?? null,
        mapFileUrl: row ? deps.mapFileUrl(row.storage_key) : null,
        vendorEntryUrl: deps.vendorEntryUrl,
        hasExistingMap: Boolean(row),
      };
    },

    async saveWorldMapSnapshot(worldId, mapData, meta) {
      return deps.persistence.saveSnapshot(worldId, mapData, meta);
    },

    async regenerateWorldMap(): Promise<WorldMapHostOk> {
      return { ok: true };
    },

    async exportWorldMapCopy(worldId, mapData, suggestedName) {
      return deps.exportCopy(worldId, mapData, suggestedName);
    },

    async closeWorldMapWindow(
      webContentsId: number,
      decision?: WorldMapHostCloseDecision,
    ): Promise<WorldMapHostOk> {
      const worldId = worldsByWebContents.get(webContentsId);
      if (worldId == null) {
        throw new Error('World map editor session not found');
      }
      const record = windowsByWorld.get(worldId);
      if (!record || record.window.isDestroyed()) {
        throw new Error('World map editor session not found');
      }

      if (decision) {
        const allowClose = await resolveRendererCloseDecision(deps, record, decision);
        if (!allowClose) {
          return { ok: true };
        }
        record.allowClose = true;
        scheduleAllowedClose(record);
        return { ok: true };
      }

      record.window.close();
      return { ok: true };
    },
  };
}
