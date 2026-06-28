import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FactionMemberFormValue } from '../../../src/renderer/components/factions/FactionForm';
import FactionMembersEditor from '../../../src/renderer/components/factions/FactionMembersEditor';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

function buildMembers(count: number): FactionMemberFormValue[] {
  return Array.from({ length: count }, (_, i) => ({ character_id: i + 1, role: 'member' }));
}

describe('FactionMembersEditor', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      hasMore: false,
    });
    (window.db.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('paginates member rows instead of rendering all of them at once when there are many', async () => {
    const user = userEvent.setup();
    const members = buildMembers(12);

    render(
      <FactionMembersEditor members={members} worldId={1} onChange={vi.fn()} />,
    );

    expect(screen.getAllByRole('combobox', { name: 'Member character' })).toHaveLength(10);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getAllByRole('combobox', { name: 'Member character' })).toHaveLength(2);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('does not show pagination controls when members fit on one page', () => {
    const members = buildMembers(3);

    render(
      <FactionMembersEditor members={members} worldId={1} onChange={vi.fn()} />,
    );

    expect(screen.getAllByRole('combobox', { name: 'Member character' })).toHaveLength(3);
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });
});
