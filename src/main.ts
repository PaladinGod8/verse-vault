import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './database/db';
import { IPC } from './shared/ipcChannels';

function isAbilityChildDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : '';
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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Register IPC handlers for database operations.
function registerIpcHandlers() {
  const db = getDatabase();

  ipcMain.handle(IPC.VERSES_GET_ALL, () => {
    return db.prepare('SELECT * FROM verses ORDER BY created_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_ALL, () => {
    return db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC').all();
  });

  ipcMain.handle(IPC.WORLDS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.WORLDS_ADD,
    (
      _event,
      data: {
        name: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('World name is required');
      }

      const stmt = db.prepare(
        'INSERT INTO worlds (name, thumbnail, short_description) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        name,
        data.thumbnail ?? null,
        data.short_description ?? null,
      );

      const world = db
        .prepare('SELECT * FROM worlds WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!world) {
        throw new Error('Failed to create world');
      }
      return world;
    },
  );

  ipcMain.handle(
    IPC.WORLDS_UPDATE,
    (
      _event,
      id: number,
      data: {
        name?: string;
        thumbnail?: string | null;
        short_description?: string | null;
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasThumbnail = Object.prototype.hasOwnProperty.call(
        data,
        'thumbnail',
      );
      const hasShortDescription = Object.prototype.hasOwnProperty.call(
        data,
        'short_description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('World name is required');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasThumbnail && data.thumbnail !== undefined) {
        setClauses.push('thumbnail = ?');
        values.push(data.thumbnail);
      }

      if (hasShortDescription && data.short_description !== undefined) {
        setClauses.push('short_description = ?');
        values.push(data.short_description);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE worlds SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE worlds SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id);
      if (!world) {
        throw new Error('World not found');
      }
      return world;
    },
  );

  ipcMain.handle(IPC.WORLDS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.WORLDS_MARK_VIEWED, (_event, id: number) => {
    db.prepare(
      "UPDATE worlds SET last_viewed_at = datetime('now') WHERE id = ?",
    ).run(id);
    return db.prepare('SELECT * FROM worlds WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(IPC.LEVELS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM levels WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.LEVELS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM levels WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.LEVELS_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        category: string;
        description?: string | null;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Level name is required');
      }
      const category =
        typeof data.category === 'string' ? data.category.trim() : '';
      if (!category) {
        throw new Error('Level category is required');
      }

      const result = db
        .prepare(
          'INSERT INTO levels (world_id, name, category, description) VALUES (?, ?, ?, ?)',
        )
        .run(data.world_id, name, category, data.description ?? null);

      const level = db
        .prepare('SELECT * FROM levels WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!level) {
        throw new Error('Failed to create level');
      }
      return level;
    },
  );

  ipcMain.handle(
    IPC.LEVELS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; category?: string; description?: string | null },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasCategory = Object.prototype.hasOwnProperty.call(
        data,
        'category',
      );
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Level name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasCategory) {
        const trimmedCategory =
          typeof data.category === 'string' ? data.category.trim() : '';
        if (!trimmedCategory) {
          throw new Error('Level category cannot be empty');
        }
        setClauses.push('category = ?');
        values.push(trimmedCategory);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE levels SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE levels SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(id);
      if (!level) {
        throw new Error('Level not found');
      }
      return level;
    },
  );

  ipcMain.handle(IPC.LEVELS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM levels WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(IPC.CAMPAIGNS_GET_ALL_BY_WORLD, (_event, worldId: number) => {
    return db
      .prepare(
        'SELECT * FROM campaigns WHERE world_id = ? ORDER BY updated_at DESC',
      )
      .all(worldId);
  });

  ipcMain.handle(IPC.CAMPAIGNS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.CAMPAIGNS_ADD,
    (
      _event,
      data: {
        world_id: number;
        name: string;
        summary?: string | null;
        config?: string;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Campaign name is required');
      }

      const result = db
        .prepare(
          'INSERT INTO campaigns (world_id, name, summary, config) VALUES (?, ?, ?, ?)',
        )
        .run(data.world_id, name, data.summary ?? null, data.config ?? '{}');

      const campaign = db
        .prepare('SELECT * FROM campaigns WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!campaign) {
        throw new Error('Failed to create campaign');
      }
      return campaign;
    },
  );

  ipcMain.handle(
    IPC.CAMPAIGNS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; summary?: string | null; config?: string },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasSummary = Object.prototype.hasOwnProperty.call(data, 'summary');
      const hasConfig = Object.prototype.hasOwnProperty.call(data, 'config');

      const setClauses: string[] = [];
      const values: Array<string | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Campaign name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasSummary && data.summary !== undefined) {
        setClauses.push('summary = ?');
        values.push(data.summary);
      }

      if (hasConfig && data.config !== undefined) {
        setClauses.push('config = ?');
        values.push(data.config);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE campaigns SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const campaign = db
        .prepare('SELECT * FROM campaigns WHERE id = ?')
        .get(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    },
  );

  ipcMain.handle(IPC.CAMPAIGNS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    return { id };
  });

  ipcMain.handle(
    IPC.SESSIONS_GET_ALL_BY_CAMPAIGN,
    (_event, campaignId: number) => {
      return db
        .prepare(
          'SELECT * FROM sessions WHERE campaign_id = ? ORDER BY updated_at DESC',
        )
        .all(campaignId);
    },
  );

  ipcMain.handle(IPC.SESSIONS_GET_BY_ID, (_event, id: number) => {
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) ?? null;
  });

  ipcMain.handle(
    IPC.SESSIONS_ADD,
    (
      _event,
      data: {
        campaign_id: number;
        name: string;
        notes?: string | null;
        sort_order?: number;
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Session name is required');
      }

      const result = db
        .prepare(
          'INSERT INTO sessions (campaign_id, name, notes, sort_order) VALUES (?, ?, ?, ?)',
        )
        .run(data.campaign_id, name, data.notes ?? null, data.sort_order ?? 0);

      const session = db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!session) {
        throw new Error('Failed to create session');
      }
      return session;
    },
  );

  ipcMain.handle(
    IPC.SESSIONS_UPDATE,
    (
      _event,
      id: number,
      data: { name?: string; notes?: string | null; sort_order?: number },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasNotes = Object.prototype.hasOwnProperty.call(data, 'notes');
      const hasSortOrder = Object.prototype.hasOwnProperty.call(
        data,
        'sort_order',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Session name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasNotes && data.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(data.notes);
      }

      if (hasSortOrder && data.sort_order !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(data.sort_order);
      }

      const updateSql =
        setClauses.length > 0
          ? `UPDATE sessions SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`
          : "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?";
      db.prepare(updateSql).run(...values, id);

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
      if (!session) {
        throw new Error('Session not found');
      }
      return session;
    },
  );

  ipcMain.handle(IPC.SESSIONS_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return { id };
  });

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

  ipcMain.handle(
    IPC.ABILITIES_ADD,
    (
      _event,
      data: {
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
      },
    ) => {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        throw new Error('Ability name is required');
      }
      const type = typeof data.type === 'string' ? data.type.trim() : '';
      if (!type) {
        throw new Error('Ability type is required');
      }

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
            pick_is_permanent
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        );

      const ability = db
        .prepare('SELECT * FROM abilities WHERE id = ?')
        .get(result.lastInsertRowid);
      if (!ability) {
        throw new Error('Failed to create ability');
      }
      return ability;
    },
  );

  ipcMain.handle(
    IPC.ABILITIES_UPDATE,
    (
      _event,
      id: number,
      data: {
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
      },
    ) => {
      const hasName = Object.prototype.hasOwnProperty.call(data, 'name');
      const hasDescription = Object.prototype.hasOwnProperty.call(
        data,
        'description',
      );
      const hasType = Object.prototype.hasOwnProperty.call(data, 'type');
      const hasPassiveSubtype = Object.prototype.hasOwnProperty.call(
        data,
        'passive_subtype',
      );
      const hasLevelId = Object.prototype.hasOwnProperty.call(data, 'level_id');
      const hasEffects = Object.prototype.hasOwnProperty.call(data, 'effects');
      const hasConditions = Object.prototype.hasOwnProperty.call(
        data,
        'conditions',
      );
      const hasCastCost = Object.prototype.hasOwnProperty.call(
        data,
        'cast_cost',
      );
      const hasTrigger = Object.prototype.hasOwnProperty.call(data, 'trigger');
      const hasPickCount = Object.prototype.hasOwnProperty.call(
        data,
        'pick_count',
      );
      const hasPickTiming = Object.prototype.hasOwnProperty.call(
        data,
        'pick_timing',
      );
      const hasPickIsPermanent = Object.prototype.hasOwnProperty.call(
        data,
        'pick_is_permanent',
      );

      const setClauses: string[] = [];
      const values: Array<string | number | null> = [];

      if (hasName) {
        const trimmedName =
          typeof data.name === 'string' ? data.name.trim() : '';
        if (!trimmedName) {
          throw new Error('Ability name cannot be empty');
        }
        setClauses.push('name = ?');
        values.push(trimmedName);
      }

      if (hasDescription && data.description !== undefined) {
        setClauses.push('description = ?');
        values.push(data.description);
      }

      if (hasType) {
        const trimmedType =
          typeof data.type === 'string' ? data.type.trim() : '';
        if (!trimmedType) {
          throw new Error('Ability type cannot be empty');
        }
        setClauses.push('type = ?');
        values.push(trimmedType);
      }

      if (hasPassiveSubtype && data.passive_subtype !== undefined) {
        setClauses.push('passive_subtype = ?');
        values.push(data.passive_subtype);
      }

      if (hasLevelId && data.level_id !== undefined) {
        setClauses.push('level_id = ?');
        values.push(data.level_id);
      }

      if (hasEffects && data.effects !== undefined) {
        setClauses.push('effects = ?');
        values.push(data.effects);
      }

      if (hasConditions && data.conditions !== undefined) {
        setClauses.push('conditions = ?');
        values.push(data.conditions);
      }

      if (hasCastCost && data.cast_cost !== undefined) {
        setClauses.push('cast_cost = ?');
        values.push(data.cast_cost);
      }

      if (hasTrigger && data.trigger !== undefined) {
        setClauses.push('trigger = ?');
        values.push(data.trigger);
      }

      if (hasPickCount && data.pick_count !== undefined) {
        setClauses.push('pick_count = ?');
        values.push(data.pick_count);
      }

      if (hasPickTiming && data.pick_timing !== undefined) {
        setClauses.push('pick_timing = ?');
        values.push(data.pick_timing);
      }

      if (hasPickIsPermanent && data.pick_is_permanent !== undefined) {
        setClauses.push('pick_is_permanent = ?');
        values.push(data.pick_is_permanent);
      }

      const updateSql =
        setClauses.length > 0
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

  ipcMain.handle(
    IPC.ABILITIES_ADD_CHILD,
    (_event, data: { parent_id: number; child_id: number }) => {
      if (data.parent_id === data.child_id) {
        throw new Error('Parent ability cannot be linked to itself');
      }

      const parent = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.parent_id) as { id: number; world_id: number } | undefined;
      if (!parent) {
        throw new Error('Parent ability not found');
      }

      const child = db
        .prepare('SELECT id, world_id FROM abilities WHERE id = ?')
        .get(data.child_id) as { id: number; world_id: number } | undefined;
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
    (_event, data: { parent_id: number; child_id: number }) => {
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

  ipcMain.handle(
    IPC.VERSES_ADD,
    (_event, data: { text: string; reference?: string; tags?: string }) => {
      const stmt = db.prepare(
        'INSERT INTO verses (text, reference, tags) VALUES (?, ?, ?)',
      );
      const result = stmt.run(
        data.text,
        data.reference ?? null,
        data.tags ?? null,
      );
      return db
        .prepare('SELECT * FROM verses WHERE id = ?')
        .get(result.lastInsertRowid);
    },
  );

  ipcMain.handle(
    IPC.VERSES_UPDATE,
    (
      _event,
      id: number,
      data: { text?: string; reference?: string; tags?: string },
    ) => {
      db.prepare(
        `
      UPDATE verses SET
        text = COALESCE(?, text),
        reference = COALESCE(?, reference),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ?
    `,
      ).run(data.text ?? null, data.reference ?? null, data.tags ?? null, id);
      return db.prepare('SELECT * FROM verses WHERE id = ?').get(id);
    },
  );

  ipcMain.handle(IPC.VERSES_DELETE, (_event, id: number) => {
    db.prepare('DELETE FROM verses WHERE id = ?').run(id);
    return { id };
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  registerIpcHandlers();
  createWindow();
});

app.on('before-quit', () => {
  closeDatabase();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
