import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ManageFactionTypesModal from '../../../src/renderer/components/factions/ManageFactionTypesModal';

function buildType(overrides: Partial<FactionType> = {}): FactionType {
  return { id: 1, world_id: 1, name: 'Company', created_at: '', ...overrides };
}

describe('ManageFactionTypesModal', () => {
  it('lists existing types and adds a new one', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ManageFactionTypesModal
        isOpen
        onClose={vi.fn()}
        factionTypes={[buildType()]}
        onAdd={onAdd}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Company')).toBeInTheDocument();

    await user.type(screen.getByLabelText('New type name'), 'Government');
    await user.click(screen.getByRole('button', { name: 'Add Type' }));

    expect(onAdd).toHaveBeenCalledWith('Government');
  });

  it('renames a type inline', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <ManageFactionTypesModal
        isOpen
        onClose={vi.fn()}
        factionTypes={[buildType()]}
        onAdd={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue('Company');
    const row = input.closest('li') as HTMLElement;
    await user.clear(input);
    await user.type(input, 'Corporation');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    expect(onRename).toHaveBeenCalledWith(1, 'Corporation');
  });

  it('deletes a type after confirmation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ManageFactionTypesModal
        isOpen
        onClose={vi.fn()}
        factionTypes={[buildType()]}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );

    const row = screen.getByDisplayValue('Company').closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Delete' }));

    const dialogs = screen.getAllByRole('dialog');
    const confirmDialog = dialogs[dialogs.length - 1];
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <ManageFactionTypesModal
        isOpen={false}
        onClose={vi.fn()}
        factionTypes={[buildType()]}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByDisplayValue('Company')).not.toBeInTheDocument();
  });
});
