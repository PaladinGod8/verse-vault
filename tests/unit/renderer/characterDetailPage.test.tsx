import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import CharacterDetailPage from '../../../src/renderer/pages/CharacterDetailPage';
import { buildCharacter, resetFactoryIds } from '../../helpers/factories';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

vi.mock('../../../src/renderer/components/ui/ToastProvider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    clearToasts: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

function renderPage(worldId = 1, characterId = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/characters/${characterId}`]}>
      <AppSettingsProvider>
        <Routes>
          <Route
            path='/world/:id/characters/:characterId'
            element={<CharacterDetailPage />}
          />
          <Route path='/world/:id/factions/:factionId' element={<div>Faction Detail Stub</div>} />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('CharacterDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders the character profile, sections, and wiki summary', async () => {
    const character = buildCharacter({
      id: 5,
      world_id: 1,
      name: 'Ledros Igni',
      profile: 'A bitter dragonborn.',
      author: 'GamingGator',
      sections: JSON.stringify({ background: 'Outcasted from the Igni tribe.' }),
    });
    (mockDb.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(character);
    (mockDb.factionMembers.getAllByCharacter as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ledros Igni' })).toBeInTheDocument();
    expect(screen.getByText('A bitter dragonborn.')).toBeInTheDocument();
    expect(screen.getByText('Author: GamingGator')).toBeInTheDocument();
    expect(screen.getByText('Outcasted from the Igni tribe.')).toBeInTheDocument();
  });

  it('keeps all wiki summary groups and field labels visible even when values are empty', async () => {
    const character = buildCharacter({
      id: 5,
      world_id: 1,
      name: 'Ledros Igni',
      wiki_summary: JSON.stringify({}),
    });
    (mockDb.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(character);
    (mockDb.factionMembers.getAllByCharacter as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ledros Igni' })).toBeInTheDocument();
    expect(screen.getByText('Biographic Information')).toBeInTheDocument();
    expect(screen.getByText('Birth Name')).toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Information')).not.toBeInTheDocument();
    expect(screen.getByText('Aliases')).toBeInTheDocument();
    expect(screen.getByText('Titles')).toBeInTheDocument();
    expect(screen.getByText('Personal Description')).toBeInTheDocument();
    expect(screen.getByText('Birth Date')).toBeInTheDocument();
    expect(screen.getByText('Ages & Timeline')).toBeInTheDocument();
    expect(screen.getByText('Conditions')).toBeInTheDocument();
    expect(screen.getByText('Status & Demographics')).toBeInTheDocument();
    expect(screen.getByText('Current Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Educational History')).toBeInTheDocument();
    expect(screen.getByText('Occupational History')).toBeInTheDocument();
    expect(screen.getByText('Trivia')).toBeInTheDocument();
    expect(screen.getByText('Apparel & Accessories')).toBeInTheDocument();
  });

  it('shows faction memberships with a link to each faction, and lets you set the primary one', async () => {
    const character = buildCharacter({ id: 5, world_id: 1, name: 'Ledros Igni' });
    (mockDb.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(character);
    (mockDb.factionMembers.getAllByCharacter as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        faction_id: 10,
        character_id: 5,
        role: 'founder',
        is_primary: 0,
        faction_name: 'Cult of Contagion',
        created_at: '',
      },
      {
        id: 2,
        faction_id: 11,
        character_id: 5,
        role: 'member',
        is_primary: 1,
        faction_name: 'Lone Wolves',
        faction_name_2: undefined,
        created_at: '',
      },
    ]);

    const user = userEvent.setup();
    renderPage();

    const factionLink = await screen.findByRole('link', { name: 'Cult of Contagion' });
    expect(factionLink).toHaveAttribute('href', '/world/1/factions/10');

    await user.click(screen.getByRole('button', { name: 'Make primary (Cult of Contagion)' }));
    expect(mockDb.factionMembers.setPrimary).toHaveBeenCalledWith(5, 10);
  });

  it('opens the edit form pre-filled and saves via window.db.characters.update', async () => {
    const character = buildCharacter({
      id: 5,
      world_id: 1,
      name: 'Ledros Igni',
      author: 'GamingGator',
    });
    (mockDb.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(character);
    (mockDb.factionMembers.getAllByCharacter as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.characters.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildCharacter({ id: 5, world_id: 1, name: 'Updated Name', author: 'AnotherWriter' }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Ledros Igni' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const nameInput = screen.getByLabelText('Name *');
    expect(screen.getByLabelText('Author')).toHaveValue('GamingGator');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    await user.clear(screen.getByLabelText('Author'));
    await user.type(screen.getByLabelText('Author'), 'AnotherWriter');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.characters.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ name: 'Updated Name', author: 'AnotherWriter' }),
    );
  });

  it('applies stored character detail image dimensions from app settings', async () => {
    const character = buildCharacter({
      id: 5,
      world_id: 1,
      name: 'Ledros Igni',
      image_src: 'vv-media://character-images/ledros.png',
    });
    (mockDb.settings.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      config: JSON.stringify({
        cardDisplays: {
          characterDetail: {
            width: 144,
            height: 192,
            lockAspectRatio: false,
          },
        },
      }),
      created_at: '',
      updated_at: '',
    });
    (mockDb.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(character);
    (mockDb.factionMembers.getAllByCharacter as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('img', { name: 'Ledros Igni' })).toHaveStyle({
      width: '144px',
      height: '192px',
    });
  });
});
