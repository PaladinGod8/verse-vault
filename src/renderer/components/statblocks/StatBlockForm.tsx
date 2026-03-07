import { FormEvent, useEffect, useMemo, useState } from 'react';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
  StatBlockStatisticsConfig,
  WorldStatisticsConfig,
} from '../../../shared/statisticsTypes';
import {
  getPassiveScoreValue,
  getResourceValue,
  initializeStatBlockStatistics,
  parseStatBlockConfigObject,
  parseStatBlockSkills,
  parseStatBlockStatistics,
  serializeStatBlockEditorConfig,
  setPassiveScoreValue,
  setResourceValue,
} from '../../lib/statblockStatisticsUtils';
import PassiveScoreInput from '../statistics/PassiveScoreInput';
import ResourceStatisticInput from '../statistics/ResourceStatisticInput';

type StatBlockAddData = Parameters<DbApi['statblocks']['add']>[0];

export type StatBlockFormSubmitData = {
  statblock: StatBlockAddData;
  abilityIds: number[];
};

type StatBlockFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  campaignId?: number | null;
  initialData?: StatBlock;
  availableAbilities: Ability[];
  initialAbilityIds?: number[];
  onSubmit: (data: StatBlockFormSubmitData) => Promise<void>;
  onCancel: () => void;
};

