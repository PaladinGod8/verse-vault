import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAbilityHandlers } from '../../../src/main/ipc/registerAbilityHandlers';
import { registerActHandlers } from '../../../src/main/ipc/registerActHandlers';
import { registerArcHandlers } from '../../../src/main/ipc/registerArcHandlers';
import { registerBattleMapHandlers } from '../../../src/main/ipc/registerBattleMapHandlers';
import { registerCampaignHandlers } from '../../../src/main/ipc/registerCampaignHandlers';
import { registerLevelHandlers } from '../../../src/main/ipc/registerLevelHandlers';
import { registerSceneHandlers } from '../../../src/main/ipc/registerSceneHandlers';
import { registerSessionHandlers } from '../../../src/main/ipc/registerSessionHandlers';
import { registerStatBlockHandlers } from '../../../src/main/ipc/registerStatBlockHandlers';
import { registerTokenHandlers } from '../../../src/main/ipc/registerTokenHandlers';
import { registerVerseHandlers } from '../../../src/main/ipc/registerVerseHandlers';
import { registerWorldHandlers } from '../../../src/main/ipc/registerWorldHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

const { ipcHandleMock } = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\mock-user-data'),
  },
  ipcMain: {
    handle: ipcHandleMock,
  },
}));

vi.mock('../../../src/database/db', () => ({
  db: {
    tokens: {
      moveToWorld: vi.fn(),
      moveToCampaign: vi.fn(),
    },
  },
  ensureTokenConfigJsonText: (config: unknown) => {
    if (typeof config !== 'string') {
      throw new Error('Token config must be a JSON string');
    }
    return config;
  },
}));

function createDbMock(): Database.Database {
  const statement = {
    all: vi.fn(() => []),
    get: vi.fn(() => undefined),
    run: vi.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
  };
  return {
    prepare: vi.fn(() => statement),
    transaction: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
  } as unknown as Database.Database;
}

function registerAndGetChannels(registerCall: () => void): string[] {
  const before = ipcHandleMock.mock.calls.length;
  registerCall();
  const newCalls = ipcHandleMock.mock.calls.slice(before);
  return newCalls.map(([channel]) => channel as string);
}

