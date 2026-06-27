import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardDisplaySizeControl from '../../../src/renderer/components/settings/CardDisplaySizeControl';

describe('CardDisplaySizeControl', () => {
  it('commits resized dimensions from drag handle', () => {
    const onCommit = vi.fn();

    render(
      <CardDisplaySizeControl
        surface='characterCard'
        title='Character cards'
        description='Standard list-card footprint for character galleries.'
        width={320}
        height={160}
        lockAspectRatio
        onCommit={onCommit}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize Character cards' }), {
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { clientX: 180, clientY: 100 });
    fireEvent.pointerUp(window);

    expect(onCommit).toHaveBeenCalledWith({
      width: 400,
      height: 200,
      lockAspectRatio: true,
    });
  });
});
