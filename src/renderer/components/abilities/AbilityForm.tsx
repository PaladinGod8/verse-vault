import { FormEvent, useEffect, useState } from 'react';

type AddAbilityInput = Parameters<DbApi['abilities']['add']>[0];

type AbilityFormInitialValues = {
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
  aoe_shape: string | null;
  aoe_size_cells: number | null;
  target_type: string | null;
};

type AbilityFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  initialValues?: Partial<AbilityFormInitialValues>;
  onSubmit: (data: AddAbilityInput) => Promise<void>;
  onCancel: () => void;
};

const ABILITY_TYPE_OPTIONS = ['active', 'passive'] as const;
const PASSIVE_SUBTYPE_OPTIONS = ['linchpin', 'keystone', 'rostering'] as const;
const PICK_TIMING_OPTIONS = ['obtain', 'rest'] as const;

function normalizeJsonForEditor(
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

function parseJsonField(
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
    expectedShape === 'object' &&
    (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')
  ) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return JSON.stringify(parsed);
}

export default function AbilityForm({
  mode = 'create',
  worldId,
  initialValues,
  onSubmit,
  onCancel,
}: AbilityFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [type, setType] = useState(initialValues?.type ?? '');
  const [passiveSubtype, setPassiveSubtype] = useState(
    initialValues?.passive_subtype ?? '',
  );
  const [levelId, setLevelId] = useState(
    initialValues?.level_id ? String(initialValues.level_id) : '',
  );
  const [effects, setEffects] = useState(
    normalizeJsonForEditor(initialValues?.effects, '[]'),
  );
  const [conditions, setConditions] = useState(
    normalizeJsonForEditor(initialValues?.conditions, '[]'),
  );
  const [castCost, setCastCost] = useState(
    normalizeJsonForEditor(initialValues?.cast_cost, '{}'),
  );
  const [trigger, setTrigger] = useState(initialValues?.trigger ?? '');
  const [pickCount, setPickCount] = useState(
    initialValues?.pick_count !== null &&
      initialValues?.pick_count !== undefined
      ? String(initialValues.pick_count)
      : '',
  );
  const [pickTiming, setPickTiming] = useState(
    initialValues?.pick_timing ?? '',
  );
  const [pickIsPermanent, setPickIsPermanent] = useState(
    initialValues?.pick_is_permanent === 1,
  );
  const [rangeCells, setRangeCells] = useState(
    initialValues?.range_cells !== null && initialValues?.range_cells !== undefined
      ? String(initialValues.range_cells)
      : '',
  );
  const [aoeShape, setAoeShape] = useState(initialValues?.aoe_shape ?? '');
  const [aoeSizeCells, setAoeSizeCells] = useState(
    initialValues?.aoe_size_cells !== null &&
      initialValues?.aoe_size_cells !== undefined
      ? String(initialValues.aoe_size_cells)
      : '',
  );
  const [targetType, setTargetType] = useState(initialValues?.target_type ?? '');
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [levelsLoadError, setLevelsLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';
  const isActiveType = type === 'active';
  const isPassiveType = type === 'passive';
  const isKeystoneSubtype = isPassiveType && passiveSubtype === 'keystone';
  const isRosteringSubtype = isPassiveType && passiveSubtype === 'rostering';

  useEffect(() => {
    let isMounted = true;

    const loadLevels = async () => {
      setIsLoadingLevels(true);
      setLevelsLoadError(null);

      try {
        const levelRows = await window.db.levels.getAllByWorld(worldId);
        if (isMounted) {
          setLevels(levelRows);
        }
      } catch {
        if (isMounted) {
          setLevels([]);
          setLevelsLoadError('Unable to load levels.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingLevels(false);
        }
      }
    };

    void loadLevels();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('Ability name is required.');
      return;
    }

    const trimmedType = type.trim();
    if (!trimmedType) {
      setSubmitError('Ability type is required.');
      return;
    }

    if (!ABILITY_TYPE_OPTIONS.includes(trimmedType as 'active' | 'passive')) {
      setSubmitError('Ability type must be active or passive.');
      return;
    }

    const trimmedPassiveSubtype = passiveSubtype.trim();
    if (!isPassiveType && trimmedPassiveSubtype) {
      setSubmitError('Passive subtype can only be set when type is passive.');
      return;
    }

    if (
      trimmedPassiveSubtype &&
      !PASSIVE_SUBTYPE_OPTIONS.includes(
        trimmedPassiveSubtype as 'linchpin' | 'keystone' | 'rostering',
      )
    ) {
      setSubmitError(
        'Passive subtype must be linchpin, keystone, or rostering.',
      );
      return;
    }

    const trimmedTrigger = trigger.trim();

    let normalizedEffects = '[]';
    let normalizedConditions = '[]';
    let normalizedCastCost = '{}';

    try {
      normalizedEffects = parseJsonField('Effects', effects, 'array');
      normalizedConditions = isPassiveType
        ? parseJsonField('Conditions', conditions, 'array')
        : '[]';
      normalizedCastCost = isActiveType
        ? parseJsonField('Cast cost', castCost, 'object')
        : '{}';
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Invalid JSON in ability form fields.',
      );
      return;
    }

    const levelIdNumber = Number(levelId);
    const normalizedLevelId =
      isKeystoneSubtype && levelId.trim()
        ? Number.isInteger(levelIdNumber) && levelIdNumber > 0
          ? levelIdNumber
          : NaN
        : null;
    if (Number.isNaN(normalizedLevelId)) {
      setSubmitError('Level must be a valid selection.');
      return;
    }

    const trimmedPickCount = pickCount.trim();
    const parsedPickCount = Number(trimmedPickCount);
    let normalizedPickCount: number | null = null;
    if (isRosteringSubtype && trimmedPickCount) {
      if (!Number.isInteger(parsedPickCount) || parsedPickCount < 0) {
        setSubmitError('Pick count must be a non-negative whole number.');
        return;
      }
      normalizedPickCount = parsedPickCount;
    }

    const trimmedPickTiming = pickTiming.trim();
    let normalizedPickTiming: string | null = null;
    if (isRosteringSubtype && trimmedPickTiming) {
      if (
        !PICK_TIMING_OPTIONS.includes(trimmedPickTiming as 'obtain' | 'rest')
      ) {
        setSubmitError('Pick timing must be obtain or rest.');
        return;
      }
      normalizedPickTiming = trimmedPickTiming;
    }

    let parsedRangeCells: number | null = null;
    let parsedAoeSizeCells: number | null = null;
    if (isActiveType) {
      const trimmedRangeCells = rangeCells.trim();
      if (trimmedRangeCells) {
        const n = Number(trimmedRangeCells);
        if (!Number.isInteger(n) || n <= 0) {
          setSubmitError('Range must be a positive whole number.');
          return;
        }
        parsedRangeCells = n;
      }
      const trimmedAoeSizeCells = aoeSizeCells.trim();
      if (trimmedAoeSizeCells) {
        const n = Number(trimmedAoeSizeCells);
        if (!Number.isInteger(n) || n <= 0) {
          setSubmitError('AoE size must be a positive whole number.');
          return;
        }
        if (!aoeShape) {
          setSubmitError('AoE size requires an AoE shape to be selected.');
          return;
        }
        parsedAoeSizeCells = n;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        world_id: worldId,
        name: trimmedName,
        description: description.trim() || null,
        type: trimmedType,
        passive_subtype: isPassiveType ? trimmedPassiveSubtype || null : null,
        level_id: normalizedLevelId,
        effects: normalizedEffects,
        conditions: normalizedConditions,
        cast_cost: normalizedCastCost,
        trigger: trimmedTrigger || null,
        pick_count: isRosteringSubtype ? normalizedPickCount : null,
        pick_timing: isRosteringSubtype ? normalizedPickTiming : null,
        pick_is_permanent: isRosteringSubtype && pickIsPermanent ? 1 : 0,
        range_cells: isActiveType ? parsedRangeCells : null,
        aoe_shape: isActiveType ? aoeShape || null : null,
        aoe_size_cells: isActiveType ? parsedAoeSizeCells : null,
        target_type: isActiveType ? targetType || null : null,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to save ability changes.'
            : 'Failed to create ability.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="ability-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="ability-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter ability name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-type"
          className="block text-sm font-medium text-slate-800"
        >
          Type
        </label>
        <select
          id="ability-type"
          value={type}
          onChange={(event) => {
            const nextType = event.target.value;
            setType(nextType);
            if (nextType !== 'passive') {
              setPassiveSubtype('');
              setLevelId('');
              setPickCount('');
              setPickTiming('');
              setPickIsPermanent(false);
            }
            if (nextType !== 'active') {
              setRangeCells('');
              setAoeShape('');
              setAoeSizeCells('');
              setTargetType('');
            }
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={isSubmitting}
          required
        >
          <option value="">Select type</option>
          <option value="active">active</option>
          <option value="passive">passive</option>
        </select>
      </div>

      {isPassiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-passive-subtype"
            className="block text-sm font-medium text-slate-800"
          >
            Passive subtype (optional)
          </label>
          <select
            id="ability-passive-subtype"
            value={passiveSubtype}
            onChange={(event) => {
              const nextSubtype = event.target.value;
              setPassiveSubtype(nextSubtype);
              if (nextSubtype !== 'keystone') {
                setLevelId('');
              }
              if (nextSubtype !== 'rostering') {
                setPickCount('');
                setPickTiming('');
                setPickIsPermanent(false);
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            disabled={isSubmitting}
          >
            <option value="">None</option>
            <option value="linchpin">linchpin</option>
            <option value="keystone">keystone</option>
            <option value="rostering">rostering</option>
          </select>
        </div>
      ) : null}

      {isKeystoneSubtype ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-level-id"
            className="block text-sm font-medium text-slate-800"
          >
            Keystone level (optional)
          </label>
          <select
            id="ability-level-id"
            value={levelId}
            onChange={(event) => setLevelId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            disabled={isSubmitting || isLoadingLevels}
          >
            <option value="">None</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          {levelsLoadError ? (
            <p className="text-xs text-amber-700">{levelsLoadError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="ability-trigger"
          className="block text-sm font-medium text-slate-800"
        >
          Trigger (optional)
        </label>
        <input
          id="ability-trigger"
          type="text"
          value={trigger}
          onChange={(event) => setTrigger(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="e.g. On hit, On dodge"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ability-effects"
          className="block text-sm font-medium text-slate-800"
        >
          Effects (JSON array)
        </label>
        <textarea
          id="ability-effects"
          value={effects}
          onChange={(event) => setEffects(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder='[{"type":"damage","value":10}]'
          disabled={isSubmitting}
        />
      </div>

      {isPassiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-conditions"
            className="block text-sm font-medium text-slate-800"
          >
            Conditions (JSON array)
          </label>
          <textarea
            id="ability-conditions"
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder='[{"type":"on-turn-start"}]'
            disabled={isSubmitting}
          />
        </div>
      ) : null}

      {isActiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-cast-cost"
            className="block text-sm font-medium text-slate-800"
          >
            Cast cost (JSON object)
          </label>
          <textarea
            id="ability-cast-cost"
            value={castCost}
            onChange={(event) => setCastCost(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder='{"mana":10}'
            disabled={isSubmitting}
          />
        </div>
      ) : null}

      {isActiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-range-cells"
            className="block text-sm font-medium text-slate-800"
          >
            Range (cells)
          </label>
          <input
            id="ability-range-cells"
            type="number"
            min={1}
            step={1}
            value={rangeCells}
            onChange={(event) => setRangeCells(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="e.g. 6"
            disabled={isSubmitting}
          />
        </div>
      ) : null}

      {isActiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-aoe-shape"
            className="block text-sm font-medium text-slate-800"
          >
            AoE shape
          </label>
          <select
            id="ability-aoe-shape"
            value={aoeShape}
            onChange={(event) => {
              const next = event.target.value;
              setAoeShape(next);
              if (!next) {
                setAoeSizeCells('');
              }
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            disabled={isSubmitting}
          >
            <option value="">None</option>
            <option value="circle">circle</option>
            <option value="rectangle">rectangle</option>
            <option value="cone">cone</option>
            <option value="line">line</option>
          </select>
        </div>
      ) : null}

      {isActiveType && aoeShape ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-aoe-size-cells"
            className="block text-sm font-medium text-slate-800"
          >
            AoE size (cells)
          </label>
          <input
            id="ability-aoe-size-cells"
            type="number"
            min={1}
            step={1}
            value={aoeSizeCells}
            onChange={(event) => setAoeSizeCells(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="e.g. 3"
            disabled={isSubmitting}
          />
        </div>
      ) : null}

      {isActiveType ? (
        <div className="space-y-1">
          <label
            htmlFor="ability-target-type"
            className="block text-sm font-medium text-slate-800"
          >
            Target type
          </label>
          <select
            id="ability-target-type"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            disabled={isSubmitting}
          >
            <option value="">None</option>
            <option value="tile">tile</option>
            <option value="token">token</option>
          </select>
        </div>
      ) : null}

      {isRosteringSubtype ? (
        <>
          <div className="space-y-1">
            <label
              htmlFor="ability-pick-count"
              className="block text-sm font-medium text-slate-800"
            >
              Pick count (optional)
            </label>
            <input
              id="ability-pick-count"
              type="number"
              min={0}
              step={1}
              value={pickCount}
              onChange={(event) => setPickCount(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. 2"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="ability-pick-timing"
              className="block text-sm font-medium text-slate-800"
            >
              Pick timing (optional)
            </label>
            <select
              id="ability-pick-timing"
              value={pickTiming}
              onChange={(event) => setPickTiming(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              disabled={isSubmitting}
            >
              <option value="">None</option>
              <option value="obtain">obtain</option>
              <option value="rest">rest</option>
            </select>
          </div>

          <label
            htmlFor="ability-pick-is-permanent"
            className="flex items-center gap-2 text-sm text-slate-800"
          >
            <input
              id="ability-pick-is-permanent"
              type="checkbox"
              checked={pickIsPermanent}
              onChange={(event) => setPickIsPermanent(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              disabled={isSubmitting}
            />
            Picks are permanent
          </label>
        </>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="ability-description"
          className="block text-sm font-medium text-slate-800"
        >
          Description (optional)
        </label>
        <textarea
          id="ability-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="A quick summary of this ability."
          disabled={isSubmitting}
        />
      </div>

      {submitError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
              ? 'Save changes'
              : 'Create ability'}
        </button>
      </div>
    </form>
  );
}
