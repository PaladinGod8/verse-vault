import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
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
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/characters' element={<CharactersPage />} />
        </Routes>
      </AppSettingsProvider>
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

  it('renders character cards in alphabetical order', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCharacter({ id: 3, world_id: 1, name: 'Zed' }),
      buildCharacter({ id: 1, world_id: 1, name: 'A-LIVE' }),
      buildCharacter({ id: 2, world_id: 1, name: 'Beta' }),
    ]);

    renderPage(1);

    await screen.findByText('A-LIVE');
    expect(screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel)).toEqual(
      [
        'Open A-LIVE',
        'Open Beta',
        'Open Zed',
      ],
    );
  });

  it('switches to recently-viewed order and persists the choice via app settings', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCharacter({
        id: 1,
        world_id: 1,
        name: 'Zed',
        last_viewed_at: '2026-02-01 00:00:00',
      }),
      buildCharacter({
        id: 2,
        world_id: 1,
        name: 'Beta',
        last_viewed_at: '2026-03-01 00:00:00',
      }),
    ]);

    renderPage(1);

    await screen.findByText('Zed');
    await user.click(screen.getByRole('button', { name: 'Recently Viewed' }));

    expect(
      screen.getAllByRole('button', { name: /^Open / }).map((card) => card.ariaLabel),
    ).toEqual(['Open Beta', 'Open Zed']);
    expect(mockDb.settings.update).toHaveBeenCalledWith(
      JSON.stringify({ cardSortPreferences: { characters: 'recentlyViewed' } }),
    );
  });

  it('shows the total character count and keeps it unchanged while filtering', async () => {
    const world = buildWorld({ id: 1, name: 'Aetheria' });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildCharacter({ id: 1, world_id: 1, name: 'Ledros Igni' }),
      buildCharacter({ id: 2, world_id: 1, name: 'Someone Else' }),
    ]);

    const user = userEvent.setup();
    renderPage(1);

    await screen.findByText('Ledros Igni');
    expect(screen.getByRole('status', { name: 'Total characters' })).toHaveTextContent(
      '2 characters',
    );

    await user.type(screen.getByPlaceholderText(/search characters/i), 'Ledros');
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Total characters' })).toHaveTextContent(
      '2 characters',
    );
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
      is_player_character: 1,
      owner: 'Gator',
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

    await user.clear(screen.getByPlaceholderText(/search characters/i));
    await user.type(screen.getByPlaceholderText(/search characters/i), 'player character');

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search characters/i));
    await user.type(screen.getByPlaceholderText(/search characters/i), 'Gator');

    expect(screen.getByText('Ledros Igni')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).not.toBeInTheDocument();
  });

  it('includes player character flag and owner in create payload', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const createdCharacter = buildCharacter({
      id: 9,
      world_id: 1,
      name: 'New Hero',
      is_player_character: 1,
      owner: 'Gator',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdCharacter]);
    (mockDb.characters.add as ReturnType<typeof vi.fn>).mockResolvedValue(createdCharacter);

    renderPage(1);
    await screen.findByText('No characters yet.');

    await user.click(screen.getByRole('button', { name: 'New Character' }));
    await user.type(screen.getByLabelText('Name *'), 'New Hero');
    await user.click(screen.getByLabelText('Player Character'));
    await user.type(screen.getByLabelText('Owner *'), 'Gator');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.characters.add).toHaveBeenCalledWith(
        expect.objectContaining({
          world_id: 1,
          name: 'New Hero',
          is_player_character: 1,
          owner: 'Gator',
        }),
      );
    });
  });

  it('includes author in create payload and search matches it', async () => {
    const user = userEvent.setup();
    const world = buildWorld({ id: 1 });
    const createdCharacter = buildCharacter({
      id: 9,
      world_id: 1,
      name: 'New Hero',
      author: 'GamingGator',
    });
    (mockDb.worlds.getById as ReturnType<typeof vi.fn>).mockResolvedValue(world);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdCharacter]);
    (mockDb.characters.add as ReturnType<typeof vi.fn>).mockResolvedValue(createdCharacter);

    renderPage(1);
    await screen.findByText('No characters yet.');

    await user.click(screen.getByRole('button', { name: 'New Character' }));
    await user.type(screen.getByLabelText('Name *'), 'New Hero');
    await user.type(screen.getByLabelText('Author'), 'GamingGator');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockDb.characters.add).toHaveBeenCalledWith(
        expect.objectContaining({ world_id: 1, name: 'New Hero', author: 'GamingGator' }),
      );
    });

    await user.type(screen.getByPlaceholderText(/search characters/i), 'GamingGator');
    expect(await screen.findByText('New Hero')).toBeInTheDocument();
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
