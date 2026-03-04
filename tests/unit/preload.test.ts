import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC } from '../../src/shared/ipcChannels';

const exposeInMainWorldMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: exposeInMainWorldMock,
  },
  ipcRenderer: {
    invoke: invokeMock,
  },
}));

describe('preload', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exposes db api and forwards calls to IPC channels', async () => {
    await import('../../src/preload');

    expect(exposeInMainWorldMock).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorldMock).toHaveBeenCalledWith(
      'db',
      expect.objectContaining({
        verses: expect.any(Object),
        levels: expect.any(Object),
        abilities: expect.any(Object),
        worlds: expect.any(Object),
        campaigns: expect.any(Object),
        battlemaps: expect.any(Object),
        tokens: expect.any(Object),
        arcs: expect.any(Object),
        acts: expect.any(Object),
        sessions: expect.any(Object),
        scenes: expect.any(Object),
      }),
    );

    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    await api.verses.getAll();
    await api.verses.add({ text: 'Verse text' });
    await api.verses.update(3, { reference: 'John 3:16' });
    await api.verses.delete(7);
    await api.worlds.getAll();
    await api.worlds.getById(2);
    await api.worlds.add({ name: 'World name' });
    await api.worlds.update(5, { short_description: 'Updated' });
    await api.worlds.delete(9);
    await api.worlds.markViewed(11);
    await api.abilities.getAllByWorld(3);
    await api.abilities.getById(4);
    await api.abilities.add({
      world_id: 3,
      name: 'Ability',
      type: 'active',
    });
    await api.abilities.update(4, { name: 'Updated ability' });
    await api.abilities.delete(4);
    await api.abilities.addChild({ parent_id: 1, child_id: 2 });
    await api.abilities.removeChild({ parent_id: 1, child_id: 2 });
    await api.abilities.getChildren(1);
    await api.campaigns.getAllByWorld(5);
    await api.campaigns.getById(31);
    await api.campaigns.add({ world_id: 1, name: 'Campaign' });
    await api.campaigns.update(31, { summary: 'Updated' });
    await api.campaigns.delete(31);
    await api.battlemaps.getAllByWorld(1);
    await api.battlemaps.getById(61);
    await api.battlemaps.add({ world_id: 1, name: 'BattleMap' });
    await api.battlemaps.update(61, { config: '{"size":20}' });
    await api.battlemaps.delete(61);
    await api.arcs.getAllByCampaign(1);
    await api.arcs.getById(10);
    await api.arcs.add({ campaign_id: 1, name: 'Arc' });
    await api.arcs.update(10, { name: 'Updated Arc' });
    await api.arcs.delete(10);
    await api.acts.getAllByArc(10);
    await api.acts.getAllByCampaign(1);
    await api.acts.getById(20);
    await api.acts.add({ arc_id: 10, name: 'Act' });
    await api.acts.update(20, { name: 'Updated Act' });
    await api.acts.delete(20);
    await api.acts.moveTo(20, 11);
    await api.sessions.getAllByAct(20);
    await api.sessions.getById(41);
    await api.sessions.add({
      act_id: 20,
      name: 'Session',
      notes: 'Session notes',
      planned_at: '2026-03-15T09:30',
    });
    await api.sessions.update(41, {
      sort_order: 2,
      planned_at: '2026-03-16T11:45',
    });
    await api.sessions.delete(41);
    await api.sessions.moveTo(41, 21);
    await api.scenes.getAllByCampaign(1);
    await api.scenes.getAllBySession(40);
    await api.scenes.getById(51);
    await api.scenes.add({ session_id: 40, name: 'Scene' });
    await api.scenes.update(51, { payload: '{}' });
    await api.scenes.delete(51);
    await api.scenes.moveTo(51, 42);
    await api.tokens.getAllByCampaign(1);
    await api.tokens.getById(71);
    await api.tokens.add({
      campaign_id: 1,
      name: 'Token',
      image_src: 'token.png',
    });
    await api.tokens.update(71, { is_visible: 0 });
    await api.tokens.delete(71);

    expect(invokeMock).toHaveBeenNthCalledWith(1, IPC.VERSES_GET_ALL);
    expect(invokeMock).toHaveBeenNthCalledWith(2, IPC.VERSES_ADD, {
      text: 'Verse text',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, IPC.VERSES_UPDATE, 3, {
      reference: 'John 3:16',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, IPC.VERSES_DELETE, 7);
    expect(invokeMock).toHaveBeenNthCalledWith(5, IPC.WORLDS_GET_ALL);
    expect(invokeMock).toHaveBeenNthCalledWith(6, IPC.WORLDS_GET_BY_ID, 2);
    expect(invokeMock).toHaveBeenNthCalledWith(7, IPC.WORLDS_ADD, {
      name: 'World name',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(8, IPC.WORLDS_UPDATE, 5, {
      short_description: 'Updated',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(9, IPC.WORLDS_DELETE, 9);
    expect(invokeMock).toHaveBeenNthCalledWith(10, IPC.WORLDS_MARK_VIEWED, 11);
    expect(invokeMock).toHaveBeenNthCalledWith(
      11,
      IPC.ABILITIES_GET_ALL_BY_WORLD,
      3,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(12, IPC.ABILITIES_GET_BY_ID, 4);
    expect(invokeMock).toHaveBeenNthCalledWith(13, IPC.ABILITIES_ADD, {
      world_id: 3,
      name: 'Ability',
      type: 'active',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(14, IPC.ABILITIES_UPDATE, 4, {
      name: 'Updated ability',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(15, IPC.ABILITIES_DELETE, 4);
    expect(invokeMock).toHaveBeenNthCalledWith(16, IPC.ABILITIES_ADD_CHILD, {
      parent_id: 1,
      child_id: 2,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(17, IPC.ABILITIES_REMOVE_CHILD, {
      parent_id: 1,
      child_id: 2,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(
      18,
      IPC.ABILITIES_GET_CHILDREN,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      19,
      IPC.CAMPAIGNS_GET_ALL_BY_WORLD,
      5,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(20, IPC.CAMPAIGNS_GET_BY_ID, 31);
    expect(invokeMock).toHaveBeenNthCalledWith(21, IPC.CAMPAIGNS_ADD, {
      world_id: 1,
      name: 'Campaign',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(22, IPC.CAMPAIGNS_UPDATE, 31, {
      summary: 'Updated',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(23, IPC.CAMPAIGNS_DELETE, 31);
    expect(invokeMock).toHaveBeenNthCalledWith(
      24,
      IPC.BATTLEMAPS_GET_ALL_BY_WORLD,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      25,
      IPC.BATTLEMAPS_GET_BY_ID,
      61,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(26, IPC.BATTLEMAPS_ADD, {
      world_id: 1,
      name: 'BattleMap',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(27, IPC.BATTLEMAPS_UPDATE, 61, {
      config: '{"size":20}',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(28, IPC.BATTLEMAPS_DELETE, 61);
    expect(invokeMock).toHaveBeenNthCalledWith(
      29,
      IPC.ARCS_GET_ALL_BY_CAMPAIGN,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(30, IPC.ARCS_GET_BY_ID, 10);
    expect(invokeMock).toHaveBeenNthCalledWith(31, IPC.ARCS_ADD, {
      campaign_id: 1,
      name: 'Arc',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(32, IPC.ARCS_UPDATE, 10, {
      name: 'Updated Arc',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(33, IPC.ARCS_DELETE, 10);
    expect(invokeMock).toHaveBeenNthCalledWith(34, IPC.ACTS_GET_ALL_BY_ARC, 10);
    expect(invokeMock).toHaveBeenNthCalledWith(
      35,
      IPC.ACTS_GET_ALL_BY_CAMPAIGN,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(36, IPC.ACTS_GET_BY_ID, 20);
    expect(invokeMock).toHaveBeenNthCalledWith(37, IPC.ACTS_ADD, {
      arc_id: 10,
      name: 'Act',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(38, IPC.ACTS_UPDATE, 20, {
      name: 'Updated Act',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(39, IPC.ACTS_DELETE, 20);
    expect(invokeMock).toHaveBeenNthCalledWith(
      40,
      IPC.ACTS_MOVE_TO_ARC,
      20,
      11,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      41,
      IPC.SESSIONS_GET_ALL_BY_ACT,
      20,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(42, IPC.SESSIONS_GET_BY_ID, 41);
    expect(invokeMock).toHaveBeenNthCalledWith(43, IPC.SESSIONS_ADD, {
      act_id: 20,
      name: 'Session',
      notes: 'Session notes',
      planned_at: '2026-03-15T09:30',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(44, IPC.SESSIONS_UPDATE, 41, {
      sort_order: 2,
      planned_at: '2026-03-16T11:45',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(45, IPC.SESSIONS_DELETE, 41);
    expect(invokeMock).toHaveBeenNthCalledWith(
      46,
      IPC.SESSIONS_MOVE_TO_ACT,
      41,
      21,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      47,
      IPC.SCENES_GET_ALL_BY_CAMPAIGN,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      48,
      IPC.SCENES_GET_ALL_BY_SESSION,
      40,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(49, IPC.SCENES_GET_BY_ID, 51);
    expect(invokeMock).toHaveBeenNthCalledWith(50, IPC.SCENES_ADD, {
      session_id: 40,
      name: 'Scene',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(51, IPC.SCENES_UPDATE, 51, {
      payload: '{}',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(52, IPC.SCENES_DELETE, 51);
    expect(invokeMock).toHaveBeenNthCalledWith(
      53,
      IPC.SCENES_MOVE_TO_SESSION,
      51,
      42,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      54,
      IPC.TOKENS_GET_ALL_BY_CAMPAIGN,
      1,
    );
    expect(invokeMock).toHaveBeenNthCalledWith(55, IPC.TOKENS_GET_BY_ID, 71);
    expect(invokeMock).toHaveBeenNthCalledWith(56, IPC.TOKENS_ADD, {
      campaign_id: 1,
      name: 'Token',
      image_src: 'token.png',
    });
    expect(invokeMock).toHaveBeenNthCalledWith(57, IPC.TOKENS_UPDATE, 71, {
      is_visible: 0,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(58, IPC.TOKENS_DELETE, 71);
  });

  it('forwards tokens.importImage to TOKENS_IMPORT_IMAGE', async () => {
    await import('../../src/preload');
    const api = exposeInMainWorldMock.mock.calls[0][1] as DbApi;

    const payload: TokenImageImportPayload = {
      fileName: 'wolf.png',
      mimeType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    };

    await api.tokens.importImage(payload);

    expect(invokeMock).toHaveBeenCalledWith(IPC.TOKENS_IMPORT_IMAGE, payload);
  });
});
