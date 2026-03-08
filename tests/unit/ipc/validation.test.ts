import { describe, expect, it } from 'vitest';
import {
  ensureFiniteNumber,
  ensurePositiveFiniteNumber,
  ensureSqliteBooleanNumber,
  isJsonRecord,
  isSqliteUniqueConstraintError,
  parseJsonText,
} from '../../../src/main/ipc/validation';

describe('isJsonRecord', () => {
  it('returns true for plain objects', () => {
    expect(isJsonRecord({})).toBe(true);
    expect(isJsonRecord({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isJsonRecord(null)).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isJsonRecord([])).toBe(false);
    expect(isJsonRecord([1, 2])).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isJsonRecord('string')).toBe(false);
    expect(isJsonRecord(42)).toBe(false);
    expect(isJsonRecord(true)).toBe(false);
    expect(isJsonRecord(undefined)).toBe(false);
  });
});

describe('parseJsonText', () => {
  it('parses a valid JSON object', () => {
    expect(parseJsonText('{"a":1}', 'field')).toEqual({ a: 1 });
  });

  it('parses a valid JSON array', () => {
    expect(parseJsonText('[1,2,3]', 'field')).toEqual([1, 2, 3]);
  });

  it('parses a valid JSON primitive', () => {
    expect(parseJsonText('"hello"', 'field')).toBe('hello');
    expect(parseJsonText('42', 'field')).toBe(42);
  });

  it('throws when value is not a string', () => {
    expect(() => parseJsonText(42, 'myField')).toThrowError('myField must be a JSON string');
    expect(() => parseJsonText(null, 'myField')).toThrowError('myField must be a JSON string');
    expect(() => parseJsonText(undefined, 'myField')).toThrowError('myField must be a JSON string');
    expect(() => parseJsonText({}, 'myField')).toThrowError('myField must be a JSON string');
  });

  it('throws when string is invalid JSON', () => {
    expect(() => parseJsonText('not-json', 'field')).toThrowError('field must be valid JSON text');
    expect(() => parseJsonText('{bad}', 'field')).toThrowError('field must be valid JSON text');
  });
});

describe('ensureFiniteNumber', () => {
  it('returns the value for finite numbers', () => {
    expect(ensureFiniteNumber(0, 'field')).toBe(0);
    expect(ensureFiniteNumber(-5.5, 'field')).toBe(-5.5);
    expect(ensureFiniteNumber(100, 'field')).toBe(100);
  });

  it('throws for non-number values', () => {
    expect(() => ensureFiniteNumber('5', 'field')).toThrowError('field must be a finite number');
    expect(() => ensureFiniteNumber(null, 'field')).toThrowError('field must be a finite number');
    expect(() => ensureFiniteNumber(undefined, 'field')).toThrowError(
      'field must be a finite number',
    );
    expect(() => ensureFiniteNumber({}, 'field')).toThrowError('field must be a finite number');
  });

  it('throws for non-finite numbers', () => {
    expect(() => ensureFiniteNumber(Infinity, 'field')).toThrowError(
      'field must be a finite number',
    );
    expect(() => ensureFiniteNumber(-Infinity, 'field')).toThrowError(
      'field must be a finite number',
    );
    expect(() => ensureFiniteNumber(NaN, 'field')).toThrowError('field must be a finite number');
  });
});

describe('ensurePositiveFiniteNumber', () => {
  it('returns the value for positive finite numbers', () => {
    expect(ensurePositiveFiniteNumber(1, 'field')).toBe(1);
    expect(ensurePositiveFiniteNumber(0.1, 'field')).toBe(0.1);
    expect(ensurePositiveFiniteNumber(1000, 'field')).toBe(1000);
  });

  it('throws for zero', () => {
    expect(() => ensurePositiveFiniteNumber(0, 'field')).toThrowError(
      'field must be greater than 0',
    );
  });

  it('throws for negative numbers', () => {
    expect(() => ensurePositiveFiniteNumber(-1, 'field')).toThrowError(
      'field must be greater than 0',
    );
    expect(() => ensurePositiveFiniteNumber(-0.001, 'field')).toThrowError(
      'field must be greater than 0',
    );
  });

  it('throws for non-finite (delegates to ensureFiniteNumber)', () => {
    expect(() => ensurePositiveFiniteNumber(Infinity, 'field')).toThrowError(
      'field must be a finite number',
    );
    expect(() => ensurePositiveFiniteNumber(NaN, 'field')).toThrowError(
      'field must be a finite number',
    );
    expect(() => ensurePositiveFiniteNumber('5', 'field')).toThrowError(
      'field must be a finite number',
    );
  });
});

describe('ensureSqliteBooleanNumber', () => {
  it('returns 0 for 0', () => {
    expect(ensureSqliteBooleanNumber(0, 'field')).toBe(0);
  });

  it('returns 1 for 1', () => {
    expect(ensureSqliteBooleanNumber(1, 'field')).toBe(1);
  });

  it('throws for values other than 0 or 1', () => {
    expect(() => ensureSqliteBooleanNumber(2, 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber(-1, 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber(true, 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber(false, 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber('1', 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber(null, 'field')).toThrowError('field must be 0 or 1');
    expect(() => ensureSqliteBooleanNumber(undefined, 'field')).toThrowError(
      'field must be 0 or 1',
    );
  });
});

describe('isSqliteUniqueConstraintError', () => {
  it('returns false for falsy non-object values', () => {
    expect(isSqliteUniqueConstraintError(null)).toBe(false);
    expect(isSqliteUniqueConstraintError(undefined)).toBe(false);
    expect(isSqliteUniqueConstraintError(0)).toBe(false);
    expect(isSqliteUniqueConstraintError('')).toBe(false);
  });

  it('returns false for non-object primitives', () => {
    expect(isSqliteUniqueConstraintError('error string')).toBe(false);
    expect(isSqliteUniqueConstraintError(42)).toBe(false);
  });

  it('returns true for object with SQLITE_CONSTRAINT_UNIQUE code', () => {
    expect(isSqliteUniqueConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe(true);
  });

  it('returns true for Error instance with UNIQUE constraint message', () => {
    expect(
      isSqliteUniqueConstraintError(new Error('UNIQUE constraint failed: table.col')),
    ).toBe(true);
  });

  it('returns false for Error instance without UNIQUE message', () => {
    expect(isSqliteUniqueConstraintError(new Error('some other error'))).toBe(false);
  });

  it('returns false for plain object without SQLITE_CONSTRAINT_UNIQUE code and not an Error', () => {
    expect(isSqliteUniqueConstraintError({ code: 'SQLITE_ERROR' })).toBe(false);
    // has code but not UNIQUE — falls through to instanceof check which is false
    expect(isSqliteUniqueConstraintError({ message: 'UNIQUE constraint failed' })).toBe(false);
  });
});
