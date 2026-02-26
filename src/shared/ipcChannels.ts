/** Single source of truth for all IPC channel names. Import this in both main.ts and preload.ts. */
export const IPC = {
  VERSES_GET_ALL: 'db:verses:getAll',
  VERSES_ADD: 'db:verses:add',
  VERSES_UPDATE: 'db:verses:update',
  VERSES_DELETE: 'db:verses:delete',
} as const;
