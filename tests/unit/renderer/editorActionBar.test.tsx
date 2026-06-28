import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditorActionBar from '../../../src/renderer/components/ui/EditorActionBar';

describe('EditorActionBar', () => {
  it('renders sticky top-right action container for editor buttons', () => {
    render(
      <EditorActionBar>
        <button type='button'>Cancel</button>
        <button type='submit'>Create</button>
      </EditorActionBar>,
    );

    const actionBar = screen.getByTestId('editor-action-bar');
    expect(actionBar).toHaveClass('sticky');
    expect(actionBar).toHaveClass('top-0');
    expect(actionBar).toHaveClass('justify-end');
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
