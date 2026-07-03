/**
 * @role FMG editor host IPC registrar
 * @owns The worldMapHost channel handlers for the dedicated editor window
 * @seam Main-process adapter bridging window.worldMapHost calls to persistence
 *       and the editor-window manager
 * @calls Injected host command deps only (no direct DB/fs here)
 *
 * The world a call belongs to is resolved from the calling window's webContents
 * id, never from a renderer-supplied argument, so one editor window can only
 * ever act on its own bound world.
 */
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import type {
  WorldMap,
  WorldMapEditorSession,
  WorldMapSaveMeta,
} from '../../shared/contracts/domainTypes';
import type {
  WorldMapHostCloseDecision,
  WorldMapHostOk,
} from '../../shared/contracts/worldMapHost';
import { WORLD_MAP_HOST_CHANNELS } from '../../shared/worldMapHostChannels';

export interface WorldMapHostDeps {
  resolveWorldId(webContentsId: number): number | null;
  buildSession(worldId: number): WorldMapEditorSession | Promise<WorldMapEditorSession>;
  saveCurrent(worldId: number, mapData: string, meta: WorldMapSaveMeta): Promise<WorldMap>;
  regenerate(worldId: number): Promise<WorldMapHostOk>;
  exportCopy(
    worldId: number,
    mapData: string,
    suggestedName: string,
  ): Promise<WorldMapHostOk>;
  closeWindow(
    webContentsId: number,
    decision?: WorldMapHostCloseDecision,
  ): WorldMapHostOk | Promise<WorldMapHostOk>;
}

function requireWorldId(deps: WorldMapHostDeps, event: IpcMainInvokeEvent): number {
  const worldId = deps.resolveWorldId(event.sender.id);
  if (worldId == null) {
    throw new Error('World map editor session not found');
  }
  return worldId;
}

function getSenderId(event: IpcMainEvent | IpcMainInvokeEvent): number {
  return event.sender.id;
}

export function registerWorldMapHostHandlers(deps: WorldMapHostDeps): void {
  ipcMain.handle(WORLD_MAP_HOST_CHANNELS.GET_SESSION, (event) => {
    return deps.buildSession(requireWorldId(deps, event));
  });

  ipcMain.handle(
    WORLD_MAP_HOST_CHANNELS.SAVE,
    (event, mapData: string, meta: WorldMapSaveMeta) => {
      if (typeof mapData !== 'string' || mapData.length === 0) {
        throw new Error('World map save requires non-empty map data');
      }
      return deps.saveCurrent(requireWorldId(deps, event), mapData, meta);
    },
  );

  ipcMain.handle(WORLD_MAP_HOST_CHANNELS.REGENERATE, (event) => {
    return deps.regenerate(requireWorldId(deps, event));
  });

  ipcMain.handle(
    WORLD_MAP_HOST_CHANNELS.EXPORT_COPY,
    (event, mapData: string, suggestedName: string) => {
      if (typeof mapData !== 'string' || mapData.length === 0) {
        throw new Error('World map export requires non-empty map data');
      }
      return deps.exportCopy(requireWorldId(deps, event), mapData, suggestedName);
    },
  );

  ipcMain.on(WORLD_MAP_HOST_CHANNELS.CLOSE, (event, decision?: WorldMapHostCloseDecision) => {
    void Promise.resolve(deps.closeWindow(getSenderId(event), decision)).catch((error) => {
      console.error('[worldMapHost] close failed:', error);
    });
  });
}
