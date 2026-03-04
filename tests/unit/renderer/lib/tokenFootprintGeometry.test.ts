import { describe, expect, it } from 'vitest';
import {
  buildHexFootprintConfig,
  buildSquareFootprintConfig,
  normalizeHexOccupancy,
  normalizeSquareOccupancy,
  serializeHexFootprintConfig,
  serializeSquareFootprintConfig,
} from '../../../../src/renderer/lib/tokenFootprintGeometry';

describe('tokenFootprintGeometry', () => {
  it('normalizes square occupancy with dedupe and canonical sort', () => {
    const result = normalizeSquareOccupancy([
      { col: 2, row: 1 },
      { col: 0, row: 0 },
      { col: 2, row: 1 },
      { col: -1, row: 3 },
    ]);

    expect(result).toEqual([
      { col: -1, row: 3 },
      { col: 0, row: 0 },
      { col: 2, row: 1 },
    ]);
  });

  it('rejects empty or invalid square occupancy payloads', () => {
    expect(() => normalizeSquareOccupancy([])).toThrowError(
      'Square occupancy must include at least one occupied cell',
    );
    expect(() =>
      normalizeSquareOccupancy([
        { col: 0.5, row: 1 } as TokenSquareFootprintCell,
      ]),
    ).toThrowError('Square occupancy cell 0.col must be an integer');
  });

  it('normalizes hex occupancy with dedupe and canonical sort', () => {
    const result = normalizeHexOccupancy([
      { q: 1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: -2, r: 2 },
    ]);

    expect(result).toEqual([
      { q: -2, r: 2 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
  });

  it('rejects empty or invalid hex occupancy payloads', () => {
    expect(() => normalizeHexOccupancy([])).toThrowError(
      'Hex occupancy must include at least one occupied cell',
    );
    expect(() =>
      normalizeHexOccupancy([{ q: 0, r: 0.25 } as TokenHexFootprintCell]),
    ).toThrowError('Hex occupancy cell 0.r must be an integer');
  });

  it('builds deterministic square footprint and framing config', () => {
    const result = buildSquareFootprintConfig([
      { col: 2, row: 1 },
      { col: 0, row: 0 },
    ]);

    expect(result.footprint).toEqual({
      version: 1,
      grid_type: 'square',
      square_cells: [
        { col: 0, row: 0 },
        { col: 2, row: 1 },
      ],
      width_cells: 3,
      height_cells: 2,
    });
    expect(result.framing).toEqual({
      center_x_cells: 1,
      center_y_cells: 0.5,
      extent_x_cells: 1.5,
      extent_y_cells: 1,
      max_extent_cells: 1.5,
    });
  });

  it('builds deterministic hex footprint and framing config', () => {
    const result = buildHexFootprintConfig([
      { q: 1, r: 0 },
      { q: 0, r: 0 },
      { q: 0, r: 1 },
    ]);

    expect(result.footprint).toEqual({
      version: 1,
      grid_type: 'hex',
      hex_cells: [
        { q: 0, r: 0 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
      ],
      radius_cells: 1,
    });
    expect(result.framing).toEqual({
      center_x_cells: 0.5,
      center_y_cells: 0.5,
      extent_x_cells: 1,
      extent_y_cells: 1,
      max_extent_cells: 1,
    });
  });

  it('serializes footprint and framing under base config', () => {
    const squareSerialized = JSON.parse(
      serializeSquareFootprintConfig({ color: 'red' }, [{ col: 0, row: 0 }]),
    ) as TokenConfigShape & { color: string };

    expect(squareSerialized.color).toBe('red');
    expect(squareSerialized.footprint?.grid_type).toBe('square');
    expect(squareSerialized.framing?.center_x_cells).toBe(0);

    const hexSerialized = JSON.parse(
      serializeHexFootprintConfig({ alpha: 0.5 }, [{ q: 0, r: 0 }]),
    ) as TokenConfigShape & { alpha: number };

    expect(hexSerialized.alpha).toBe(0.5);
    expect(hexSerialized.footprint?.grid_type).toBe('hex');
    expect(hexSerialized.framing?.max_extent_cells).toBe(0.5);
  });
});
