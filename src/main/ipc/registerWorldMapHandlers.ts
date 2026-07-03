/**
 * @role WorldMap IPC registrar
 * @owns world_maps read channel and the openEditor command channel
 * @seam Main-process adapter bridging renderer world-map requests to persistence
 *       and the editor-window manager
 * @calls worldMapsRepo reads and an injected editor-open command
 */
import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { createWorldMapsRepo } from '../../database/repos/worldMapsRepo';
import type { WorldMapOpenEditorResult } from '../../shared/contracts/domainTypes';
import { IPC } from '../../shared/ipcChannels';

export interface WorldMapHandlerDeps {
  openEditor(worldId: number): Promise<WorldMapOpenEditorResult>;
}

export function registerWorldMapHandlers(
  db: Database.Database,
  deps: WorldMapHandlerDeps,
): void {
  const repo = createWorldMapsRepo(db);

  ipcMain.handle(IPC.WORLD_MAPS_GET_BY_WORLD, (_event, worldId: number) => {
    return repo.getByWorld(worldId);
  });

  ipcMain.handle(IPC.WORLD_MAPS_OPEN_EDITOR, (_event, worldId: number) => {
    if (!Number.isInteger(worldId) || worldId <= 0) {
      throw new Error('World map editor requires a valid world id');
    }
    return deps.openEditor(worldId);
  });
}
