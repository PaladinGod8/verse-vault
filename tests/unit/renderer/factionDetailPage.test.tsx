import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsProvider } from '../../../src/renderer/hooks/useAppSettings';
import FactionDetailPage from '../../../src/renderer/pages/FactionDetailPage';
import { buildFaction, resetFactoryIds } from '../../helpers/factories';
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

function renderPage(worldId = 1, factionId = 5) {
  return render(
    <MemoryRouter initialEntries={[`/world/${worldId}/factions/${factionId}`]}>
      <AppSettingsProvider>
        <Routes>
          <Route path='/world/:id/factions/:factionId' element={<FactionDetailPage />} />
          <Route
            path='/world/:id/characters/:characterId'
            element={<div>Character Detail Stub</div>}
          />
        </Routes>
      </AppSettingsProvider>
    </MemoryRouter>,
  );
}

describe('FactionDetailPage', () => {
  let mockDb: DbApi;

  beforeEach(() => {
    resetFactoryIds();
    mockDb = setupWindowDb();
    resetWindowDb();
  });

  it('renders the faction profile, sections, and wiki summary', async () => {
    const faction = buildFaction({
      id: 5,
      world_id: 1,
      name: 'Cult of Contagion',
      profile: 'A biohazard cult.',
      sections: JSON.stringify({ history: 'Founded in Fort Fabalta.' }),
      wiki_summary: JSON.stringify({ headquarters: 'Fort Fabalta, Occult' }),
    });
    (mockDb.factions.getById as ReturnType<typeof vi.fn>).mockResolvedValue(faction);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);
    (mockDb.factionMembers.getAllByFaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cult of Contagion' })).toBeInTheDocument();
    expect(screen.getByText('A biohazard cult.')).toBeInTheDocument();
    expect(screen.getByText('Founded in Fort Fabalta.')).toBeInTheDocument();
    expect(screen.getByText('Fort Fabalta, Occult')).toBeInTheDocument();
  });

  it('renders parent organization and children as clickable links', async () => {
    const parent = buildFaction({
      id: 1,
      world_id: 1,
      name: 'Parent Org',
      parent_faction_id: null,
    });
    const faction = buildFaction({
      id: 5,
      world_id: 1,
      name: 'Cult of Contagion',
      parent_faction_id: 1,
    });
    const child = buildFaction({ id: 9, world_id: 1, name: 'Inner Cell', parent_faction_id: 5 });
    (mockDb.factions.getById as ReturnType<typeof vi.fn>).mockResolvedValue(faction);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([
      parent,
      faction,
      child,
    ]);
    (mockDb.factionMembers.getAllByFaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    const parentLink = await screen.findByRole('link', { name: 'Parent Org' });
    expect(parentLink).toHaveAttribute('href', '/world/1/factions/1');

    const childLink = screen.getByRole('link', { name: 'Inner Cell' });
    expect(childLink).toHaveAttribute('href', '/world/1/factions/9');
  });

  it('groups members into Founders, Leadership, and Members with character links', async () => {
    const faction = buildFaction({ id: 5, world_id: 1, name: 'Cult of Contagion' });
    (mockDb.factions.getById as ReturnType<typeof vi.fn>).mockResolvedValue(faction);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);
    (mockDb.factionMembers.getAllByFaction as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        faction_id: 5,
        character_id: 1,
        role: 'founder',
        is_primary: 0,
        character_name: 'Malstrictus',
        created_at: '',
      },
      {
        id: 2,
        faction_id: 5,
        character_id: 2,
        role: 'President',
        is_primary: 0,
        character_name: 'Vex',
        created_at: '',
      },
      {
        id: 3,
        faction_id: 5,
        character_id: 3,
        role: 'member',
        is_primary: 0,
        character_name: 'Grunt One',
        created_at: '',
      },
    ]);

    renderPage();

    await screen.findByRole('heading', { name: 'Cult of Contagion' });
    expect(screen.getByText('Founders')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();

    const malstrictusLink = screen.getByRole('link', { name: 'Malstrictus' });
    expect(malstrictusLink).toHaveAttribute('href', '/world/1/characters/1');
  });

  it('opens the edit form pre-filled and saves via window.db.factions.update', async () => {
    const faction = buildFaction({ id: 5, world_id: 1, name: 'Cult of Contagion' });
    (mockDb.factions.getById as ReturnType<typeof vi.fn>).mockResolvedValue(faction);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);
    (mockDb.factionMembers.getAllByFaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.factionTypes.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.characters.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockDb.factions.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildFaction({ id: 5, world_id: 1, name: 'Updated Faction' }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Cult of Contagion' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const nameInput = screen.getByLabelText('Name *');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Faction');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockDb.factions.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ name: 'Updated Faction' }),
    );
  });

  it('applies stored faction detail image dimensions from app settings', async () => {
    const faction = buildFaction({
      id: 5,
      world_id: 1,
      name: 'Cult of Contagion',
      image_src: 'vv-media://faction-images/cult.png',
    });
    (mockDb.settings.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      config: JSON.stringify({
        cardDisplays: {
          factionDetail: {
            width: 180,
            height: 140,
            lockAspectRatio: false,
          },
        },
      }),
      created_at: '',
      updated_at: '',
    });
    (mockDb.factions.getById as ReturnType<typeof vi.fn>).mockResolvedValue(faction);
    (mockDb.factions.getAllByWorld as ReturnType<typeof vi.fn>).mockResolvedValue([faction]);
    (mockDb.factionMembers.getAllByFaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('img', { name: 'Cult of Contagion' })).toHaveStyle({
      width: '180px',
      height: '140px',
    });
  });
});