describe('IPC registrar channel wiring', () => {
  const dbMock = createDbMock();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers expected channels per registrar', () => {
    const channelsByRegistrar: Array<{
      name: string;
      expected: string[];
      register: () => void;
    }> = [
      {
        name: 'verses',
        register: () => registerVerseHandlers(dbMock),
        expected: [
          IPC.VERSES_GET_ALL,
          IPC.VERSES_ADD,
          IPC.VERSES_UPDATE,
          IPC.VERSES_DELETE,
        ],
      },
      {
        name: 'worlds',
        register: () => registerWorldHandlers(dbMock),
        expected: [
          IPC.WORLDS_GET_ALL,
          IPC.WORLDS_GET_BY_ID,
          IPC.WORLDS_ADD,
          IPC.WORLDS_UPDATE,
          IPC.WORLDS_DELETE,
          IPC.WORLDS_MARK_VIEWED,
          IPC.WORLDS_IMPORT_IMAGE,
        ],
      },
      {
        name: 'levels',
        register: () => registerLevelHandlers(dbMock),
        expected: [
          IPC.LEVELS_GET_ALL_BY_WORLD,
          IPC.LEVELS_GET_BY_ID,
          IPC.LEVELS_ADD,
          IPC.LEVELS_UPDATE,
          IPC.LEVELS_DELETE,
        ],
      },
      {
        name: 'campaigns',
        register: () => registerCampaignHandlers(dbMock),
        expected: [
          IPC.CAMPAIGNS_GET_ALL_BY_WORLD,
          IPC.CAMPAIGNS_GET_BY_ID,
          IPC.CAMPAIGNS_ADD,
          IPC.CAMPAIGNS_UPDATE,
          IPC.CAMPAIGNS_DELETE,
        ],
      },
      {
        name: 'battlemaps',
        register: () => registerBattleMapHandlers(dbMock),
        expected: [
          IPC.BATTLEMAPS_GET_ALL_BY_WORLD,
          IPC.BATTLEMAPS_GET_BY_ID,
          IPC.BATTLEMAPS_ADD,
          IPC.BATTLEMAPS_UPDATE,
          IPC.BATTLEMAPS_DELETE,
        ],
      },
      {
        name: 'tokens',
        register: () => registerTokenHandlers(dbMock, { userDataPath: 'C:\\mock-user-data' }),
        expected: [
          IPC.TOKENS_GET_ALL_BY_CAMPAIGN,
          IPC.TOKENS_GET_ALL_BY_WORLD,
          IPC.TOKENS_GET_BY_ID,
          IPC.TOKENS_ADD,
          IPC.TOKENS_UPDATE,
          IPC.TOKENS_MOVE_TO_WORLD,
          IPC.TOKENS_MOVE_TO_CAMPAIGN,
          IPC.TOKENS_DELETE,
          IPC.TOKENS_IMPORT_IMAGE,
        ],
      },
      {
        name: 'arcs',
        register: () => registerArcHandlers(dbMock),
        expected: [
          IPC.ARCS_GET_ALL_BY_CAMPAIGN,
          IPC.ARCS_GET_BY_ID,
          IPC.ARCS_ADD,
          IPC.ARCS_UPDATE,
          IPC.ARCS_DELETE,
        ],
      },
      {
        name: 'acts',
        register: () => registerActHandlers(dbMock),
        expected: [
          IPC.ACTS_GET_ALL_BY_ARC,
          IPC.ACTS_GET_ALL_BY_CAMPAIGN,
          IPC.ACTS_GET_BY_ID,
          IPC.ACTS_ADD,
          IPC.ACTS_UPDATE,
          IPC.ACTS_DELETE,
          IPC.ACTS_MOVE_TO_ARC,
        ],
      },
      {
        name: 'sessions',
        register: () => registerSessionHandlers(dbMock),
        expected: [
          IPC.SESSIONS_GET_ALL_BY_CAMPAIGN,
          IPC.SESSIONS_GET_ALL_BY_ACT,
          IPC.SESSIONS_GET_BY_ID,
          IPC.SESSIONS_ADD,
          IPC.SESSIONS_UPDATE,
          IPC.SESSIONS_DELETE,
          IPC.SESSIONS_MOVE_TO_ACT,
        ],
      },
      {
        name: 'scenes',
        register: () => registerSceneHandlers(dbMock),
        expected: [
          IPC.SCENES_GET_ALL_BY_CAMPAIGN,
          IPC.SCENES_GET_ALL_BY_SESSION,
          IPC.SCENES_GET_BY_ID,
          IPC.SCENES_ADD,
          IPC.SCENES_UPDATE,
          IPC.SCENES_DELETE,
          IPC.SCENES_MOVE_TO_SESSION,
        ],
      },
      {
        name: 'abilities',
        register: () => registerAbilityHandlers(dbMock),
        expected: [
          IPC.ABILITIES_GET_ALL_BY_WORLD,
          IPC.ABILITIES_GET_BY_ID,
          IPC.ABILITIES_ADD,
          IPC.ABILITIES_UPDATE,
          IPC.ABILITIES_DELETE,
          IPC.ABILITIES_ADD_CHILD,
          IPC.ABILITIES_REMOVE_CHILD,
          IPC.ABILITIES_GET_CHILDREN,
        ],
      },
      {
        name: 'statblocks',
        register: () => registerStatBlockHandlers(dbMock),
        expected: [
          IPC.STATBLOCKS_GET_ALL_BY_WORLD,
          IPC.STATBLOCKS_GET_ALL_BY_CAMPAIGN,
          IPC.STATBLOCKS_GET_BY_ID,
          IPC.STATBLOCKS_ADD,
          IPC.STATBLOCKS_UPDATE,
          IPC.STATBLOCKS_DELETE,
          IPC.STATBLOCKS_LINK_TOKEN,
          IPC.STATBLOCKS_UNLINK_TOKEN,
          IPC.STATBLOCKS_GET_LINKED_TOKENS,
          IPC.STATBLOCKS_GET_LINKED_STATBLOCK,
          IPC.STATBLOCKS_ATTACH_ABILITY,
          IPC.STATBLOCKS_DETACH_ABILITY,
          IPC.STATBLOCKS_LIST_ABILITIES,
        ],
      },
    ];

    for (const { name, register, expected } of channelsByRegistrar) {
      const registered = registerAndGetChannels(register);
      expect(registered, `registrar ${name}`).toEqual(expected);

      for (const channel of expected) {
        expect(ipcHandleMock).toHaveBeenCalledWith(channel, expect.any(Function));
      }
    }
  });

  it('covers every IPC channel exactly once across all registrars', () => {
    const allRegisterCalls = [
      () => registerVerseHandlers(dbMock),
      () => registerWorldHandlers(dbMock),
      () => registerLevelHandlers(dbMock),
      () => registerCampaignHandlers(dbMock),
      () => registerBattleMapHandlers(dbMock),
      () => registerTokenHandlers(dbMock, { userDataPath: 'C:\\mock-user-data' }),
      () => registerArcHandlers(dbMock),
      () => registerActHandlers(dbMock),
      () => registerSessionHandlers(dbMock),
      () => registerSceneHandlers(dbMock),
      () => registerAbilityHandlers(dbMock),
      () => registerStatBlockHandlers(dbMock),
    ];

    const allRegisteredChannels = allRegisterCalls
      .flatMap((register) => registerAndGetChannels(register));
    const uniqueRegisteredChannels = new Set(allRegisteredChannels);
    const expectedChannels = Object.values(IPC);

    expect(uniqueRegisteredChannels.size).toBe(expectedChannels.length);
    expect([...uniqueRegisteredChannels].sort()).toEqual([...expectedChannels].sort());
  });
});
