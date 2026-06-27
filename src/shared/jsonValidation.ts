type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonText(value: unknown, fieldName: string): unknown {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a JSON string`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} must be valid JSON text`);
  }
}

export function ensureFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return value;
}

export function ensurePositiveFiniteNumber(
  value: unknown,
  fieldName: string,
): number {
  const normalizedValue = ensureFiniteNumber(value, fieldName);
  if (normalizedValue <= 0) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  return normalizedValue;
}
