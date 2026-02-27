/** Single source of truth for all IPC channel names. Import this in both main.ts and preload.ts. */
export const IPC = {
  VERSES_GET_ALL: 'db:verses:getAll',
  VERSES_ADD: 'db:verses:add',
  VERSES_UPDATE: 'db:verses:update',
  VERSES_DELETE: 'db:verses:delete',
  WORLDS_GET_ALL: 'db:worlds:getAll',
  WORLDS_GET_BY_ID: 'db:worlds:getById',
  WORLDS_ADD: 'db:worlds:add',
  WORLDS_UPDATE: 'db:worlds:update',
  WORLDS_DELETE: 'db:worlds:delete',
  WORLDS_MARK_VIEWED: 'db:worlds:markViewed',
  LEVELS_GET_ALL_BY_WORLD: 'db:levels:getAllByWorld',
  LEVELS_GET_BY_ID: 'db:levels:getById',
  LEVELS_ADD: 'db:levels:add',
  LEVELS_UPDATE: 'db:levels:update',
  LEVELS_DELETE: 'db:levels:delete',
} as const;
