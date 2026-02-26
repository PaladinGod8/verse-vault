// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipcChannels';

contextBridge.exposeInMainWorld('db', {
  verses: {
    getAll: (): Promise<Verse[]> => ipcRenderer.invoke(IPC.VERSES_GET_ALL),
    add: (data: {
      text: string;
      reference?: string;
      tags?: string;
    }): Promise<Verse> => ipcRenderer.invoke(IPC.VERSES_ADD, data),
    update: (
      id: number,
      data: { text?: string; reference?: string; tags?: string },
    ): Promise<Verse> => ipcRenderer.invoke(IPC.VERSES_UPDATE, id, data),
    delete: (id: number): Promise<{ id: number }> =>
      ipcRenderer.invoke(IPC.VERSES_DELETE, id),
  },
  worlds: {
    getAll: (): Promise<World[]> => ipcRenderer.invoke(IPC.WORLDS_GET_ALL),
    getById: (id: number): Promise<World | null> =>
      ipcRenderer.invoke(IPC.WORLDS_GET_BY_ID, id),
    add: (data: {
      name: string;
      thumbnail?: string | null;
      short_description?: string | null;
    }): Promise<World> => ipcRenderer.invoke(IPC.WORLDS_ADD, data),
  },
});
