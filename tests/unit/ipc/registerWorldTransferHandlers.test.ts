import type Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWorldTransferHandlers } from '../../../src/main/ipc/registerWorldTransferHandlers';
import { IPC } from '../../../src/shared/ipcChannels';

type IpcHandler = (...args: unknown[]) => unknown;

const {
  ipcHandleMock,
  showSaveDialogMock,
  showOpenDialogMock,
  readFileMock,
  writeFileMock,
  statMock,
  exportWorldMock,
  importWorldMock,
  createFsWorldMediaReaderMock,
  createFsWorldMediaWriterMock,
} = vi.hoisted(() => ({
  ipcHandleMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  readFileMock: vi.fn(),
  writeFileMock: vi.fn(),
  statMock: vi.fn(),
  exportWorldMock: vi.fn(),
  importWorldMock: vi.fn(),
  createFsWorldMediaReaderMock: vi.fn(),
  createFsWorldMediaWriterMock: vi.fn(),
}));

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: showSaveDialogMock,
    showOpenDialog: showOpenDialogMock,
  },
  ipcMain: {
    handle: ipcHandleMock,
  },
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: readFileMock,
    writeFile: writeFileMock,
    stat: statMock,
  },
  readFile: readFileMock,
  writeFile: writeFileMock,
  stat: statMock,
}));

vi.mock('../../../src/main/worldTransfer/exportWorld', () => ({
  exportWorld: exportWorldMock,
}));

vi.mock('../../../src/main/worldTransfer/importWorld', () => ({
  importWorld: importWorldMock,
}));

vi.mock('../../../src/main/worldTransfer/fsMedia', () => ({
  createFsWorldMediaReader: createFsWorldMediaReaderMock,
  createFsWorldMediaWriter: createFsWorldMediaWriterMock,
}));

function getHandlers(): Record<string, IpcHandler> {
  return Object.fromEntries(
    ipcHandleMock.mock.calls.map((
      [channel, handler],
    ) => [channel as string, handler as IpcHandler]),
  );
}

function createDbMock(): Database.Database {
  const prepare = vi.fn((sql: string) => {
    if (sql.includes('SELECT name FROM worlds WHERE id = ?')) {
      return { get: vi.fn(() => ({ name: 'Alpha' })) };
    }
    if (sql.includes('SELECT name FROM worlds')) {
      return { all: vi.fn(() => [{ name: 'Alpha' }]) };
    }
    return { get: vi.fn(() => undefined), all: vi.fn(() => []) };
  });

  return {
    prepare,
    transaction: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
  } as unknown as Database.Database;
}

describe('registerWorldTransferHandlers', () => {
  let handlers: Record<string, IpcHandler>;
  let dbMock: Database.Database;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    createFsWorldMediaReaderMock.mockReturnValue({ readMedia: vi.fn(), readSnapshot: vi.fn() });
    createFsWorldMediaWriterMock.mockReturnValue({ writeMedia: vi.fn(), writeSnapshot: vi.fn() });
    exportWorldMock.mockReturnValue({
      zip: new Uint8Array([1, 2, 3]),
      worldName: 'Alpha',
    });
    importWorldMock.mockReturnValue({
      worldId: 9,
      worldName: 'Alpha (imported)',
    });
    statMock.mockResolvedValue({ size: 1024 });

    registerWorldTransferHandlers(dbMock, {
      userDataPath: 'C:\\mock-user-data',
      appVersion: '1.0.0',
    });
    handlers = getHandlers();
  });

  it('exports a world after save dialog confirmation', async () => {
    showSaveDialogMock.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Exports\\alpha.zip',
    });

    const result = await handlers[IPC.WORLDS_EXPORT]({}, 1);

    expect(createFsWorldMediaReaderMock).toHaveBeenCalledWith('C:\\mock-user-data');
    expect(exportWorldMock).toHaveBeenCalledWith(
      dbMock,
      1,
      expect.any(Object),
      '1.0.0',
    );
    expect(writeFileMock).toHaveBeenCalledWith('C:\\Exports\\alpha.zip', new Uint8Array([1, 2, 3]));
    expect(result).toEqual({
      canceled: false,
      filePath: 'C:\\Exports\\alpha.zip',
      worldName: 'Alpha',
    });
  });

  it('returns canceled export when dialog is dismissed', async () => {
    showSaveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined });

    await expect(handlers[IPC.WORLDS_EXPORT]({}, 1)).resolves.toEqual({ canceled: true });
    expect(exportWorldMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('rejects invalid export ids and missing worlds', async () => {
    await expect(handlers[IPC.WORLDS_EXPORT]({}, 0)).rejects.toThrowError(
      'Export requires a valid world id',
    );

    const missingDb = {
      prepare: vi.fn(() => ({ get: vi.fn(() => undefined) })),
      transaction: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
    } as unknown as Database.Database;
    vi.clearAllMocks();
    registerWorldTransferHandlers(missingDb, {
      userDataPath: 'C:\\mock-user-data',
      appVersion: '1.0.0',
    });
    const missingHandlers = getHandlers();

    await expect(missingHandlers[IPC.WORLDS_EXPORT]({}, 5)).rejects.toThrowError(
      'World 5 not found',
    );
  });

  it('imports a world after open dialog confirmation', async () => {
    showOpenDialogMock.mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Imports\\alpha.zip'],
    });
    readFileMock.mockResolvedValue(Buffer.from([9, 8, 7]));

    const result = await handlers[IPC.WORLDS_IMPORT]({});

    expect(readFileMock).toHaveBeenCalledWith('C:\\Imports\\alpha.zip');
    expect(createFsWorldMediaWriterMock).toHaveBeenCalledWith('C:\\mock-user-data');
    expect(importWorldMock).toHaveBeenCalledWith(
      dbMock,
      Buffer.from([9, 8, 7]),
      expect.any(Object),
      expect.any(Function),
    );
    expect(result).toEqual({
      canceled: false,
      worldId: 9,
      worldName: 'Alpha (imported)',
    });
  });

  it('rejects oversized bundles before reading them into memory', async () => {
    showOpenDialogMock.mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Imports\\huge.zip'],
    });
    statMock.mockResolvedValue({ size: 300 * 1024 * 1024 });

    await expect(handlers[IPC.WORLDS_IMPORT]({})).rejects.toThrowError(
      /too large to import/,
    );
    expect(readFileMock).not.toHaveBeenCalled();
    expect(importWorldMock).not.toHaveBeenCalled();
  });

  it('returns canceled import when dialog is dismissed', async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });

    await expect(handlers[IPC.WORLDS_IMPORT]({})).resolves.toEqual({ canceled: true });
    expect(readFileMock).not.toHaveBeenCalled();
    expect(importWorldMock).not.toHaveBeenCalled();
  });
});
