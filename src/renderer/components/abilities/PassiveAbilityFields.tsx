type PassiveAbilityFieldsProps = {
  passiveSubtype: string;
  onPassiveSubtypeChange: (value: string) => void;
  levelId: string;
  onLevelIdChange: (value: string) => void;
  levels: Level[];
  isLoadingLevels: boolean;
  levelsLoadError: string | null;
  conditions: string;
  onConditionsChange: (value: string) => void;
  pickCount: string;
  onPickCountChange: (value: string) => void;
  pickTiming: string;
  onPickTimingChange: (value: string) => void;
  pickIsPermanent: boolean;
  onPickIsPermanentChange: (value: boolean) => void;
  isSubmitting: boolean;
};

export default function PassiveAbilityFields({
  passiveSubtype,
  onPassiveSubtypeChange,
  levelId,
  onLevelIdChange,
  levels,
  isLoadingLevels,
  levelsLoadError,
  conditions,
  onConditionsChange,
  pickCount,
  onPickCountChange,
  pickTiming,
  onPickTimingChange,
  pickIsPermanent,
  onPickIsPermanentChange,
  isSubmitting,
}: PassiveAbilityFieldsProps) {
  const isKeystoneSubtype = passiveSubtype === 'keystone';
  const isRosteringSubtype = passiveSubtype === 'rostering';

  return (
    <>
      <div className='space-y-1'>
        <label
          htmlFor='ability-passive-subtype'
          className='block text-sm font-medium text-slate-800'
        >
          Passive subtype (optional)
        </label>
        <select
          id='ability-passive-subtype'
          value={passiveSubtype}
          onChange={(event) => onPassiveSubtypeChange(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          disabled={isSubmitting}
        >
          <option value=''>None</option>
          <option value='linchpin'>linchpin</option>
          <option value='keystone'>keystone</option>
          <option value='rostering'>rostering</option>
        </select>
      </div>

      {isKeystoneSubtype
        ? (
          <div className='space-y-1'>
            <label
              htmlFor='ability-level-id'
              className='block text-sm font-medium text-slate-800'
            >
              Keystone level (optional)
            </label>
            <select
              id='ability-level-id'
              value={levelId}
              onChange={(event) => onLevelIdChange(event.target.value)}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
              disabled={isSubmitting || isLoadingLevels}
            >
              <option value=''>None</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
            {levelsLoadError ? <p className='text-xs text-amber-700'>{levelsLoadError}</p> : null}
          </div>
        )
        : null}

      <div className='space-y-1'>
        <label
          htmlFor='ability-conditions'
          className='block text-sm font-medium text-slate-800'
        >
          Conditions (JSON array)
        </label>
        <textarea
          id='ability-conditions'
          value={conditions}
          onChange={(event) => onConditionsChange(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='[{"type":"on-turn-start"}]'
          disabled={isSubmitting}
        />
      </div>

      {isRosteringSubtype
        ? (
          <>
            <div className='space-y-1'>
              <label
                htmlFor='ability-pick-count'
                className='block text-sm font-medium text-slate-800'
              >
                Pick count (optional)
              </label>
              <input
                id='ability-pick-count'
                type='number'
                min={0}
                step={1}
                value={pickCount}
                onChange={(event) => onPickCountChange(event.target.value)}
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                placeholder='e.g. 2'
                disabled={isSubmitting}
              />
            </div>

            <div className='space-y-1'>
              <label
                htmlFor='ability-pick-timing'
                className='block text-sm font-medium text-slate-800'
              >
                Pick timing (optional)
              </label>
              <select
                id='ability-pick-timing'
                value={pickTiming}
                onChange={(event) => onPickTimingChange(event.target.value)}
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                disabled={isSubmitting}
              >
                <option value=''>None</option>
                <option value='obtain'>obtain</option>
                <option value='rest'>rest</option>
              </select>
            </div>

            <label
              htmlFor='ability-pick-is-permanent'
              className='flex items-center gap-2 text-sm text-slate-800'
            >
              <input
                id='ability-pick-is-permanent'
                type='checkbox'
                checked={pickIsPermanent}
                onChange={(event) => onPickIsPermanentChange(event.target.checked)}
                className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                disabled={isSubmitting}
              />
              Picks are permanent
            </label>
          </>
        )
        : null}
    </>
  );
}
