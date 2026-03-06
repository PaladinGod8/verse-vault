import { FormEvent, useState, useEffect } from 'react';
import type {
  WorldStatisticsConfig,
  ResourceStatisticDefinition,
  PassiveScoreDefinition,
  StatBlockStatisticsConfig,
} from '../../../shared/statisticsTypes';
import {
  parseStatBlockStatistics,
  setResourceValue,
  setPassiveScoreValue,
  initializeStatBlockStatistics,
  serializeStatBlockStatistics,
  getResourceValue,
  getPassiveScoreValue,
} from '../../lib/statblockStatisticsUtils';
import ResourceStatisticInput from '../statistics/ResourceStatisticInput';
import PassiveScoreInput from '../statistics/PassiveScoreInput';

type StatBlockAddData = Parameters<DbApi['statblocks']['add']>[0];

type StatBlockFormProps = {
  mode?: 'create' | 'edit';
  worldId: number;
  campaignId?: number | null;
  initialData?: StatBlock;
  onSubmit: (data: StatBlockAddData) => Promise<void>;
  onCancel: () => void;
};

function normalizeConfig(value: string | undefined | null): string {
  if (!value || !value.trim()) return '{}';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function StatBlockForm({
  mode = 'create',
  worldId,
  campaignId,
  initialData,
  onSubmit,
  onCancel,
}: StatBlockFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [config, setConfig] = useState(() =>
    normalizeConfig(initialData?.config),
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [worldResources, setWorldResources] = useState<
    ResourceStatisticDefinition[]
  >([]);
  const [worldPassiveScores, setWorldPassiveScores] = useState<
    PassiveScoreDefinition[]
  >([]);
  const [statisticsConfig, setStatisticsConfig] =
    useState<StatBlockStatisticsConfig | null>(null);

  const isEditMode = mode === 'edit';

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

  // Initialize or parse statblock statistics
  useEffect(() => {
    if (mode === 'create') {
      // Initialize empty statistics for create mode
      setStatisticsConfig(
        initializeStatBlockStatistics(worldResources, worldPassiveScores),
      );
    } else if (initialData?.config) {
      // Parse existing statistics for edit mode
      setStatisticsConfig(parseStatBlockStatistics(initialData.config));
    }
  }, [mode, initialData, worldResources, worldPassiveScores]);

  const handleConfigChange = (value: string) => {
    setConfig(value);
    try {
      JSON.parse(value);
      setConfigError(null);
    } catch {
      setConfigError('Invalid JSON');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError('StatBlock name is required.');
      return;
    }

    const trimmedConfig = config.trim();
    try {
      JSON.parse(trimmedConfig || '{}');
    } catch {
      setSubmitError('Config must be valid JSON.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const hasResources =
        Object.keys(statisticsConfig?.statistics?.resources ?? {}).length > 0;
      const hasPassiveScores =
        Object.keys(statisticsConfig?.statistics?.passiveScores ?? {}).length >
        0;
      const finalConfig =
        statisticsConfig && (hasResources || hasPassiveScores)
          ? serializeStatBlockStatistics(statisticsConfig)
          : trimmedConfig || '{}';

      await onSubmit({
        world_id: worldId,
        ...(campaignId != null ? { campaign_id: campaignId } : {}),
        name: trimmedName,
        description: description.trim() || undefined,
        config: finalConfig,
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="statblock-name"
          className="block text-sm font-medium text-slate-800"
        >
          Name
        </label>
        <input
          id="statblock-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter statblock name"
          autoFocus
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="statblock-description"
          className="block text-sm font-medium text-slate-800"
        >
          Description (optional)
        </label>
        <textarea
          id="statblock-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Optional lore or notes"
          disabled={isSubmitting}
        />
      </div>

      {/* Resource Statistics Section */}
      {worldResources.length > 0 && statisticsConfig ? (
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Resources</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {worldResources.map((resource) => (
              <ResourceStatisticInput
                key={resource.id}
                definition={resource}
                value={getResourceValue(statisticsConfig, resource.id)}
                onChange={(value) => {
                  setStatisticsConfig((prev) =>
                    prev ? setResourceValue(prev, resource.id, value) : prev,
                  );
                }}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Passive Scores Section */}
      {worldPassiveScores.length > 0 && statisticsConfig ? (
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Passive Scores
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {worldPassiveScores.map((passiveScore) => (
              <PassiveScoreInput
                key={passiveScore.id}
                definition={passiveScore}
                value={getPassiveScoreValue(statisticsConfig, passiveScore.id)}
                onChange={(value) => {
                  setStatisticsConfig((prev) =>
                    prev
                      ? setPassiveScoreValue(prev, passiveScore.id, value)
                      : prev,
                  );
                }}
                disabled={isSubmitting}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="statblock-config"
          className="block text-sm font-medium text-slate-800"
        >
          Config (JSON)
        </label>
        <textarea
          id="statblock-config"
          value={config}
          onChange={(event) => handleConfigChange(event.target.value)}
          className={`min-h-24 w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:ring-2 focus:ring-slate-200 ${configError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-slate-500'}`}
          placeholder="{}"
          disabled={isSubmitting}
          rows={6}
        />
        {configError ? (
          <p className="text-xs text-rose-600">{configError}</p>
        ) : null}
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
