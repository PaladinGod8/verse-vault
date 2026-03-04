import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RuntimeGridControls from '../../../src/renderer/components/runtime/RuntimeGridControls';

function buildGridConfig(
  overrides: Partial<BattleMapRuntimeGridConfig> = {},
): BattleMapRuntimeGridConfig {
  return {
    mode: 'square',
    cellSize: 50,
    originX: 0,
    originY: 0,
    ...overrides,
  };
}

describe('RuntimeGridControls', () => {
  it('renders save statuses', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RuntimeGridControls
        gridConfig={buildGridConfig()}
        isSaving={false}
        saveError={null}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();

    rerender(
      <RuntimeGridControls
        gridConfig={buildGridConfig()}
        isSaving={true}
        saveError={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    rerender(
      <RuntimeGridControls
        gridConfig={buildGridConfig()}
        isSaving={false}
        saveError="Boom"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('updates mode and ignores unsupported mode values', () => {
    const onChange = vi.fn();
    render(
      <RuntimeGridControls
        gridConfig={buildGridConfig()}
        isSaving={false}
        saveError={null}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('Square'), {
      target: { value: 'hex' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'hex' }),
    );

    onChange.mockClear();
    fireEvent.change(screen.getByDisplayValue('Square'), {
      target: { value: 'triangle' },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps cell size from range and number inputs', () => {
    const onChange = vi.fn();
    render(
      <RuntimeGridControls
        gridConfig={buildGridConfig({ cellSize: 50 })}
        isSaving={false}
        saveError={null}
        onChange={onChange}
      />,
    );

    const [range] = screen.getAllByDisplayValue('50');
    fireEvent.change(range, { target: { value: '9999' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cellSize: 240 }),
    );

    const [, numberInput] = screen.getAllByDisplayValue('50');
    fireEvent.change(numberInput, { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cellSize: 12 }),
    );

    fireEvent.change(numberInput, { target: { value: 'not-a-number' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cellSize: 50 }),
    );
  });

  it('parses origin inputs and falls back for invalid input', () => {
    const onChange = vi.fn();
    render(
      <RuntimeGridControls
        gridConfig={buildGridConfig({ originX: 8, originY: -4 })}
        isSaving={false}
        saveError={null}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Origin X'), {
      target: { value: '123.5' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originX: 123.5 }),
    );

    fireEvent.change(screen.getByLabelText('Origin X'), {
      target: { value: 'oops' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originX: 0 }),
    );

    fireEvent.change(screen.getByLabelText('Origin Y'), {
      target: { value: 'bad' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originY: 0 }),
    );
  });

  it('toggles half-cell origins and resets origin', () => {
    const onChange = vi.fn();
    render(
      <RuntimeGridControls
        gridConfig={buildGridConfig({ cellSize: 40, originX: 0, originY: 20 })}
        isSaving={false}
        saveError={null}
        onChange={onChange}
      />,
    );

    const toggleButtons = screen.getAllByRole('button', {
      name: 'Toggle Half Cell',
    });
    fireEvent.click(toggleButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originX: 20 }),
    );

    fireEvent.click(toggleButtons[1]);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originY: 0 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Origin' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ originX: 0, originY: 0 }),
    );
  });
});
