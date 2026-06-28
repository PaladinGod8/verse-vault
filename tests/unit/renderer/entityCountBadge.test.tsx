import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntityCountBadge from '../../../src/renderer/components/ui/EntityCountBadge';

describe('EntityCountBadge', () => {
  it('renders the singular label when count is 1', () => {
    render(<EntityCountBadge count={1} singularLabel='character' />);

    expect(screen.getByRole('status', { name: 'Total character' })).toHaveTextContent(
      '1 character',
    );
  });

  it('renders the pluralized label when count is not 1', () => {
    render(<EntityCountBadge count={42} singularLabel='character' />);

    expect(screen.getByRole('status', { name: 'Total characters' })).toHaveTextContent(
      '42 characters',
    );
  });

  it('uses an explicit plural label override when provided', () => {
    render(<EntityCountBadge count={3} singularLabel='faction' pluralLabel='factions' />);

    expect(screen.getByRole('status', { name: 'Total factions' })).toHaveTextContent(
      '3 factions',
    );
  });

  it('renders zero as plural', () => {
    render(<EntityCountBadge count={0} singularLabel='character' />);

    expect(screen.getByRole('status', { name: 'Total characters' })).toHaveTextContent(
      '0 characters',
    );
  });
});
