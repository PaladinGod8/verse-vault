import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../../../src/renderer/components/ui/ToastProvider';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
} from '../../../../src/shared/statisticsTypes';

const mockWorlds = {
  getById: vi.fn(),
  update: vi.fn(),
};

Object.defineProperty(window, 'db', {
  value: { worlds: mockWorlds },
  configurable: true,
});

vi.mock('../../../../src/renderer/components/worlds/WorldSidebar', () => ({
  default: ({ worldId }: { worldId: number | null }) => (
    <div data-testid="world-sidebar">world-{String(worldId)}</div>
  ),
}));

vi.mock('../../../../src/renderer/components/ui/ModalShell', () => ({
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

vi.mock('../../../../src/renderer/components/ui/ConfirmDialog', () => ({
  default: ({
    isOpen,
    title,
    onConfirm,
    onCancel,
    isConfirming,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    isConfirming?: boolean;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{title}</p>
        <button disabled={isConfirming} onClick={onConfirm}>
          Confirm
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock(
  '../../../../src/renderer/components/statistics/ResourceDefinitionForm',
  () => ({
    default: ({
      mode,
      onSubmit,
      onCancel,
      initialValues,
    }: {
      mode: 'create' | 'edit';
      onSubmit: (data: ResourceStatisticDefinition) => Promise<void>;
      onCancel: () => void;
      initialValues?: ResourceStatisticDefinition;
    }) => {
      const payload: ResourceStatisticDefinition =
        mode === 'edit' && initialValues
          ? {
              ...initialValues,
              name: `${initialValues.name} Updated`,
            }
          : {
              id: 'energy',
              name: 'Energy',
              abbreviation: 'EN',
              isDefault: false,
            };

      return (
        <div data-testid={`resource-form-${mode}`}>
          <button
            onClick={() =>
              void onSubmit(payload).catch(() => {
                /* intentionally empty */
              })
            }
          >
            Submit resource {mode}
          </button>
          <button onClick={onCancel}>Cancel resource {mode}</button>
        </div>
      );
    },
  }),
);

vi.mock(
  '../../../../src/renderer/components/statistics/PassiveScoreDefinitionForm',
  () => ({
    default: ({
      mode,
      onSubmit,
      onCancel,
      initialValues,
    }: {
      mode: 'create' | 'edit';
      onSubmit: (data: PassiveScoreDefinition) => Promise<void>;
      onCancel: () => void;
      initialValues?: PassiveScoreDefinition;
    }) => {
      const payload: PassiveScoreDefinition =
        mode === 'edit' && initialValues
          ? {
              ...initialValues,
              name: `${initialValues.name} Updated`,
            }
          : {
              id: 'insight',
              name: 'Insight',
              abbreviation: 'INS',
              type: 'custom',
              isDefault: false,
            };

      return (
        <div data-testid={`passive-form-${mode}`}>
          <button
            onClick={() =>
              void onSubmit(payload).catch(() => {
                /* intentionally empty */
              })
            }
          >
            Submit passive {mode}
          </button>
          <button onClick={onCancel}>Cancel passive {mode}</button>
        </div>
      );
    },
  }),
);

import WorldStatisticsConfigPage from '../../../../src/renderer/pages/WorldStatisticsConfigPage';

function renderPage(route = '/world/1/statistics') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <Routes>
          <Route
            path="/world/:id/statistics"
            element={<WorldStatisticsConfigPage />}
          />
          <Route path="*" element={<WorldStatisticsConfigPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

function buildWorld(config: unknown = {}) {
  return {
    id: 1,
    name: 'Aeloria',
    config: JSON.stringify(config),
  };
}

describe('WorldStatisticsConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows invalid world id error for non-numeric route ids', async () => {
    renderPage('/world/not-a-number/statistics');

    expect(await screen.findByText('Invalid world id.')).toBeInTheDocument();
    expect(mockWorlds.getById).not.toHaveBeenCalled();
  });

  it('shows world not found when getById returns null', async () => {
    mockWorlds.getById.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('World not found.')).toBeInTheDocument();
  });

  it('creates a resource even when config JSON is invalid by using safe defaults', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue({
      id: 1,
      name: 'Aeloria',
      config: '{broken',
    });

    mockWorlds.update.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [
            {
              id: 'energy',
              name: 'Energy',
              abbreviation: 'EN',
              isDefault: false,
            },
          ],
          passiveScores: [],
        },
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Add Resource' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Submit resource create' }),
    );

    await waitFor(() => {
      expect(mockWorlds.update).toHaveBeenCalledTimes(1);
    });

    const [, updatePatch] = mockWorlds.update.mock.calls[0];
    expect(updatePatch.config).toContain('"energy"');
    expect(updatePatch.config).toContain('"passiveScores":[]');
    expect(await screen.findByText('Resource created.')).toBeInTheDocument();
  });

  it('updates a resource from the edit form', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [
            {
              id: 'hp',
              name: 'Hit Points',
              abbreviation: 'HP',
              isDefault: true,
            },
          ],
          passiveScores: [],
        },
      }),
    );

    mockWorlds.update.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [
            {
              id: 'hp',
              name: 'Hit Points Updated',
              abbreviation: 'HP',
              isDefault: true,
            },
          ],
          passiveScores: [],
        },
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(
      screen.getByRole('button', { name: 'Submit resource edit' }),
    );

    await waitFor(() => expect(mockWorlds.update).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Resource updated.')).toBeInTheDocument();
  });

  it('shows delete error fallback and closes resource confirm when deletion rejects with non-Error', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [
            {
              id: 'hp',
              name: 'Hit Points',
              abbreviation: 'HP',
              isDefault: true,
            },
          ],
          passiveScores: [],
        },
      }),
    );

    mockWorlds.update.mockRejectedValue('nope');

    renderPage();

    const deleteButtons = await screen.findAllByRole('button', {
      name: 'Delete',
    });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByText('Failed to delete resource.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Please try again.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  it('renders passive score type labels for ability, PB, and custom', async () => {
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'str',
              name: 'Strength',
              abbreviation: 'STR',
              type: 'ability_score',
              isDefault: true,
            },
            {
              id: 'pb',
              name: 'Proficiency Bonus',
              abbreviation: 'PB',
              type: 'proficiency_bonus',
              isDefault: true,
            },
            {
              id: 'insight',
              name: 'Insight',
              abbreviation: 'INS',
              type: 'custom',
              isDefault: false,
            },
          ],
        },
      }),
    );

    renderPage();

    expect(await screen.findByText('Ability')).toBeInTheDocument();
    expect(screen.getAllByText('PB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('creates a passive score and shows success toast', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [],
        },
      }),
    );

    mockWorlds.update.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'insight',
              name: 'Insight',
              abbreviation: 'INS',
              type: 'custom',
              isDefault: false,
            },
          ],
        },
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Add Passive Score' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Submit passive create' }),
    );

    await waitFor(() => expect(mockWorlds.update).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('Passive score created.'),
    ).toBeInTheDocument();
  });

  it('shows specific error toast when updating a passive score fails with Error', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'pb',
              name: 'Proficiency Bonus',
              abbreviation: 'PB',
              type: 'proficiency_bonus',
              isDefault: true,
            },
          ],
        },
      }),
    );

    mockWorlds.update.mockRejectedValue(new Error('update exploded'));

    renderPage();

    const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);
    await user.click(
      screen.getByRole('button', { name: 'Submit passive edit' }),
    );

    expect(
      await screen.findByText('Failed to update passive score.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('update exploded')).toBeInTheDocument();
  });

  it('deletes a passive score successfully', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'pb',
              name: 'Proficiency Bonus',
              abbreviation: 'PB',
              type: 'proficiency_bonus',
              isDefault: true,
            },
          ],
        },
      }),
    );

    mockWorlds.update.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [],
        },
      }),
    );

    renderPage();

    const deleteButtons = await screen.findAllByRole('button', {
      name: 'Delete',
    });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockWorlds.update).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('Passive score deleted.'),
    ).toBeInTheDocument();
  });

  it('shows load error when fetching world fails', async () => {
    mockWorlds.getById.mockRejectedValue(new Error('db offline'));

    renderPage();

    expect(
      await screen.findByText('Unable to load this world right now.'),
    ).toBeInTheDocument();
  });

  it('closes create resource modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(buildWorld({ statistics: {} }));

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Add Resource' }),
    );
    expect(screen.getByTestId('resource-form-create')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Cancel resource create' }),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('resource-form-create'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows specific error message when creating resource fails with Error', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(buildWorld({ statistics: {} }));
    mockWorlds.update.mockRejectedValue(new Error('create blew up'));

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Add Resource' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Submit resource create' }),
    );

    expect(
      await screen.findByText('Failed to create resource.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('create blew up')).toBeInTheDocument();
  });

  it('cancels delete confirmation without calling update', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [
            {
              id: 'hp',
              name: 'Hit Points',
              abbreviation: 'HP',
              isDefault: true,
            },
          ],
          passiveScores: [],
        },
      }),
    );

    renderPage();

    const deleteButtons = await screen.findAllByRole('button', {
      name: 'Delete',
    });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockWorlds.update).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  it('updates passive score successfully from edit modal', async () => {
    const user = userEvent.setup();
    mockWorlds.getById.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'pb',
              name: 'Proficiency Bonus',
              abbreviation: 'PB',
              type: 'proficiency_bonus',
              isDefault: true,
            },
          ],
        },
      }),
    );

    mockWorlds.update.mockResolvedValue(
      buildWorld({
        statistics: {
          resources: [],
          passiveScores: [
            {
              id: 'pb',
              name: 'Proficiency Bonus Updated',
              abbreviation: 'PB',
              type: 'proficiency_bonus',
              isDefault: true,
            },
          ],
        },
      }),
    );

    renderPage();

    const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);
    await user.click(
      screen.getByRole('button', { name: 'Submit passive edit' }),
    );

    await waitFor(() => expect(mockWorlds.update).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('Passive score updated.'),
    ).toBeInTheDocument();
  });
});
