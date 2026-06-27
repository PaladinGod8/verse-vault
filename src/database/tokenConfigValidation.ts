import {
  ensureFiniteNumber,
  ensurePositiveFiniteNumber,
  isJsonRecord,
  parseJsonText,
} from '../shared/jsonValidation';

function ensureInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value as number;
}

function normalizeSquareFootprintCells(
  value: unknown,
): TokenSquareFootprintCell[] {
  if (!Array.isArray(value)) {
    throw new Error('Token config footprint.square_cells must be an array');
  }

  const deduped = new Map<string, TokenSquareFootprintCell>();
  for (const [index, cell] of value.entries()) {
    if (!isJsonRecord(cell)) {
      throw new Error(
        `Token config footprint.square_cells[${index}] must be an object`,
      );
    }

    const col = ensureInteger(
      cell.col,
      `Token config footprint.square_cells[${index}].col`,
    );
    const row = ensureInteger(
      cell.row,
      `Token config footprint.square_cells[${index}].row`,
    );
    deduped.set(`${col}:${row}`, { col, row });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.col !== b.col) {
      return a.col - b.col;
    }
    return a.row - b.row;
  });
}

function normalizeHexFootprintCells(value: unknown): TokenHexFootprintCell[] {
  if (!Array.isArray(value)) {
    throw new Error('Token config footprint.hex_cells must be an array');
  }

  const deduped = new Map<string, TokenHexFootprintCell>();
  for (const [index, cell] of value.entries()) {
    if (!isJsonRecord(cell)) {
      throw new Error(
        `Token config footprint.hex_cells[${index}] must be an object`,
      );
    }

    const q = ensureInteger(
      cell.q,
      `Token config footprint.hex_cells[${index}].q`,
    );
    const r = ensureInteger(
      cell.r,
      `Token config footprint.hex_cells[${index}].r`,
    );
    deduped.set(`${q}:${r}`, { q, r });
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.q !== b.q) {
      return a.q - b.q;
    }
    return a.r - b.r;
  });
}

function normalizeTokenFootprintConfig(input: unknown): TokenFootprintConfig {
  if (!isJsonRecord(input)) {
    throw new Error('Token config footprint must be a JSON object');
  }

  const normalized: TokenFootprintConfig = { ...input };

  if (Object.prototype.hasOwnProperty.call(input, 'version')) {
    const version = ensureInteger(
      input.version,
      'Token config footprint.version',
    );
    if (version !== 1) {
      throw new Error('Token config footprint.version must be 1');
    }
    normalized.version = 1;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'grid_type')) {
    if (input.grid_type !== 'square' && input.grid_type !== 'hex') {
      throw new Error(
        "Token config footprint.grid_type must be 'square' or 'hex'",
      );
    }
    normalized.grid_type = input.grid_type;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'square_cells')) {
    normalized.square_cells = normalizeSquareFootprintCells(input.square_cells);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'hex_cells')) {
    normalized.hex_cells = normalizeHexFootprintCells(input.hex_cells);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'width_cells')) {
    normalized.width_cells = ensurePositiveFiniteNumber(
      input.width_cells,
      'Token config footprint.width_cells',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'height_cells')) {
    normalized.height_cells = ensurePositiveFiniteNumber(
      input.height_cells,
      'Token config footprint.height_cells',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'radius_cells')) {
    normalized.radius_cells = ensurePositiveFiniteNumber(
      input.radius_cells,
      'Token config footprint.radius_cells',
    );
  }

  return normalized;
}

function normalizeTokenFramingConfig(input: unknown): TokenFramingConfig {
  if (!isJsonRecord(input)) {
    throw new Error('Token config framing must be a JSON object');
  }

  const normalized: TokenFramingConfig = { ...input };
  const finiteFields: Array<keyof TokenFramingConfig> = [
    'center_x_cells',
    'center_y_cells',
    'extent_x_cells',
    'extent_y_cells',
    'max_extent_cells',
    'anchor_x',
    'anchor_y',
    'offset_x_px',
    'offset_y_px',
  ];

  for (const fieldName of finiteFields) {
    if (Object.prototype.hasOwnProperty.call(input, fieldName)) {
      normalized[fieldName] = ensureFiniteNumber(
        input[fieldName],
        `Token config framing.${fieldName}`,
      );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'extent_x_cells')
    && normalized.extent_x_cells !== undefined
    && normalized.extent_x_cells <= 0
  ) {
    throw new Error(
      'Token config framing.extent_x_cells must be greater than 0',
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'extent_y_cells')
    && normalized.extent_y_cells !== undefined
    && normalized.extent_y_cells <= 0
  ) {
    throw new Error(
      'Token config framing.extent_y_cells must be greater than 0',
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, 'max_extent_cells')
    && normalized.max_extent_cells !== undefined
    && normalized.max_extent_cells <= 0
  ) {
    throw new Error(
      'Token config framing.max_extent_cells must be greater than 0',
    );
  }

  return normalized;
}

export function ensureTokenConfigJsonText(config: unknown): string {
  const parsedConfig = parseJsonText(config, 'Token config');
  if (!isJsonRecord(parsedConfig)) {
    throw new Error('Token config must be a JSON object');
  }

  const normalizedConfig: TokenConfigShape = { ...parsedConfig };

  if (Object.prototype.hasOwnProperty.call(parsedConfig, 'footprint')) {
    normalizedConfig.footprint = normalizeTokenFootprintConfig(
      parsedConfig.footprint,
    );
  }

  if (Object.prototype.hasOwnProperty.call(parsedConfig, 'framing')) {
    normalizedConfig.framing = normalizeTokenFramingConfig(
      parsedConfig.framing,
    );
  }

  return JSON.stringify(normalizedConfig);
}
