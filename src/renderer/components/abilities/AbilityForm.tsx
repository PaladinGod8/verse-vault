import { FormEvent, useEffect, useState } from 'react';
import {
  AbilityFormValues,
  buildAbilityPayload,
  normalizeJsonForEditor,
  optionalNumberToFieldString,
} from '../../lib/abilityFormHelpers';
import EditorActionBar from '../ui/EditorActionBar';
import ActiveAbilityFields from './ActiveAbilityFields';
import PassiveAbilityFields from './PassiveAbilityFields';

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
    optionalNumberToFieldString(initialValues?.level_id),
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
    optionalNumberToFieldString(initialValues?.pick_count),
  );
  const [pickTiming, setPickTiming] = useState(
    initialValues?.pick_timing ?? '',
  );
  const [pickIsPermanent, setPickIsPermanent] = useState(
    initialValues?.pick_is_permanent === 1,
  );
  const [rangeCells, setRangeCells] = useState(
    optionalNumberToFieldString(initialValues?.range_cells),
  );
  const [aoeShape, setAoeShape] = useState(initialValues?.aoe_shape ?? '');
  const [aoeSizeCells, setAoeSizeCells] = useState(
    optionalNumberToFieldString(initialValues?.aoe_size_cells),
  );
  const [targetType, setTargetType] = useState(
    initialValues?.target_type ?? '',
  );
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [levelsLoadError, setLevelsLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = mode === 'edit';
  const isActiveType = type === 'active';
  const isPassiveType = type === 'passive';

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

  const handleTypeChange = (nextType: string) => {
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
  };

  const handlePassiveSubtypeChange = (nextSubtype: string) => {
    setPassiveSubtype(nextSubtype);
    if (nextSubtype !== 'keystone') {
      setLevelId('');
    }
    if (nextSubtype !== 'rostering') {
      setPickCount('');
      setPickTiming('');
      setPickIsPermanent(false);
    }
  };

  const handleAoeShapeChange = (nextShape: string) => {
    setAoeShape(nextShape);
    if (!nextShape) {
      setAoeSizeCells('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const values: AbilityFormValues = {
      name,
      description,
      type,
      passiveSubtype,
      levelId,
      effects,
      conditions,
      castCost,
      trigger,
      pickCount,
      pickTiming,
      pickIsPermanent,
      rangeCells,
      aoeShape,
      aoeSizeCells,
      targetType,
    };

    let payload: AddAbilityInput;
    try {
      payload = buildAbilityPayload(worldId, values);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Invalid ability form values.',
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(payload);
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
    <form className='space-y-4' onSubmit={handleSubmit}>
      <EditorActionBar>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type='submit'
          className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
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
      </EditorActionBar>

      <div className='space-y-1'>
        <label
          htmlFor='ability-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='ability-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter ability name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='ability-type'
          className='block text-sm font-medium text-slate-800'
        >
          Type
        </label>
        <select
          id='ability-type'
          value={type}
          onChange={(event) => handleTypeChange(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          disabled={isSubmitting}
          required
        >
          <option value=''>Select type</option>
          <option value='active'>active</option>
          <option value='passive'>passive</option>
        </select>
      </div>

      {isPassiveType
        ? (
          <PassiveAbilityFields
            passiveSubtype={passiveSubtype}
            onPassiveSubtypeChange={handlePassiveSubtypeChange}
            levelId={levelId}
            onLevelIdChange={setLevelId}
            levels={levels}
            isLoadingLevels={isLoadingLevels}
            levelsLoadError={levelsLoadError}
            conditions={conditions}
            onConditionsChange={setConditions}
            pickCount={pickCount}
            onPickCountChange={setPickCount}
            pickTiming={pickTiming}
            onPickTimingChange={setPickTiming}
            pickIsPermanent={pickIsPermanent}
            onPickIsPermanentChange={setPickIsPermanent}
            isSubmitting={isSubmitting}
          />
        )
        : null}

      <div className='space-y-1'>
        <label
          htmlFor='ability-trigger'
          className='block text-sm font-medium text-slate-800'
        >
          Trigger (optional)
        </label>
        <input
          id='ability-trigger'
          type='text'
          value={trigger}
          onChange={(event) => setTrigger(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='e.g. On hit, On dodge'
          disabled={isSubmitting}
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='ability-effects'
          className='block text-sm font-medium text-slate-800'
        >
          Effects (JSON array)
        </label>
        <textarea
          id='ability-effects'
          value={effects}
          onChange={(event) => setEffects(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='[{"type":"damage","value":10}]'
          disabled={isSubmitting}
        />
      </div>

      {isActiveType
        ? (
          <ActiveAbilityFields
            castCost={castCost}
            onCastCostChange={setCastCost}
            rangeCells={rangeCells}
            onRangeCellsChange={setRangeCells}
            aoeShape={aoeShape}
            onAoeShapeChange={handleAoeShapeChange}
            aoeSizeCells={aoeSizeCells}
            onAoeSizeCellsChange={setAoeSizeCells}
            targetType={targetType}
            onTargetTypeChange={setTargetType}
            isSubmitting={isSubmitting}
          />
        )
        : null}

      <div className='space-y-1'>
        <label
          htmlFor='ability-description'
          className='block text-sm font-medium text-slate-800'
        >
          Description (optional)
        </label>
        <textarea
          id='ability-description'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='A quick summary of this ability.'
          disabled={isSubmitting}
        />
      </div>

      {submitError
        ? (
          <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {submitError}
          </p>
        )
        : null}
    </form>
  );
}
