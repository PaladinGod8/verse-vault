import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FactionRelationshipsPanel from '../../../src/renderer/components/factions/FactionRelationshipsPanel';
import type { FactionRelationshipView } from '../../../src/shared/contracts/dbApiPayloads';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

function buildFaction(overrides: Partial<Faction> = {}): Faction {
  return {
    id: 2,
    world_id: 1,
    name: 'The Ashen Concord',
    profile: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    type_id: null,
    parent_faction_id: null,
    last_viewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildRelationshipView(
  overrides?: Partial<FactionRelationshipView>,
): FactionRelationshipView {
  return {
    id: 1,
    faction_id: 1,
    related_faction_id: 2,
    faction_label: 'Rival',
    related_label: 'Rival',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    counterpart_id: 2,
    counterpart_name: 'The Ashen Concord',
    subject_label: 'Rival',
    counterpart_label: 'Rival',
    ...overrides,
  };
}

function renderPanel(allFactionsInWorld: Faction[] = [buildFaction()]) {
  return render(
    <MemoryRouter>
      <FactionRelationshipsPanel
        factionId={1}
        worldId={1}
        allFactionsInWorld={allFactionsInWorld}
      />
    </MemoryRouter>,
  );
}

describe('FactionRelationshipsPanel', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
  });

  it('shows the empty state when the faction has no tracked relationships', async () => {
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByText('No tracked relationships yet.')).toBeInTheDocument();
  });

  it("renders a relationship row with the counterpart name and this faction's label for them", async () => {
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([buildRelationshipView()]);

    renderPanel();

    expect(await screen.findByRole('link', { name: 'The Ashen Concord' })).toHaveAttribute(
      'href',
      '/world/1/factions/2',
    );
    expect(screen.getByText('(Rival)')).toBeInTheDocument();
  });

  it('adds a relationship by picking a counterpart from the plain select and filling in both labels', async () => {
    const user = userEvent.setup();
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([]);
    (window.db.factionRelationships.add as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    renderPanel([buildFaction()]);
    await screen.findByText('No tracked relationships yet.');

    await user.click(screen.getByRole('button', { name: 'Add Relationship' }));
    await user.selectOptions(screen.getByLabelText('Counterpart'), '2');
    await user.type(screen.getByLabelText('This faction calls them'), 'Rival');
    await user.type(screen.getByLabelText('They call this faction'), 'Rival');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(window.db.factionRelationships.add).toHaveBeenCalledWith({
      faction_id: 1,
      related_faction_id: 2,
      faction_label: 'Rival',
      related_label: 'Rival',
    });
  });

  it('removes a relationship after confirming', async () => {
    const user = userEvent.setup();
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([buildRelationshipView()]);
    (window.db.factionRelationships.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
    });

    renderPanel();
    await screen.findByRole('link', { name: 'The Ashen Concord' });

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(window.db.factionRelationships.delete).toHaveBeenCalledWith(1);
  });

  it('edits a relationship where the viewed faction is stored as related_faction_id, writing labels to the correct DB columns', async () => {
    const user = userEvent.setup();
    (window.db.factionRelationships.getAllByFaction as ReturnType<typeof vi.fn>)
      .mockResolvedValue([
        buildRelationshipView({
          id: 5,
          faction_id: 99,
          related_faction_id: 1,
          faction_label: 'Rival',
          related_label: 'Enemy',
          counterpart_id: 99,
          counterpart_name: 'The Silver Hand',
          subject_label: 'Enemy',
          counterpart_label: 'Rival',
        }),
      ]);
    (window.db.factionRelationships.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
    });

    renderPanel();
    await screen.findByRole('link', { name: 'The Silver Hand' });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const factionLabelInput = screen.getByLabelText('This faction calls them');
    const relatedLabelInput = screen.getByLabelText('They call this faction');
    expect(factionLabelInput).toHaveValue('Enemy');
    expect(relatedLabelInput).toHaveValue('Rival');
    await user.clear(factionLabelInput);
    await user.type(factionLabelInput, 'Bitter Foe');
    await user.clear(relatedLabelInput);
    await user.type(relatedLabelInput, 'Nuisance');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(window.db.factionRelationships.update).toHaveBeenCalledWith(5, {
      faction_label: 'Nuisance',
      related_label: 'Bitter Foe',
    });
  });
});