export default function StatBlockForm({
  mode = 'create',
  worldId,
  campaignId,
  initialData,
  availableAbilities,
  initialAbilityIds = [],
  onSubmit,
  onCancel,
}: StatBlockFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [baseConfig, setBaseConfig] = useState<Record<string, unknown>>({});
  const [skills, setSkills] = useState<StatBlockSkillValue[]>([]);
  const [selectedAbilityIds, setSelectedAbilityIds] = useState<number[]>(
    initialAbilityIds,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [worldResources, setWorldResources] = useState<
    ResourceStatisticDefinition[]
  >([]);
  const [worldPassiveScores, setWorldPassiveScores] = useState<
    PassiveScoreDefinition[]
  >([]);
  const [statisticsConfig, setStatisticsConfig] = useState<StatBlockStatisticsConfig | null>(null);

  const isEditMode = mode === 'edit';
  const availableAbilitiesForWorld = useMemo(
    () =>
      availableAbilities
        .filter((ability) => ability.world_id === worldId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [availableAbilities, worldId],
  );

  // Load world and extract statistics definitions
  useEffect(() => {
    let isMounted = true;

    const loadWorld = async () => {
      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (isMounted && existingWorld) {
          try {
            const worldConfig: WorldStatisticsConfig = JSON.parse(
              existingWorld.config,
            );
            setWorldResources(worldConfig.statistics?.resources ?? []);
            setWorldPassiveScores(worldConfig.statistics?.passiveScores ?? []);
          } catch {
            setWorldResources([]);
            setWorldPassiveScores([]);
          }
        }
      } catch {
        if (isMounted) {
          setWorldResources([]);
          setWorldPassiveScores([]);
        }
      }
    };

    void loadWorld();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  // Initialize form state for create/edit
  useEffect(() => {
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setSelectedAbilityIds(initialAbilityIds);

    if (mode === 'edit' && initialData?.config) {
      setBaseConfig(parseStatBlockConfigObject(initialData.config));
      setSkills(parseStatBlockSkills(initialData.config));
      setStatisticsConfig(parseStatBlockStatistics(initialData.config));
      return;
    }

    setBaseConfig({});
    setSkills([]);
  }, [mode, initialData, initialAbilityIds]);

  useEffect(() => {
    if (mode === 'create') {
      setStatisticsConfig(
        initializeStatBlockStatistics(worldResources, worldPassiveScores),
      );
    }
  }, [mode, worldResources, worldPassiveScores]);

  // Filter statistics to only include those still defined in world config
  const filteredStatistics = useMemo(() => {
    if (!statisticsConfig) return null;

    const validResourceIds = new Set(worldResources.map((r) => r.id));
    const validPassiveScoreIds = new Set(worldPassiveScores.map((p) => p.id));

    const resources = statisticsConfig.statistics?.resources ?? {};
    const passiveScores = statisticsConfig.statistics?.passiveScores ?? {};

    const filteredResources: typeof resources = {};
    const filteredPassiveScores: typeof passiveScores = {};

    // Only include resources that still exist in world config
    for (const [id, value] of Object.entries(resources)) {
      if (validResourceIds.has(id)) {
        filteredResources[id] = value;
      }
    }

    // Only include passive scores that still exist in world config
    for (const [id, value] of Object.entries(passiveScores)) {
      if (validPassiveScoreIds.has(id)) {
        filteredPassiveScores[id] = value;
      }
    }

    return {
      statistics: {
        resources: filteredResources,
        passiveScores: filteredPassiveScores,
      },
    };
  }, [statisticsConfig, worldResources, worldPassiveScores]);

  const toggleAbility = (abilityId: number) => {
    setSelectedAbilityIds((prev) =>
      prev.includes(abilityId)
        ? prev.filter((id) => id !== abilityId)
        : [...prev, abilityId]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('StatBlock name is required.');
      return;
    }

    const sanitizedSkills = skills.map((skill) => ({
      key: skill.key.trim(),
      rank: skill.rank,
    }));

    if (sanitizedSkills.some((skill) => !skill.key)) {
      setSubmitError('Each skill must have a key.');
      return;
    }

    if (
      sanitizedSkills.some(
        (skill) => typeof skill.rank !== 'number' || !Number.isFinite(skill.rank),
      )
    ) {
      setSubmitError('Each skill rank must be a finite number.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const allowedAbilityIdSet = new Set(
        availableAbilitiesForWorld.map((ability) => ability.id),
      );
      const uniqueAbilityIds = [...new Set(selectedAbilityIds)].filter((id) =>
        allowedAbilityIdSet.has(id)
      );

      const finalConfig = serializeStatBlockEditorConfig({
        baseConfig,
        statistics: filteredStatistics,
        skills: sanitizedSkills,
      });

      await onSubmit({
        statblock: {
          world_id: worldId,
          ...(campaignId != null ? { campaign_id: campaignId } : {}),
          name: trimmedName,
          description: description.trim() || undefined,
          config: finalConfig,
        },
        abilityIds: uniqueAbilityIds,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to save statblock changes.'
          : 'Failed to create statblock.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      <div className='space-y-1'>
        <label
          htmlFor='statblock-name'
          className='block text-sm font-medium text-slate-800'
        >
          Name
        </label>
        <input
          id='statblock-name'
          type='text'
          value={name}
          onChange={(event) => setName(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Enter statblock name'
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='statblock-description'
          className='block text-sm font-medium text-slate-800'
        >
          Description (optional)
        </label>
        <textarea
          id='statblock-description'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className='min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='Optional lore or notes'
          disabled={isSubmitting}
        />
      </div>

      {/* Resource Statistics Section */}
      {worldResources.length > 0 && statisticsConfig
        ? (
          <div className='space-y-2 border-t border-slate-200 pt-4'>
            <h3 className='text-sm font-semibold text-slate-900'>Resources</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              {worldResources.map((resource) => (
                <ResourceStatisticInput
                  key={resource.id}
                  definition={resource}
                  value={getResourceValue(statisticsConfig, resource.id)}
                  onChange={(value) => {
                    setStatisticsConfig((prev) =>
                      prev ? setResourceValue(prev, resource.id, value) : prev
                    );
                  }}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>
        )
        : null}

      {/* Passive Scores Section */}
      {worldPassiveScores.length > 0 && statisticsConfig
        ? (
          <div className='space-y-2 border-t border-slate-200 pt-4'>
            <h3 className='text-sm font-semibold text-slate-900'>
              Passive Scores
            </h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              {worldPassiveScores.map((passiveScore) => (
                <PassiveScoreInput
                  key={passiveScore.id}
                  definition={passiveScore}
                  value={getPassiveScoreValue(statisticsConfig, passiveScore.id)}
                  onChange={(value) => {
                    setStatisticsConfig((prev) =>
                      prev
                        ? setPassiveScoreValue(prev, passiveScore.id, value)
                        : prev
                    );
                  }}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>
        )
        : null}

      <div className='space-y-2 border-t border-slate-200 pt-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold text-slate-900'>Abilities</h3>
          <p className='text-xs text-slate-500'>
            {selectedAbilityIds.length} selected
          </p>
        </div>
        {availableAbilitiesForWorld.length === 0
          ? (
            <p className='text-sm text-slate-500'>
              No abilities available in this world.
            </p>
          )
          : (
            <div className='max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3'>
              {availableAbilitiesForWorld.map((ability) => (
                <label
                  key={ability.id}
                  className='flex cursor-pointer items-start gap-2 text-sm text-slate-700'
                >
                  <input
                    type='checkbox'
                    checked={selectedAbilityIds.includes(ability.id)}
                    onChange={() => toggleAbility(ability.id)}
                    disabled={isSubmitting}
                    className='mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                  <span>
                    <span className='font-medium text-slate-900'>
                      {ability.name}
                    </span>
                    <span className='ml-2 text-xs uppercase tracking-wide text-slate-500'>
                      {ability.type}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
      </div>

      <div className='space-y-2 border-t border-slate-200 pt-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold text-slate-900'>Skills</h3>
          <button
            type='button'
            onClick={() => {
              setSkills((prev) => [...prev, { key: '', rank: 0 }]);
            }}
            className='rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isSubmitting}
          >
            Add skill
          </button>
        </div>

        {skills.length === 0
          ? <p className='text-sm text-slate-500'>No skills added.</p>
          : null}

        <div className='space-y-2'>
          {skills.map((skill, index) => (
            <div key={`${index}-${skill.key}`} className='grid grid-cols-12 gap-2'>
              <input
                type='text'
                value={skill.key}
                onChange={(event) => {
                  const value = event.target.value;
                  setSkills((prev) =>
                    prev.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, key: value } : entry
                    )
                  );
                }}
                className='col-span-7 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                placeholder='skill_key'
                disabled={isSubmitting}
              />
              <input
                type='number'
                value={skill.rank}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setSkills((prev) =>
                    prev.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                          ...entry,
                          rank: Number.isFinite(nextValue) ? nextValue : 0,
                        }
                        : entry
                    )
                  );
                }}
                className='col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
                disabled={isSubmitting}
              />
              <button
                type='button'
                onClick={() => {
                  setSkills((prev) =>
                    prev.filter((_, entryIndex) =>
                      entryIndex !== index
                    )
                  );
                }}
                className='col-span-2 rounded-lg border border-rose-200 px-2 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {submitError
        ? (
          <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {submitError}
          </p>
        )
        : null}

      <div className='flex justify-end gap-2'>
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
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
            ? 'Save changes'
            : 'Create statblock'}
        </button>
      </div>
    </form>
  );
}
