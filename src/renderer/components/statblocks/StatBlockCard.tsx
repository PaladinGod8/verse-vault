import { useState, useEffect } from 'react';
import type { StatBlockStatisticsConfig } from '../../../shared/statisticsTypes';
import {
  parseStatBlockStatistics,
  getResourceValue,
  getPassiveScoreValue,
} from '../../lib/statblockStatisticsUtils';
import { formatModifier } from '../../lib/statisticsCalculations';

interface StatBlockCardProps {
  statBlock: StatBlock;
  onEdit: (sb: StatBlock) => void;
  onDelete: (id: number) => void;
}

export default function StatBlockCard({
  statBlock,
  onEdit,
  onDelete,
}: StatBlockCardProps) {
  const [statistics, setStatistics] =
    useState<StatBlockStatisticsConfig | null>(null);

  // Parse statistics config
  useEffect(() => {
    if (statBlock.config) {
      try {
        setStatistics(parseStatBlockStatistics(statBlock.config));
      } catch {
        setStatistics(null);
      }
    }
  }, [statBlock.config]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">
            {statBlock.name}
          </h2>
          {statBlock.description ? (
            <p className="text-sm text-slate-500">{statBlock.description}</p>
          ) : null}
          {statBlock.default_token_id !== null ? (
            <p className="text-xs text-slate-400">
              Token ID: {statBlock.default_token_id}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => onEdit(statBlock)}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(statBlock.id)}
            className="text-sm font-medium text-rose-600 transition hover:text-rose-800"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && statistics.resources && statistics.resources.length > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap gap-3">
            {statistics.resources.slice(0, 3).map((resource) => {
              // Show first 3 resources only (typically HP, MP, AC)
              const value = getResourceValue(statistics, resource.id);
              if (!value) return null;

              return (
                <div
                  key={resource.id}
                  className="flex items-baseline gap-1 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {resource.abbreviation}:
                  </span>
                  <span className="text-slate-900">
                    {value.current}/{value.maximum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Show passive scores if present */}
          {statistics.passiveScores && statistics.passiveScores.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {statistics.passiveScores.map((score) => {
                const value = getPassiveScoreValue(statistics, score.id);
                if (!value) return null;

                const modifier =
                  score.type === 'ability_score' &&
                  value.abilityModifier !== undefined
                    ? formatModifier(value.abilityModifier)
                    : null;

                return (
                  <div
                    key={score.id}
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs"
                  >
                    <span className="font-semibold text-slate-700">
                      {score.abbreviation}
                    </span>
                    <span className="ml-1 text-slate-600">
                      {value.baseValue}
                    </span>
                    {modifier ? (
                      <span className="ml-1 text-slate-500">({modifier})</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
