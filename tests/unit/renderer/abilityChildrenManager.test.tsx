import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AbilityChildrenManager from '../../../src/renderer/components/abilities/AbilityChildrenManager';

const abilitiesGetChildrenMock = vi.fn();
const abilitiesAddChildMock = vi.fn();
const abilitiesRemoveChildMock = vi.fn();

function buildAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 1,
    world_id: 1,
    name: 'Anchor',
    description: null,
    type: 'passive',
    passive_subtype: 'linchpin',
    level_id: null,
    effects: '[]',
    conditions: '[]',
    cast_cost: '{}',
    trigger: null,
    pick_count: null,
    pick_timing: null,
    pick_is_permanent: 0,
    range_cells: null,
    aoe_shape: null,
    aoe_size_cells: null,
    target_type: null,
    created_at: '2026-02-27 00:00:00',
    updated_at: '2026-02-27 00:00:00',
    ...overrides,
  };
}

describe('AbilityChildrenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.db = {
      verses: {
        getAll: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      worlds: {
        getAll: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        markViewed: vi.fn(),
      },
      levels: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      abilities: {
        getAllByWorld: vi.fn(),
        getById: vi.fn(),
        add: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addChild: abilitiesAddChildMock,
        removeChild: abilitiesRemoveChildMock,
        getChildren: abilitiesGetChildrenMock,
      },
    } as unknown as DbApi;
  });

  it('renders nothing when parent ability does not support child management', async () => {
    const unsupportedParent = buildAbility({
      id: 10,
      name: 'Dash',
      type: 'active',
      passive_subtype: null,
    });

    abilitiesGetChildrenMock.mockResolvedValue([]);

    const { container } = render(
      <AbilityChildrenManager
        parentAbility={unsupportedParent}
        abilities={[unsupportedParent]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => {
      expect(abilitiesGetChildrenMock).toHaveBeenCalledWith(10);
    });
  });

  it('loads children and supports add/remove child actions', async () => {
    const user = userEvent.setup();
    const parent = buildAbility({ id: 1, name: 'Anchor' });
    const childOne = buildAbility({
      id: 2,
      name: 'Spark',
      type: 'active',
      passive_subtype: null,
    });
    const childTwo = buildAbility({
      id: 3,
      name: 'Shield Pulse',
      type: 'passive',
      passive_subtype: 'keystone',
    });

    abilitiesGetChildrenMock
      .mockResolvedValueOnce([childOne])
      .mockResolvedValueOnce([childOne, childTwo]);
    abilitiesAddChildMock.mockResolvedValue({
      parent_id: parent.id,
      child_id: childTwo.id,
    });
    abilitiesRemoveChildMock.mockResolvedValue({
      parent_id: parent.id,
      child_id: childTwo.id,
    });

    render(
      <AbilityChildrenManager
        parentAbility={parent}
        abilities={[parent, childOne, childTwo]}
      />,
    );

    expect(await screen.findByText('Spark')).toBeInTheDocument();
    expect(await screen.findByText('Shield Pulse')).toBeInTheDocument();

    const availableSection = screen
      .getByRole('heading', { name: 'Available abilities' })
      .closest('section');
    expect(availableSection).not.toBeNull();
    const childTwoCandidate = within(availableSection as HTMLElement)
      .getByText('Shield Pulse')
      .closest('li');
    expect(childTwoCandidate).not.toBeNull();
    await user.click(
      within(childTwoCandidate as HTMLElement).getByRole('button', {
        name: 'Add',
      }),
    );

    await waitFor(() => {
      expect(abilitiesAddChildMock).toHaveBeenCalledWith({
        parent_id: 1,
        child_id: 3,
      });
    });
    await waitFor(() => {
      expect(abilitiesGetChildrenMock).toHaveBeenCalledTimes(2);
    });

    const linkedSection = screen
      .getByRole('heading', { name: 'Linked children' })
      .closest('section');
    expect(linkedSection).not.toBeNull();
    const linkedChildTwo = within(linkedSection as HTMLElement)
      .getByText('Shield Pulse')
      .closest('li');
    expect(linkedChildTwo).not.toBeNull();
    await user.click(
      within(linkedChildTwo as HTMLElement).getByRole('button', {
        name: 'Remove',
      }),
    );

    await waitFor(() => {
      expect(abilitiesRemoveChildMock).toHaveBeenCalledWith({
        parent_id: 1,
        child_id: 3,
      });
    });
    await waitFor(() => {
      expect(
        within(linkedSection as HTMLElement).queryByText('Shield Pulse'),
      ).not.toBeInTheDocument();
    });
  });

  it('maps duplicate-link backend error to friendly UI text', async () => {
    const user = userEvent.setup();
    const parent = buildAbility({ id: 1, name: 'Anchor' });
    const child = buildAbility({
      id: 2,
      name: 'Spark',
      type: 'active',
      passive_subtype: null,
    });

    abilitiesGetChildrenMock.mockResolvedValue([]);
    abilitiesAddChildMock.mockRejectedValue(
      new Error('Child ability link already exists'),
    );

    render(
      <AbilityChildrenManager
        parentAbility={parent}
        abilities={[parent, child]}
      />,
    );

    const availableSection = await screen.findByRole('heading', {
      name: 'Available abilities',
    });
    await user.click(
      await within(availableSection.closest('section') as HTMLElement).findByRole(
        'button',
        { name: 'Add' },
      ),
    );

    expect(
      await screen.findByText('That ability is already linked as a child.'),
    ).toBeInTheDocument();
  });

  it('shows loading error when children cannot be loaded', async () => {
    const parent = buildAbility({ id: 30, name: 'Anchor' });
    const candidate = buildAbility({
      id: 31,
      name: 'Spark',
      type: 'active',
      passive_subtype: null,
    });

    abilitiesGetChildrenMock.mockRejectedValue(new Error('failed'));

    render(
      <AbilityChildrenManager
        parentAbility={parent}
        abilities={[parent, candidate]}
      />,
    );

    expect(
      await screen.findByText('Unable to load child abilities right now.'),
    ).toBeInTheDocument();
  });

  it('filters with search and shows fallback remove error for non-Error failures', async () => {
    const user = userEvent.setup();
    const parent = buildAbility({ id: 40, name: 'Anchor' });
    const child = buildAbility({
      id: 41,
      name: 'Linked Child',
      type: 'active',
      passive_subtype: null,
    });
    const candidate = buildAbility({
      id: 42,
      name: 'Available Child',
      type: 'passive',
      passive_subtype: 'keystone',
    });

    abilitiesGetChildrenMock.mockResolvedValue([child]);
    abilitiesRemoveChildMock.mockRejectedValue('network');

    render(
      <AbilityChildrenManager
        parentAbility={parent}
        abilities={[parent, child, candidate]}
      />,
    );

    expect(await screen.findByText('Linked Child')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search'), 'zzzz');

    expect(
      await screen.findByText('No linked children match your search.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No candidates match your search.'),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search'));
    const linkedSection = screen
      .getByRole('heading', { name: 'Linked children' })
      .closest('section');
    await user.click(
      within(linkedSection as HTMLElement).getByRole('button', {
        name: 'Remove',
      }),
    );

    expect(
      await screen.findByText('Failed to remove child ability.'),
    ).toBeInTheDocument();
  });
});
