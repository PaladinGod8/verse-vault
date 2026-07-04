export {
  ensureFiniteNumber,
  ensurePositiveFiniteNumber,
  isJsonRecord,
  parseJsonText,
} from '../../shared/jsonValidation';

export function ensureSqliteBooleanNumber(
  value: unknown,
  fieldName: string,
): number {
  if (value !== 0 && value !== 1) {
    throw new Error(`${fieldName} must be 0 or 1`);
  }
  return value;
}

export function isSqliteUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('UNIQUE constraint failed');
}

export function normalizeOptionalJsonText(
  value: unknown,
  fieldName: string,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    JSON.parse(trimmed);
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }

  return trimmed;
}
