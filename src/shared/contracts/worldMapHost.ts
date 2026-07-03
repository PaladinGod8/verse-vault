/**
 * @role World-map editor host contract
 * @owns The narrow `window.worldMapHost` surface exposed only in the FMG editor window
 * @seam Renderer-safe type shared by preloadWorldMap and the wrapper UI
 * @calls Domain types only
 */
import type { WorldMap, WorldMapEditorSession, WorldMapSaveMeta } from './domainTypes';

export interface WorldMapHostOk {
  ok: true;
}

export interface WorldMapHostCloseDecision {
  ok?: boolean;
  errorMessage?: string;
}

export interface WorldMapHost {
  getSession(): Promise<WorldMapEditorSession>;
  saveCurrent(mapData: string, meta: WorldMapSaveMeta): Promise<WorldMap>;
  regenerate(): Promise<WorldMapHostOk>;
  exportCopy(mapData: string, suggestedName: string): Promise<WorldMapHostOk>;
  close(decision?: WorldMapHostCloseDecision): Promise<WorldMapHostOk>;
}
