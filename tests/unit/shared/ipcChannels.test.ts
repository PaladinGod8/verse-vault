import { describe, expect, it } from 'vitest';
import { IPC } from '../../../src/shared/ipcChannels';

describe('IPC channels', () => {
  it('defines all expected verse channels', () => {
    expect(IPC).toEqual({
      VERSES_GET_ALL: 'db:verses:getAll',
      VERSES_ADD: 'db:verses:add',
      VERSES_UPDATE: 'db:verses:update',
      VERSES_DELETE: 'db:verses:delete',
    });
  });
});
