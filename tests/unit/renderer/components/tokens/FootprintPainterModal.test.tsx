import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FootprintPainterModal from '../../../../../src/renderer/components/tokens/FootprintPainterModal';

type MockCanvasContext = {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  fillRect: (...args: unknown[]) => void;
  drawImage: (...args: unknown[]) => void;
  save: () => void;
  restore: () => void;
  translate: (...args: unknown[]) => void;
  beginPath: () => void;
  moveTo: (...args: unknown[]) => void;
  lineTo: (...args: unknown[]) => void;
  closePath: () => void;
  fill: () => void;
  stroke: () => void;
};

let mockCanvasContext: MockCanvasContext;

beforeAll(() => {
  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    width = 100;
    height = 100;

    set src(value: string) {
      if (value.includes('error')) {
        this.onerror?.();
        return;
      }
      this.onload?.();
    }
  }

  vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => mockCanvasContext as unknown as CanvasRenderingContext2D,
  );
});

beforeEach(() => {
  mockCanvasContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  };
});

function setCanvasRects() {
  const canvases = Array.from(document.body.querySelectorAll('canvas'));
  for (const canvas of canvases) {
    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  }
  return canvases;
}

describe('FootprintPainterModal', () => {
  it('hydrates initial square footprint cells when provided', async () => {
    const onConfirm = vi.fn();
    render(
      <FootprintPainterModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        imageSrc="blob:ok"
        gridType="square"
        initialFootprint={{
          version: 1,
          grid_type: 'square',
          square_cells: [
            { col: 0, row: 0 },
            { col: 1, row: 0 },
          ],
          width_cells: 2,
          height_cells: 1,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Occupied: 2 cells')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks confirm until a cell is painted, then emits square footprint payload', async () => {
    const onConfirm = vi.fn();
    render(
      <FootprintPainterModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        imageSrc="blob:ok"
        gridType="square"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    const [mainCanvas] = setCanvasRects();
    fireEvent.mouseDown(mainCanvas, { clientX: 130, clientY: 30 });
    fireEvent.mouseDown(mainCanvas, { clientX: 170, clientY: 30 });

    expect(screen.getByText('Occupied: 2 cells')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      footprint: {
        version: 1,
        grid_type: 'square',
        square_cells: [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ],
        width_cells: 2,
        height_cells: 1,
      },
      framing: {
        center_x_cells: 0.5,
        center_y_cells: 0,
        extent_x_cells: 1,
        extent_y_cells: 0.5,
      },
    });
  });

  it('supports eraser mode and re-blocks confirm when all cells are removed', async () => {
    render(
      <FootprintPainterModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        imageSrc="blob:ok"
        gridType="square"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Paint Token Footprint/i)).toBeInTheDocument();
    });

    const [mainCanvas] = setCanvasRects();
    fireEvent.mouseDown(mainCanvas, { clientX: 130, clientY: 30 });
    expect(screen.getByText('Occupied: 1 cell')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    fireEvent.mouseDown(mainCanvas, { clientX: 130, clientY: 30 });

    expect(screen.getByText('Occupied: 0 cells')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('emits hex footprint payload with radius and max extent', async () => {
    const onConfirm = vi.fn();
    render(
      <FootprintPainterModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        imageSrc="blob:ok"
        gridType="hex"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    const [mainCanvas] = setCanvasRects();
    fireEvent.mouseDown(mainCanvas, { clientX: 130, clientY: 30 });
    fireEvent.mouseDown(mainCanvas, { clientX: 190, clientY: 30 });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      footprint: expect.objectContaining({
        version: 1,
        grid_type: 'hex',
        radius_cells: 1,
      }),
      framing: {
        max_extent_cells: 2,
      },
    });

    const result = onConfirm.mock.calls[0][0] as {
      footprint: TokenFootprintConfig;
    };
    expect(result.footprint.hex_cells).toEqual(
      expect.arrayContaining([
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ]),
    );
  });

  it('handles image load failure and still allows cancel', async () => {
    const onClose = vi.fn();
    render(
      <FootprintPainterModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        imageSrc="blob:error"
        gridType="square"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
