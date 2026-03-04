const FOOTPRINT_SERIALIZATION_VERSION = 1;
const COORDINATE_PRECISION = 4;

type TokenConfigSerializationResult = {
  footprint: TokenFootprintConfig;
  framing: TokenFramingConfig;
};

function roundDeterministic(value: number): number {
  const factor = 10 ** COORDINATE_PRECISION;
  return Math.round(value * factor) / factor;
}

function ensureInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value;
}

function ensureNonEmptyCells<T>(cells: readonly T[], fieldName: string): void {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new Error(`${fieldName} must include at least one occupied cell`);
  }
}

export function normalizeSquareOccupancy(
  cells: readonly TokenSquareFootprintCell[],
): TokenSquareFootprintCell[] {
  ensureNonEmptyCells(cells, 'Square occupancy');

  const deduped = new Map<string, TokenSquareFootprintCell>();
  for (const [index, cell] of cells.entries()) {
    if (!cell || typeof cell !== 'object') {
      throw new Error(`Square occupancy cell ${index} must be an object`);
    }

    const col = ensureInteger(cell.col, `Square occupancy cell ${index}.col`);
    const row = ensureInteger(cell.row, `Square occupancy cell ${index}.row`);
    deduped.set(`${col}:${row}`, { col, row });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.col !== b.col) {
      return a.col - b.col;
    }
    return a.row - b.row;
  });
}

export function normalizeHexOccupancy(
  cells: readonly TokenHexFootprintCell[],
): TokenHexFootprintCell[] {
  ensureNonEmptyCells(cells, 'Hex occupancy');

  const deduped = new Map<string, TokenHexFootprintCell>();
  for (const [index, cell] of cells.entries()) {
    if (!cell || typeof cell !== 'object') {
      throw new Error(`Hex occupancy cell ${index} must be an object`);
    }

    const q = ensureInteger(cell.q, `Hex occupancy cell ${index}.q`);
    const r = ensureInteger(cell.r, `Hex occupancy cell ${index}.r`);
    deduped.set(`${q}:${r}`, { q, r });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.q !== b.q) {
      return a.q - b.q;
    }
    return a.r - b.r;
  });
}

export function buildSquareFootprintConfig(
  cells: readonly TokenSquareFootprintCell[],
): TokenConfigSerializationResult {
  const normalizedCells = normalizeSquareOccupancy(cells);
  const cols = normalizedCells.map((cell) => cell.col);
  const rows = normalizedCells.map((cell) => cell.row);

  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);

  const widthCells = maxCol - minCol + 1;
  const heightCells = maxRow - minRow + 1;
  const extentXCells = widthCells / 2;
  const extentYCells = heightCells / 2;

  return {
    footprint: {
      version: FOOTPRINT_SERIALIZATION_VERSION,
      grid_type: 'square',
      square_cells: normalizedCells,
      width_cells: widthCells,
      height_cells: heightCells,
    },
    framing: {
      center_x_cells: roundDeterministic((minCol + maxCol) / 2),
      center_y_cells: roundDeterministic((minRow + maxRow) / 2),
      extent_x_cells: roundDeterministic(extentXCells),
      extent_y_cells: roundDeterministic(extentYCells),
      max_extent_cells: roundDeterministic(Math.max(extentXCells, extentYCells)),
    },
  };
}

export function buildHexFootprintConfig(
  cells: readonly TokenHexFootprintCell[],
): TokenConfigSerializationResult {
  const normalizedCells = normalizeHexOccupancy(cells);
  const qValues = normalizedCells.map((cell) => cell.q);
  const rValues = normalizedCells.map((cell) => cell.r);

  const minQ = Math.min(...qValues);
  const maxQ = Math.max(...qValues);
  const minR = Math.min(...rValues);
  const maxR = Math.max(...rValues);

  const extentQCells = (maxQ - minQ + 1) / 2;
  const extentRCells = (maxR - minR + 1) / 2;
  const maxExtentCells = Math.max(extentQCells, extentRCells);

  return {
    footprint: {
      version: FOOTPRINT_SERIALIZATION_VERSION,
      grid_type: 'hex',
      hex_cells: normalizedCells,
      radius_cells: roundDeterministic(maxExtentCells),
    },
    framing: {
      center_x_cells: roundDeterministic((minQ + maxQ) / 2),
      center_y_cells: roundDeterministic((minR + maxR) / 2),
      extent_x_cells: roundDeterministic(extentQCells),
      extent_y_cells: roundDeterministic(extentRCells),
      max_extent_cells: roundDeterministic(maxExtentCells),
    },
  };
}

export function serializeSquareFootprintConfig(
  baseConfig: TokenConfigShape,
  cells: readonly TokenSquareFootprintCell[],
): string {
  const normalized = buildSquareFootprintConfig(cells);
  return JSON.stringify({
    ...baseConfig,
    footprint: normalized.footprint,
    framing: normalized.framing,
  });
}

export function serializeHexFootprintConfig(
  baseConfig: TokenConfigShape,
  cells: readonly TokenHexFootprintCell[],
): string {
  const normalized = buildHexFootprintConfig(cells);
  return JSON.stringify({
    ...baseConfig,
    footprint: normalized.footprint,
    framing: normalized.framing,
  });
}
