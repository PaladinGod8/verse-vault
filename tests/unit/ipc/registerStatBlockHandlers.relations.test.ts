import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStatBlockHandlers } from '../../../src/main/ipc/registerStatBlockHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcHandleMock,
  },
}));

function getRegisteredHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map((
      [channel, handler],
    ) => [channel as string, handler as IpcHandler]),
  );
}

describe('registerStatBlockHandlers relations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles link/unlink + attach/detach relation validation and duplicate checks', () => {
    const statblockRow: StatBlock = {
      id: 91,
      world_id: 1,
      campaign_id: null,
      character_id: null,
      name: 'Goblin Warrior',
      description: null,
      default_token_id: null,
      config: '{}',
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
    };

    const tokenRow: Token = {
      id: 71,
      world_id: 1,
      campaign_id: 31,
      name: 'Goblin',
      image_src: null,
      config: '{}',
      grid_type: 'square',
      is_visible: 1,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-02 00:00:00',
    };

    const abilityRow: Ability = {
      id: 21,
      world_id: 1,
      name: 'Quick Slash',
      description: null,
      type: 'active',
      passive_subtype: null,
      level_id: null,
      effects: '[]',
      conditions: '[]',
      cast_cost: '{}',
      trigger: null,
      pick_count: null,
      pick_timing: null,
      pick_is_permanent: 0,
      range_cells: null,
      aoe_shape: null,
      aoe_size_cells: null,
      target_type: null,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-02 00:00:00',
    };

    const statblocksByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return undefined;
      if (id === 92) return { ...statblockRow, id, world_id: 2 };
      return { ...statblockRow, id };
    });
    const tokensByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return undefined;
      if (id === 72) return { ...tokenRow, id, world_id: 2 };
      return { ...tokenRow, id };
    });
    const abilitiesByIdGetMock = vi.fn((id: number) => {
      if (id === 404) return undefined;
      if (id === 22) return { ...abilityRow, id, world_id: 2 };
      return { ...abilityRow, id };
    });

    const linkTokenRunMock = vi.fn((statblockId: number, tokenId: number) => {
      if (tokenId === 73) {
        throw new Error(
          'UNIQUE constraint failed: statblock_token_links.statblock_id, statblock_token_links.token_id',
        );
      }
      return { changes: 1, lastInsertRowid: 1 };
    });
    const unlinkTokenRunMock = vi.fn(() => ({ changes: 1 }));
    const linkedTokensAllMock = vi.fn(() => [{ ...tokenRow, id: 81 }]);
    const linkedStatblockGetMock = vi.fn((tokenId: number) => {
      if (tokenId === 999) return undefined;
      return { ...statblockRow, id: 101 };
    });

    const attachAbilityRunMock = vi.fn((statblockId: number, abilityId: number) => {
      if (abilityId === 23) {
        throw new Error(
          'UNIQUE constraint failed: statblock_ability_assignments.statblock_id, statblock_ability_assignments.ability_id',
        );
      }
      return { changes: 1, lastInsertRowid: 1 };
    });
    const detachAbilityRunMock = vi.fn(() => ({ changes: 1 }));
    const listAbilitiesAllMock = vi.fn(() => [{ ...abilityRow, id: 31 }]);

    const defaultStatement = {
      run: vi.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
      get: vi.fn(() => undefined),
      all: vi.fn(() => []),
    };

    const prepareMock = vi.fn((sql: string) => {
      if (sql === 'SELECT * FROM statblocks WHERE id = ?') return { get: statblocksByIdGetMock };
      if (sql === 'SELECT * FROM tokens WHERE id = ?') return { get: tokensByIdGetMock };
      if (sql === 'SELECT * FROM abilities WHERE id = ?') return { get: abilitiesByIdGetMock };
      if (sql === 'INSERT INTO statblock_token_links (statblock_id, token_id) VALUES (?, ?)') {
        return { run: linkTokenRunMock };
      }
      if (sql === 'DELETE FROM statblock_token_links WHERE statblock_id = ? AND token_id = ?') {
        return { run: unlinkTokenRunMock };
      }
      if (
        sql.includes('FROM statblock_token_links AS link')
        && sql.includes('INNER JOIN tokens AS token')
      ) {
        return { all: linkedTokensAllMock };
      }
      if (
        sql.includes('FROM statblock_token_links AS link')
        && sql.includes('INNER JOIN statblocks AS statblock')
      ) {
        return { get: linkedStatblockGetMock };
      }
      if (
        sql === 'INSERT INTO statblock_ability_assignments (statblock_id, ability_id) VALUES (?, ?)'
      ) {
        return { run: attachAbilityRunMock };
      }
      if (
        sql
          === 'DELETE FROM statblock_ability_assignments WHERE statblock_id = ? AND ability_id = ?'
      ) {
        return { run: detachAbilityRunMock };
      }
      if (
        sql.includes('FROM statblock_ability_assignments AS assignment')
        && sql.includes('INNER JOIN abilities AS ability')
      ) {
        return { all: listAbilitiesAllMock };
      }

      return defaultStatement;
    });

    const dbMock = {
      prepare: prepareMock,
      transaction: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
    } as unknown as Database.Database;

    registerStatBlockHandlers(dbMock);
    const handlers = getRegisteredHandlers();

    const linkResult = handlers[IPC.STATBLOCKS_LINK_TOKEN]({}, {
      statblock_id: 91,
      token_id: 71,
    });
    expect(linkResult).toEqual({ statblock_id: 91, token_id: 71 });
    expect(linkTokenRunMock).toHaveBeenCalledWith(91, 71);

    expect(() => handlers[IPC.STATBLOCKS_LINK_TOKEN]({}, { statblock_id: 404, token_id: 71 }))
      .toThrowError('StatBlock not found');
    expect(() => handlers[IPC.STATBLOCKS_LINK_TOKEN]({}, { statblock_id: 91, token_id: 404 }))
      .toThrowError('Token not found');
    expect(() => handlers[IPC.STATBLOCKS_LINK_TOKEN]({}, { statblock_id: 91, token_id: 72 }))
      .toThrowError('Token and StatBlock must belong to the same world');
    expect(() => handlers[IPC.STATBLOCKS_LINK_TOKEN]({}, { statblock_id: 91, token_id: 73 }))
      .toThrowError('Token is already linked to a statblock');

    const unlinkResult = handlers[IPC.STATBLOCKS_UNLINK_TOKEN]({}, {
      statblock_id: 91,
      token_id: 71,
    });
    expect(unlinkResult).toEqual({ statblock_id: 91, token_id: 71 });
    expect(unlinkTokenRunMock).toHaveBeenCalledWith(91, 71);

    const linkedTokensResult = handlers[IPC.STATBLOCKS_GET_LINKED_TOKENS]({}, 91);
    expect(linkedTokensResult).toEqual([{ ...tokenRow, id: 81 }]);
    expect(linkedTokensAllMock).toHaveBeenCalledWith(91);

    const linkedStatblockResult = handlers[IPC.STATBLOCKS_GET_LINKED_STATBLOCK]({}, 71);
    expect(linkedStatblockResult).toMatchObject({ id: 101 });
    expect(handlers[IPC.STATBLOCKS_GET_LINKED_STATBLOCK]({}, 999)).toBeNull();

    const attachResult = handlers[IPC.STATBLOCKS_ATTACH_ABILITY]({}, {
      statblock_id: 91,
      ability_id: 21,
    });
    expect(attachResult).toEqual({ statblock_id: 91, ability_id: 21 });
    expect(attachAbilityRunMock).toHaveBeenCalledWith(91, 21);

    expect(() => handlers[IPC.STATBLOCKS_ATTACH_ABILITY]({}, { statblock_id: 404, ability_id: 21 }))
      .toThrowError('StatBlock not found');
    expect(() => handlers[IPC.STATBLOCKS_ATTACH_ABILITY]({}, { statblock_id: 91, ability_id: 404 }))
      .toThrowError('Ability not found');
    expect(() => handlers[IPC.STATBLOCKS_ATTACH_ABILITY]({}, { statblock_id: 91, ability_id: 22 }))
      .toThrowError('Ability and StatBlock must belong to the same world');
    expect(() => handlers[IPC.STATBLOCKS_ATTACH_ABILITY]({}, { statblock_id: 91, ability_id: 23 }))
      .toThrowError('Ability is already attached to statblock');

    const detachResult = handlers[IPC.STATBLOCKS_DETACH_ABILITY]({}, {
      statblock_id: 91,
      ability_id: 21,
    });
    expect(detachResult).toEqual({ statblock_id: 91, ability_id: 21 });
    expect(detachAbilityRunMock).toHaveBeenCalledWith(91, 21);

    const listedAbilitiesResult = handlers[IPC.STATBLOCKS_LIST_ABILITIES]({}, 91);
    expect(listedAbilitiesResult).toEqual([{ ...abilityRow, id: 31 }]);
    expect(listAbilitiesAllMock).toHaveBeenCalledWith(91);
  });
});
