import type Database from 'better-sqlite3';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipcChannels';

type AbilityAddData = {
  world_id: number;
  name: string;
  description?: string | null;
  type: string;
  passive_subtype?: string | null;
  level_id?: number | null;
  effects?: string;
  conditions?: string;
  cast_cost?: string;
  trigger?: string | null;
  pick_count?: number | null;
  pick_timing?: string | null;
  pick_is_permanent?: number;
  range_cells?: number | null;
  aoe_shape?: string | null;
  aoe_size_cells?: number | null;
  target_type?: string | null;
};

type AbilityUpdateData = {
  name?: string;
  description?: string | null;
  type?: string;
  passive_subtype?: string | null;
  level_id?: number | null;
  effects?: string;
  conditions?: string;
  cast_cost?: string;
  trigger?: string | null;
  pick_count?: number | null;
  pick_timing?: string | null;
  pick_is_permanent?: number;
  range_cells?: number | null;
  aoe_shape?: string | null;
  aoe_size_cells?: number | null;
  target_type?: string | null;
};

type AbilitySqlValue = string | number | null;

function isAbilityChildDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes(
    'UNIQUE constraint failed: ability_children.parent_id, ability_children.child_id',
  );
}

function hasOwn<T extends object>(data: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function requireTrimmedString(value: unknown, message: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function applyRequiredTrimmedUpdate(
  data: AbilityUpdateData,
  key: 'name' | 'type',
  column: string,
  errorMessage: string,
  setClauses: string[],
  values: AbilitySqlValue[],
): void {
  if (!hasOwn(data, key)) {
    return;
  }

  setClauses.push(`${column} = ?`);
  values.push(requireTrimmedString(data[key], errorMessage));
}

function applyOptionalUpdate(
  data: AbilityUpdateData,
  key:
    | 'description'
    | 'passive_subtype'
    | 'level_id'
    | 'effects'
    | 'conditions'
    | 'cast_cost'
    | 'trigger'
    | 'pick_count'
    | 'pick_timing'
    | 'pick_is_permanent',
  column: string,
  setClauses: string[],
  values: AbilitySqlValue[],
): void {
  if (!hasOwn(data, key) || data[key] === undefined) {
    return;
  }

  setClauses.push(`${column} = ?`);
  values.push(data[key] as AbilitySqlValue);
}

function applyOwnNullableUpdate(
  data: AbilityUpdateData,
  key: 'range_cells' | 'aoe_shape' | 'aoe_size_cells' | 'target_type',
  column: string,
  setClauses: string[],
  values: AbilitySqlValue[],
): void {
  if (!hasOwn(data, key)) {
    return;
  }

  setClauses.push(`${column} = ?`);
  values.push((data[key] as AbilitySqlValue) ?? null);
}

function buildAbilityUpdateStatement(data: AbilityUpdateData): {
  setClauses: string[];
  values: AbilitySqlValue[];
} {
  const setClauses: string[] = [];
  const values: AbilitySqlValue[] = [];

  applyRequiredTrimmedUpdate(
    data,
    'name',
    'name',
    'Ability name cannot be empty',
    setClauses,
    values,
  );
  applyOptionalUpdate(data, 'description', 'description', setClauses, values);
  applyRequiredTrimmedUpdate(
    data,
    'type',
    'type',
    'Ability type cannot be empty',
    setClauses,
    values,
  );
  applyOptionalUpdate(
    data,
    'passive_subtype',
    'passive_subtype',
    setClauses,
    values,
  );
  applyOptionalUpdate(data, 'level_id', 'level_id', setClauses, values);
  applyOptionalUpdate(data, 'effects', 'effects', setClauses, values);
  applyOptionalUpdate(data, 'conditions', 'conditions', setClauses, values);
  applyOptionalUpdate(data, 'cast_cost', 'cast_cost', setClauses, values);
  applyOptionalUpdate(data, 'trigger', 'trigger', setClauses, values);
  applyOptionalUpdate(data, 'pick_count', 'pick_count', setClauses, values);
  applyOptionalUpdate(data, 'pick_timing', 'pick_timing', setClauses, values);
  applyOptionalUpdate(
    data,
    'pick_is_permanent',
    'pick_is_permanent',
    setClauses,
    values,
  );

  applyOwnNullableUpdate(data, 'range_cells', 'range_cells', setClauses, values);
  applyOwnNullableUpdate(data, 'aoe_shape', 'aoe_shape', setClauses, values);
  applyOwnNullableUpdate(
    data,
    'aoe_size_cells',
    'aoe_size_cells',
    setClauses,
    values,
  );
  applyOwnNullableUpdate(data, 'target_type', 'target_type', setClauses, values);

  return { setClauses, values };
}

function registerAbilityReadHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ABILITIES_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM abilities WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.ABILITIES_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM abilities WHERE id = ?').get(id) ?? null;
  });
}

function registerAbilityMutationHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.ABILITIES_ADD, (_event, data: AbilityAddData) => {
    const name = requireTrimmedString(data.name, 'Ability name is required');
    const type = requireTrimmedString(data.type, 'Ability type is required');

    const result = db
      .prepare(
        `
          INSERT INTO abilities (
            world_id,
            name,
            description,
            type,
            passive_subtype,
            level_id,
            effects,
            conditions,
            cast_cost,
            trigger,
            pick_count,
            pick_timing,
            pick_is_permanent,
            range_cells,
            aoe_shape,
            aoe_size_cells,
            target_type
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
      )
      .run(
        data.world_id,
        name,
        data.description ?? null,
        type,
        data.passive_subtype ?? null,
        data.level_id ?? null,
        data.effects ?? '[]',
        data.conditions ?? '[]',
        data.cast_cost ?? '{}',
        data.trigger ?? null,
        data.pick_count ?? null,
        data.pick_timing ?? null,
        data.pick_is_permanent ?? 0,
        asNullableNumber(data.range_cells),
        asNullableString(data.aoe_shape),
        asNullableNumber(data.aoe_size_cells),
        asNullableString(data.target_type),
      );

    const ability = db
      .prepare('SELECT * FROM abilities WHERE id = ?')
      .get(result.lastInsertRowid);
    if (!ability) {
      throw new Error('Failed to create ability');
    }
    return ability;
  });

  ipcMain.handle(
    IPC.ABILITIES_UPDATE,
    (_event, id: number, data: AbilityUpdateData) => {
      const { setClauses, values } = buildAbilityUpdateStatement(data);
      const updateSql = setClauses.length > 0
        ? `UPDATE abilities SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
        : "UPDATE abilities SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const ability = db
        .prepare('SELECT * FROM abilities WHERE id = ?')
        .get(id);
      if (!ability) {
        throw new Error('Ability not found');
      }
      return ability;
    },
  );

  ipcMain.handle(IPC.ABILITIES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM abilities WHERE id = ?').run(id);
    return { id };
  });
}

function registerAbilityChildHandlers(db: Database.Database): void {
  ipcMain.handle(
    IPC.ABILITIES_ADD_CHILD,
    (_event, data: { parent_id: number; child_id: number; }) => {
      if (data.parent_id === data.child_id) {
        throw new Error('Parent ability cannot be linked to itself');
      }

      const parent = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.parent_id) as { id: number; world_id: number; } | undefined;
      if (!parent) {
        throw new Error('Parent ability not found');
      }

      const child = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.child_id) as { id: number; world_id: number; } | undefined;
      if (!child) {
        throw new Error('Child ability not found');
      }

      if (parent.world_id !== child.world_id) {
        throw new Error(
          'Parent and child abilities must belong to the same world',
        );
      }

      try {
        db.prepare(
          'INSERT INTO ability_children (parent_id, child_id) VALUES (?, ?)',
        ).run(data.parent_id, data.child_id);
      } catch (error) {
        if (isAbilityChildDuplicateError(error)) {
          throw new Error('Child ability link already exists');
        }
        throw error;
      }

      return {
        parent_id: data.parent_id,
        child_id: data.child_id,
      };
    },
  );

  ipcMain.handle(
    IPC.ABILITIES_REMOVE_CHILD,
    (_event, data: { parent_id: number; child_id: number; }) => {
      db.prepare(
        'DELETE FROM ability_children WHERE parent_id = ? AND child_id = ?',
      ).run(data.parent_id, data.child_id);
      return {
        parent_id: data.parent_id,
        child_id: data.child_id,
      };
    },
  );

  ipcMain.handle(IPC.ABILITIES_GET_CHILDREN, (_event, abilityId: number) => {
    return db
      .prepare(
        `
        SELECT child.*
        FROM ability_children AS relation
        INNER JOIN abilities AS child ON child.id = relation.child_id
        WHERE relation.parent_id = ?
        ORDER BY child.updated_at DESC
        `,
      )
      .all(abilityId);
  });
}

export function registerAbilityHandlers(db: Database.Database): void {
  registerAbilityReadHandlers(db);
  registerAbilityMutationHandlers(db);
  registerAbilityChildHandlers(db);
}
