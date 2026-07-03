import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WORLD_MAP_HOST_CHANNELS } from '../../../src/shared/worldMapHostChannels';

const exposeInMainWorldMock = vi.fn();
const invokeMock = vi.fn();
const sendMock = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: exposeInMainWorldMock,
  },
  ipcRenderer: {
    invoke: invokeMock,
    send: sendMock,
  },
}));

describe('preloadWorldMap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exposes worldMapHost bridge and forwards all host commands', async () => {
    await import('../../../src/preloadWorldMap');

    expect(exposeInMainWorldMock).toHaveBeenCalledWith(
      'worldMapHost',
      expect.objectContaining({
        getSession: expect.any(Function),
        saveCurrent: expect.any(Function),
        regenerate: expect.any(Function),
        exportCopy: expect.any(Function),
        close: expect.any(Function),
      }),
    );

    const host = exposeInMainWorldMock.mock.calls[0][1] as WorldMapHost;
    await host.getSession();
    await host.saveCurrent('MAPDATA', {
      mapName: 'Atlas',
      generatorVersion: 'v1.99',
    });
    await host.regenerate();
    await host.exportCopy('MAPDATA', 'atlas.map.gz');
    await host.close({ ok: true });

    expect(invokeMock.mock.calls).toEqual([
      [WORLD_MAP_HOST_CHANNELS.GET_SESSION],
      [
        WORLD_MAP_HOST_CHANNELS.SAVE,
        'MAPDATA',
        { mapName: 'Atlas', generatorVersion: 'v1.99' },
      ],
      [WORLD_MAP_HOST_CHANNELS.REGENERATE],
      [WORLD_MAP_HOST_CHANNELS.EXPORT_COPY, 'MAPDATA', 'atlas.map.gz'],
    ]);
    expect(sendMock).toHaveBeenCalledWith(WORLD_MAP_HOST_CHANNELS.CLOSE, { ok: true });
  });
});
