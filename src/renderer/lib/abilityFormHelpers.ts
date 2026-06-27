const ABILITY_TYPE_OPTIONS = ['active', 'passive'] as const;
const PASSIVE_SUBTYPE_OPTIONS = ['linchpin', 'keystone', 'rostering'] as const;
const PICK_TIMING_OPTIONS = ['obtain', 'rest'] as const;

export function optionalNumberToFieldString(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

export function normalizeJsonForEditor(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function parseJsonField(
  label: string,
  text: string,
  expectedShape: 'array' | 'object',
): string {
  const fallback = expectedShape === 'array' ? '[]' : '{}';
  const trimmed = text.trim();
  if (!trimmed) {
    return fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      `${label} must be valid JSON (${expectedShape === 'array' ? 'array' : 'object'}).`,
    );
  }

  if (expectedShape === 'array' && !Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array.`);
  }

  if (
    expectedShape === 'object'
    && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')
  ) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return JSON.stringify(parsed);
}

export type AbilityFormValues = {
  name: string;
  description: string;
  type: string;
  passiveSubtype: string;
  levelId: string;
  effects: string;
  conditions: string;
  castCost: string;
  trigger: string;
  pickCount: string;
  pickTiming: string;
  pickIsPermanent: boolean;
  rangeCells: string;
  aoeShape: string;
  aoeSizeCells: string;
  targetType: string;
};

export type AbilityFormPayload = {
  world_id: number;
  name: string;
  description: string | null;
  type: string;
  passive_subtype: string | null;
  level_id: number | null;
  effects: string;
  conditions: string;
  cast_cost: string;
  trigger: string | null;
  pick_count: number | null;
  pick_timing: string | null;
  pick_is_permanent: number;
  range_cells: number | null;
  aoe_shape: Ability['aoe_shape'];
  aoe_size_cells: number | null;
  target_type: Ability['target_type'];
};

/**
 * Validates and normalizes raw ability form state into the IPC add/update payload shape.
 * Throws an `Error` with a user-facing message on the first validation failure, mirroring
 * the field-by-field checks the form previously ran inline in its submit handler.
 */
export function buildAbilityPayload(
  worldId: number,
  values: AbilityFormValues,
): AbilityFormPayload {
  const trimmedName = values.name.trim();
  if (!trimmedName) {
    throw new Error('Ability name is required.');
  }

  const typeInfo = resolveAbilityTypeInfo(values);
  const { isActiveType, isPassiveType, isKeystoneSubtype, isRosteringSubtype } = typeInfo;

  const normalizedEffects = parseJsonField('Effects', values.effects, 'array');
  const normalizedConditions = isPassiveType
    ? parseJsonField('Conditions', values.conditions, 'array')
    : '[]';
  const normalizedCastCost = isActiveType
    ? parseJsonField('Cast cost', values.castCost, 'object')
    : '{}';

  const normalizedLevelId = resolveLevelId(values, isKeystoneSubtype);
  const rosteringFields = resolveRosteringFields(values, isRosteringSubtype);
  const activeRangeFields = resolveActiveRangeFields(values, isActiveType);

  return assembleAbilityPayload(worldId, trimmedName, values, typeInfo, {
    normalizedEffects,
    normalizedConditions,
    normalizedCastCost,
    normalizedLevelId,
    rosteringFields,
    activeRangeFields,
  });
}

type ResolvedAbilityFields = {
  normalizedEffects: string;
  normalizedConditions: string;
  normalizedCastCost: string;
  normalizedLevelId: number | null;
  rosteringFields: { pickCount: number | null; pickTiming: string | null; };
  activeRangeFields: { rangeCells: number | null; aoeSizeCells: number | null; };
};

function assembleAbilityPayload(
  worldId: number,
  trimmedName: string,
  values: AbilityFormValues,
  typeInfo: ReturnType<typeof resolveAbilityTypeInfo>,
  resolved: ResolvedAbilityFields,
): AbilityFormPayload {
  const { isActiveType, isPassiveType, isRosteringSubtype } = typeInfo;

  return {
    world_id: worldId,
    name: trimmedName,
    description: values.description.trim() || null,
    type: typeInfo.trimmedType,
    passive_subtype: isPassiveType ? typeInfo.trimmedPassiveSubtype || null : null,
    level_id: resolved.normalizedLevelId,
    effects: resolved.normalizedEffects,
    conditions: resolved.normalizedConditions,
    cast_cost: resolved.normalizedCastCost,
    trigger: values.trigger.trim() || null,
    pick_count: isRosteringSubtype ? resolved.rosteringFields.pickCount : null,
    pick_timing: isRosteringSubtype ? resolved.rosteringFields.pickTiming : null,
    pick_is_permanent: isRosteringSubtype && values.pickIsPermanent ? 1 : 0,
    range_cells: isActiveType ? resolved.activeRangeFields.rangeCells : null,
    aoe_shape: isActiveType ? ((values.aoeShape || null) as Ability['aoe_shape']) : null,
    aoe_size_cells: isActiveType ? resolved.activeRangeFields.aoeSizeCells : null,
    target_type: isActiveType ? ((values.targetType || null) as Ability['target_type']) : null,
  };
}

function resolveAbilityTypeInfo(values: AbilityFormValues) {
  const trimmedType = values.type.trim();
  if (!trimmedType) {
    throw new Error('Ability type is required.');
  }
  if (!ABILITY_TYPE_OPTIONS.includes(trimmedType as 'active' | 'passive')) {
    throw new Error('Ability type must be active or passive.');
  }

  const isActiveType = trimmedType === 'active';
  const isPassiveType = trimmedType === 'passive';

  const trimmedPassiveSubtype = values.passiveSubtype.trim();
  if (!isPassiveType && trimmedPassiveSubtype) {
    throw new Error('Passive subtype can only be set when type is passive.');
  }
  if (
    trimmedPassiveSubtype
    && !PASSIVE_SUBTYPE_OPTIONS.includes(
      trimmedPassiveSubtype as 'linchpin' | 'keystone' | 'rostering',
    )
  ) {
    throw new Error('Passive subtype must be linchpin, keystone, or rostering.');
  }

  return {
    trimmedType,
    trimmedPassiveSubtype,
    isActiveType,
    isPassiveType,
    isKeystoneSubtype: isPassiveType && trimmedPassiveSubtype === 'keystone',
    isRosteringSubtype: isPassiveType && trimmedPassiveSubtype === 'rostering',
  };
}

function resolveLevelId(values: AbilityFormValues, isKeystoneSubtype: boolean): number | null {
  if (!isKeystoneSubtype || !values.levelId.trim()) {
    return null;
  }

  const levelIdNumber = Number(values.levelId);
  if (!Number.isInteger(levelIdNumber) || levelIdNumber <= 0) {
    throw new Error('Level must be a valid selection.');
  }
  return levelIdNumber;
}

function resolveRosteringFields(
  values: AbilityFormValues,
  isRosteringSubtype: boolean,
): { pickCount: number | null; pickTiming: string | null; } {
  if (!isRosteringSubtype) {
    return { pickCount: null, pickTiming: null };
  }

  let pickCount: number | null = null;
  const trimmedPickCount = values.pickCount.trim();
  if (trimmedPickCount) {
    const parsedPickCount = Number(trimmedPickCount);
    if (!Number.isInteger(parsedPickCount) || parsedPickCount < 0) {
      throw new Error('Pick count must be a non-negative whole number.');
    }
    pickCount = parsedPickCount;
  }

  let pickTiming: string | null = null;
  const trimmedPickTiming = values.pickTiming.trim();
  if (trimmedPickTiming) {
    if (!PICK_TIMING_OPTIONS.includes(trimmedPickTiming as 'obtain' | 'rest')) {
      throw new Error('Pick timing must be obtain or rest.');
    }
    pickTiming = trimmedPickTiming;
  }

  return { pickCount, pickTiming };
}

function resolveActiveRangeFields(
  values: AbilityFormValues,
  isActiveType: boolean,
): { rangeCells: number | null; aoeSizeCells: number | null; } {
  if (!isActiveType) {
    return { rangeCells: null, aoeSizeCells: null };
  }

  let rangeCells: number | null = null;
  const trimmedRangeCells = values.rangeCells.trim();
  if (trimmedRangeCells) {
    const n = Number(trimmedRangeCells);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('Range must be a positive whole number.');
    }
    rangeCells = n;
  }

  let aoeSizeCells: number | null = null;
  const trimmedAoeSizeCells = values.aoeSizeCells.trim();
  if (trimmedAoeSizeCells) {
    const n = Number(trimmedAoeSizeCells);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('AoE size must be a positive whole number.');
    }
    if (!values.aoeShape) {
      throw new Error('AoE size requires an AoE shape to be selected.');
    }
    aoeSizeCells = n;
  }

  return { rangeCells, aoeSizeCells };
}
