/**
 * @role World-map editor host channel registry
 * @owns Channel names for the dedicated FMG editor window's `window.worldMapHost`
 * @seam Stable channel source shared by preloadWorldMap and the host registrar
 * @calls No runtime dependencies
 *
 * These are intentionally separate from `IPC` (the `window.db` contract): the
 * host surface belongs only to the dedicated editor-window preload, never to the
 * main app's `window.db`, so it is not part of the DbApi contract or its guards.
 */
export const WORLD_MAP_HOST_CHANNELS = {
  GET_SESSION: 'worldMapHost:getSession',
  SAVE: 'worldMapHost:save',
  REGENERATE: 'worldMapHost:regenerate',
  EXPORT_COPY: 'worldMapHost:exportCopy',
  CLOSE: 'worldMapHost:close',
} as const;
