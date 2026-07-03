/**
 * @role FMG editor-window preload bridge
 * @owns The narrow `window.worldMapHost` surface for the dedicated map editor window
 * @seam Main-to-editor IPC contract via contextBridge, isolated from window.db
 * @calls ipcRenderer.invoke and the shared world-map host channel constants only
 *
 * This preload is ONLY attached to the FMG editor BrowserWindow. It never exposes
 * window.db, and the main app preload never exposes window.worldMapHost. The world
 * a request belongs to is resolved in the main process from the calling window, so
 * the renderer never passes a world id.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { WorldMapHost } from './shared/contracts/worldMapHost';
import { WORLD_MAP_HOST_CHANNELS } from './shared/worldMapHostChannels';

const worldMapHost: WorldMapHost = {
  getSession: () => ipcRenderer.invoke(WORLD_MAP_HOST_CHANNELS.GET_SESSION),
  saveCurrent: (mapData, meta) => ipcRenderer.invoke(WORLD_MAP_HOST_CHANNELS.SAVE, mapData, meta),
  regenerate: () => ipcRenderer.invoke(WORLD_MAP_HOST_CHANNELS.REGENERATE),
  exportCopy: (mapData, suggestedName) =>
    ipcRenderer.invoke(WORLD_MAP_HOST_CHANNELS.EXPORT_COPY, mapData, suggestedName),
  close: (decision) => {
    ipcRenderer.send(WORLD_MAP_HOST_CHANNELS.CLOSE, decision);
    return Promise.resolve({ ok: true as const });
  },
};

contextBridge.exposeInMainWorld('worldMapHost', worldMapHost);
