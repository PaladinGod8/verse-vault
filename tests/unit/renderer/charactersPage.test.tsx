import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CharactersPage from '../../../src/renderer/pages/CharactersPage';
import { buildCharacter, buildWorld, resetFactoryIds } from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

function renderPage(worldId = 1) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/characters`]}>
      <Routes>
        <Route path='/world/:id/characters' element={<CharactersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CharactersPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('loads the world and lists its characters as cards', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    const character = buildCharacter({
      id: 5,
      world_id: 1,
      name: 'Ledros Igni',
      wiki_summary: JSON.stringify({
        biographic: { mainEpithet: 'The Brandslayer' },
      }),
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([character]);

    renderPage(1);

    expect(await screen.findByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.getByText('The Brandslayer')).toBeInTheDocument();
  });

  it('shows an empty state when the world has no characters', async () => {
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(buildWorld({ id: 1 }));
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage(1);

    expect(await screen.findByText('No characters yet.')).toBeInTheDocument();
  });

  it('filters the character list by search query across any field, including faction', async () => {
    const world = buildWorld({ id: 1 });
    const ledros = buildCharacter({
      id: 1,
      world_id: 1,
      name: 'Ledros Igni',
      wiki_summary: JSON.stringify({
        personalDescription: { weight: '90kg' },
        statusDemographics: { primaryFaction: 'Constellation Company' },
      }),
    });
    const other = buildCharacter({
      id: 2,
      world_id: 1,
      name: 'Someone Else',
      wiki_summary: JSON.stringify({
        personalDescription: { weight: '60kg' },
        statusDemographics: { primaryFaction: 'Lone Wolves' },
      }),
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      ledros,
      other,
    ]);

    const user = userEvent.setup();
    renderPage(1);

    await screen.findByText('Ledros Igni');
    await user.type(screen.getByPlaceholderText(/search characters/i), '90kg');

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search characters/i));
    await user.type(screen.getByPlaceholderText(/search characters/i), 'Constellation Company');

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();
  });

  it('creates a character through the New Character form', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildCharacter({ id: 9, world_id: 1, name: 'New Hero' })]);
    (mockDb.characters.add as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCharacter({ id: 9, world_id: 1, name: 'New Hero' }),
    );

    renderPage(1);
    await screen.findByText('No characters yet.');

    await user.click(screen.getByRole('button', { name: 'New Character' }));
    await user.type(screen.getByLabelText('Name *'), 'New Hero');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.characters.add).toHaveBeenCalledWith(
        expect.objectContaining({ world_id: 1, name: 'New Hero' }),
      );
    });
    expect(await screen.findByText('New Hero')).toBeInTheDocument();
  });

  it('keeps the existing image when saving an edited character without touching the image', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const character = buildCharacter({
      id: 7,
      world_id: 1,
      name: 'Ledros Igni',
      image_src: 'vv-media://character-images/existing.png',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([character]);
    (mockDb.characters.update as ReturnType<typeof vi.fn>).mockResolvedValue(character);

    renderPage(1);
    await screen.findByText('Ledros Igni');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByText('Edit Character');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockDb.characters.update).toHaveBeenCalled();
    });
    const updatePayload = (mockDb.characters.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('image_src');
  });

  it('deletes a character after confirming', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const character = buildCharacter({ id: 3, world_id: 1, name: 'Doomed One' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      character,
    ]).mockResolvedValueOnce([]);

    renderPage(1);
    await screen.findByText('Doomed One');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Delete "Doomed One"?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockDb.characters.delete).toHaveBeenCalledWith(3);
    });
  });
});
