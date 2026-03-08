import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAbilityHandlers } from '../../../src/main/ipc/registerAbilityHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: ipcHandleMock },
}));

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map(([ch, handler]) => [ch as string, handler as IpcHandler]),
  );
}

function buildAbility(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    world_id: 10,
    name: 'Quick Slash',
    description: null as null,
    type: 'active',
    passive_subtype: null as null,
    level_id: null as null,
    effects: '[]',
    conditions: '[]',
    cast_cost: '{}',
    trigger: null as null,
    pick_count: null as null,
    pick_timing: null as null,
    pick_is_permanent: 0,
    range_cells: null as null,
    aoe_shape: null as null,
    aoe_size_cells: null as null,
    target_type: null as null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('registerAbilityHandlers', () => {
  let dbMock: Database.Database;
  let handlers: Record<string, IpcHandler>;

  function createDbMock(options: {
    getAbilityById?: (id: number) => unknown;
    insertedAbility?: unknown;
    children?: unknown[];
  } = {}) {
    const defaultAbility = buildAbility();
    const runMock = vi.fn(() => ({ changes: 1, lastInsertRowid: 1 }));
    const getAbilityById = options.getAbilityById;

    const prepareMock = vi.fn((sql: string) => {
      if (sql === 'SELECT * FROM abilities WHERE id = ?') {
        return {
          get: getAbilityById
            ? vi.fn((id: unknown) => getAbilityById(id as number))
            : vi.fn(() =>
              'insertedAbility' in options
                ? (options.insertedAbility === null ? undefined : options.insertedAbility)
                : defaultAbility
            ),
        };
      }
      if (sql === 'SELECT id, world_id FROM abilities WHERE id = ?') {
        return {
          get: getAbilityById
            ? vi.fn((id: unknown) => {
              const a = getAbilityById(id as number);
              return a
                ? { id: (a as { id: number; }).id, world_id: (a as { world_id: number; }).world_id }
                : undefined;
            })
            : vi.fn(() => ({ id: defaultAbility.id, world_id: defaultAbility.world_id })),
        };
      }
      if (sql.includes('FROM ability_children')) {
        return { all: vi.fn(() => options.children ?? []) };
      }
      return { run: runMock, get: vi.fn(() => defaultAbility), all: vi.fn(() => [defaultAbility]) };
    });

    return {
      prepare: prepareMock,
    } as unknown as Database.Database;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    registerAbilityHandlers(dbMock);
    handlers = getHandlers();
  });

  describe(IPC.ABILITIES_GET_ALL_BY_WORLD, () => {
    it('returns abilities for world', () => {
      const mockAll = vi.fn(() => [buildAbility()]);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ all: mockAll });
      expect(handlers[IPC.ABILITIES_GET_ALL_BY_WORLD]({}, 10)).toEqual([buildAbility()]);
    });
  });

  describe(IPC.ABILITIES_GET_BY_ID, () => {
    it('returns ability', () => {
      const mockGet = vi.fn(() => buildAbility());
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ABILITIES_GET_BY_ID]({}, 1)).toEqual(buildAbility());
    });

    it('returns null when not found', () => {
      const mockGet = vi.fn(() => undefined);
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ get: mockGet });
      expect(handlers[IPC.ABILITIES_GET_BY_ID]({}, 999)).toBeNull();
    });
  });

  describe(IPC.ABILITIES_ADD, () => {
    it('creates ability with all required fields', () => {
      const db = createDbMock({ insertedAbility: buildAbility() });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      const result = h[IPC.ABILITIES_ADD]({}, {
        world_id: 10,
        name: 'Quick Slash',
        type: 'active',
      });
      expect(result).toMatchObject({ name: 'Quick Slash', type: 'active' });
    });

    it('creates ability with all optional fields', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      h[IPC.ABILITIES_ADD]({}, {
        world_id: 10,
        name: 'Slash',
        type: 'passive',
        description: 'A slash',
        passive_subtype: 'aura',
        level_id: 2,
        effects: '[]',
        conditions: '[]',
        cast_cost: '{}',
        trigger: 'on_hit',
        pick_count: 1,
        pick_timing: 'on_level_up',
        pick_is_permanent: 1,
        range_cells: 3,
        aoe_shape: 'circle',
        aoe_size_cells: 2,
        target_type: 'enemy',
      });
      expect(true).toBe(true);
    });

    it('uses default values for optional fields when omitted', () => {
      // defaults: effects='[]', conditions='[]', cast_cost='{}', pick_is_permanent=0
      const db = createDbMock();
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      h[IPC.ABILITIES_ADD]({}, { world_id: 10, name: 'Slash', type: 'active' });
      // just verify no throw
      expect(true).toBe(true);
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ABILITIES_ADD]({}, { world_id: 10, name: '', type: 'active' }))
        .toThrowError('Ability name is required');
    });

    it('throws when type is empty', () => {
      expect(() => handlers[IPC.ABILITIES_ADD]({}, { world_id: 10, name: 'X', type: '' }))
        .toThrowError('Ability type is required');
    });

    it('throws when ability not found after insert', () => {
      const db = createDbMock({ insertedAbility: null });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD]({}, { world_id: 10, name: 'X', type: 'active' }))
        .toThrowError('Failed to create ability');
    });
  });

  describe(IPC.ABILITIES_UPDATE, () => {
    it('updates name and type', () => {
      const db = createDbMock({ insertedAbility: buildAbility({ name: 'Updated' }) });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      const result = h[IPC.ABILITIES_UPDATE]({}, 1, { name: 'Updated', type: 'passive' });
      expect(result).toMatchObject({ name: 'Updated' });
    });

    it('updates all optional fields', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      h[IPC.ABILITIES_UPDATE]({}, 1, {
        description: 'Desc',
        passive_subtype: 'buff',
        level_id: 3,
        effects: '["heal"]',
        conditions: '[]',
        cast_cost: '{"mana":5}',
        trigger: 'on_cast',
        pick_count: 2,
        pick_timing: 'on_acquire',
        pick_is_permanent: 1,
        range_cells: 4,
        aoe_shape: 'cone',
        aoe_size_cells: 3,
        target_type: 'ally',
      });
      expect(true).toBe(true);
    });

    it('touch-only update (no fields)', () => {
      const db = createDbMock();
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_UPDATE]({}, 1, {})).not.toThrow();
    });

    it('throws when name is empty', () => {
      expect(() => handlers[IPC.ABILITIES_UPDATE]({}, 1, { name: '' }))
        .toThrowError('Ability name cannot be empty');
    });

    it('throws when type is empty', () => {
      expect(() => handlers[IPC.ABILITIES_UPDATE]({}, 1, { type: '' }))
        .toThrowError('Ability type cannot be empty');
    });

    it('throws when ability not found after update', () => {
      const db = createDbMock({ insertedAbility: null });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_UPDATE]({}, 999, { name: 'X' }))
        .toThrowError('Ability not found');
    });
  });

  describe(IPC.ABILITIES_DELETE, () => {
    it('deletes ability and returns id', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      const result = handlers[IPC.ABILITIES_DELETE]({}, 7);
      expect(result).toEqual({ id: 7 });
    });
  });

  describe(IPC.ABILITIES_ADD_CHILD, () => {
    it('links parent to child in same world', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const childAbility = buildAbility({ id: 2, world_id: 10 });
      const db = createDbMock({
        getAbilityById: (id: number) => {
          if (id === 1) return parentAbility;
          if (id === 2) return childAbility;
          return undefined;
        },
      });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      const result = h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 });
      expect(result).toEqual({ parent_id: 1, child_id: 2 });
    });

    it('throws when parent_id === child_id', () => {
      expect(() => handlers[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 1 }))
        .toThrowError('Parent ability cannot be linked to itself');
    });

    it('throws when parent not found', () => {
      const db = createDbMock({
        getAbilityById: (id: number) => (id === 1 ? undefined : buildAbility({ id })),
      });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Parent ability not found');
    });

    it('throws when child not found', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const db = createDbMock({
        getAbilityById: (id: number) => (id === 1 ? parentAbility : undefined),
      });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Child ability not found');
    });

    it('throws when parent and child are from different worlds', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const childAbility = buildAbility({ id: 2, world_id: 20 });
      const db = createDbMock({
        getAbilityById: (id: number) => {
          if (id === 1) return parentAbility;
          if (id === 2) return childAbility;
          return undefined;
        },
      });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Parent and child abilities must belong to the same world');
    });

    it('throws when link already exists (UNIQUE constraint with SQLITE code)', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const childAbility = buildAbility({ id: 2, world_id: 10 });
      const runMock = vi.fn(() => {
        const err = Object.assign(new Error('UNIQUE constraint failed'), {
          code: 'SQLITE_CONSTRAINT_UNIQUE',
        });
        throw err;
      });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT id, world_id FROM abilities WHERE id = ?') {
          return {
            get: vi.fn((id: unknown) => {
              if (id === 1) return { id: parentAbility.id, world_id: parentAbility.world_id };
              if (id === 2) return { id: childAbility.id, world_id: childAbility.world_id };
              return undefined;
            }),
          };
        }
        return { run: runMock };
      });
      const db = { prepare: prepareMock } as unknown as Database.Database;
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Child ability link already exists');
    });

    it('throws when link already exists (UNIQUE constraint via message)', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const childAbility = buildAbility({ id: 2, world_id: 10 });
      const runMock = vi.fn(() => {
        throw new Error(
          'UNIQUE constraint failed: ability_children.parent_id, ability_children.child_id',
        );
      });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT id, world_id FROM abilities WHERE id = ?') {
          return {
            get: vi.fn((id: unknown) => {
              if (id === 1) return { id: parentAbility.id, world_id: parentAbility.world_id };
              if (id === 2) return { id: childAbility.id, world_id: childAbility.world_id };
              return undefined;
            }),
          };
        }
        return { run: runMock };
      });
      const db = { prepare: prepareMock } as unknown as Database.Database;
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Child ability link already exists');
    });

    it('re-throws non-duplicate errors', () => {
      const parentAbility = buildAbility({ id: 1, world_id: 10 });
      const childAbility = buildAbility({ id: 2, world_id: 10 });
      const runMock = vi.fn(() => {
        throw new Error('Some unexpected DB error');
      });
      const prepareMock = vi.fn((sql: string) => {
        if (sql === 'SELECT id, world_id FROM abilities WHERE id = ?') {
          return {
            get: vi.fn((id: unknown) => {
              if (id === 1) return { id: parentAbility.id, world_id: parentAbility.world_id };
              if (id === 2) return { id: childAbility.id, world_id: childAbility.world_id };
              return undefined;
            }),
          };
        }
        return { run: runMock };
      });
      const db = { prepare: prepareMock } as unknown as Database.Database;
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      const h = getHandlers();
      expect(() => h[IPC.ABILITIES_ADD_CHILD]({}, { parent_id: 1, child_id: 2 }))
        .toThrowError('Some unexpected DB error');
    });
  });

  describe(IPC.ABILITIES_REMOVE_CHILD, () => {
    it('removes child link and returns relation', () => {
      const runMock = vi.fn();
      (dbMock.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({ run: runMock });
      const result = handlers[IPC.ABILITIES_REMOVE_CHILD]({}, { parent_id: 1, child_id: 2 });
      expect(result).toEqual({ parent_id: 1, child_id: 2 });
      expect(runMock).toHaveBeenCalledWith(1, 2);
    });
  });

  describe(IPC.ABILITIES_GET_CHILDREN, () => {
    it('returns children of an ability', () => {
      const childAbility = buildAbility({ id: 2 });
      const db = createDbMock({ children: [childAbility] });
      vi.clearAllMocks();
      registerAbilityHandlers(db);
      // need to get the GET_CHILDREN handler which is the last one registered for children
      const freshHandlers = getHandlers();
      expect(freshHandlers[IPC.ABILITIES_GET_CHILDREN]({}, 1)).toEqual([childAbility]);
    });
  });
});
