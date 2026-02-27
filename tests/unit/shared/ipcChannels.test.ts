import { describe, expect, it } from 'vitest';
import { IPC } from '../../../src/shared/ipcChannels';

describe('IPC channels', () => {
  it('defines all expected verse, world, level, and ability channels', () => {
    expect(IPC).toEqual({
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
      ABILITIES_GET_ALL_BY_WORLD: 'db:abilities:getAllByWorld',
      ABILITIES_GET_BY_ID: 'db:abilities:getById',
      ABILITIES_ADD: 'db:abilities:add',
      ABILITIES_UPDATE: 'db:abilities:update',
      ABILITIES_DELETE: 'db:abilities:delete',
      ABILITIES_ADD_CHILD: 'db:abilities:addChild',
      ABILITIES_REMOVE_CHILD: 'db:abilities:removeChild',
      ABILITIES_GET_CHILDREN: 'db:abilities:getChildren',
    });
  });
});
