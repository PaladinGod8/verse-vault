import { useState, useEffect } from 'react';
import type {
  PassiveScoreDefinition,
  StatBlockPassiveScoreValue,
} from '../../../shared/statisticsTypes';
import {
  calculateAbilityModifier,
  calculateSaveModifier,
  formatModifier,
} from '../../lib/statisticsCalculations';

type Props = {
  definition: PassiveScoreDefinition;
  value: StatBlockPassiveScoreValue | null;
  onChange: (value: StatBlockPassiveScoreValue) => void;
  disabled?: boolean;
};

export default function PassiveScoreInput({
  definition,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [baseValue, setBaseValue] = useState(value?.baseValue ?? 10);

  useEffect(() => {
    setBaseValue(value?.baseValue ?? 10);
  }, [value]);

  const handleBaseValueChange = (newBaseValue: number) => {
    setBaseValue(newBaseValue);

    const updatedValue: StatBlockPassiveScoreValue = {
      baseValue: newBaseValue,
    };

    // Calculate modifiers for ability scores
    if (definition.type === 'ability_score') {
      const abilityModifier = calculateAbilityModifier(newBaseValue);
      updatedValue.abilityModifier = abilityModifier;

      // Save DC defaults to base value but can be overridden
      const saveDC = value?.saveDC ?? newBaseValue;
      updatedValue.saveDC = saveDC;
      updatedValue.saveModifier = calculateSaveModifier(saveDC);
    }

    onChange(updatedValue);
  };

  const isAbilityScore = definition.type === 'ability_score';
  const abilityModifier = isAbilityScore
    ? calculateAbilityModifier(baseValue)
    : null;
  const saveModifier =
    isAbilityScore && value?.saveDC
      ? calculateSaveModifier(value.saveDC)
      : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {definition.name} ({definition.abbreviation})
      </label>
      {definition.description ? (
        <p className="text-xs text-slate-500">{definition.description}</p>
      ) : null}

      <div className="flex gap-2">
        <div className="flex-1">
          <label
            htmlFor={`${definition.id}-base`}
            className="mb-1 block text-xs text-slate-600"
          >
            Base Value
          </label>
          <input
            type="number"
            id={`${definition.id}-base`}
            value={baseValue}
            onChange={(e) => handleBaseValueChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50"
          />
        </div>

        {isAbilityScore && abilityModifier !== null ? (
          <>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-slate-600">
                Ability Modifier
              </label>
              <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-medium text-slate-700">
                {formatModifier(abilityModifier)}
              </div>
            </div>

            {saveModifier !== null ? (
              <div className="flex-1">
                <label className="mb-1 block text-xs text-slate-600">
                  Save Modifier
                </label>
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-medium text-slate-700">
                  {formatModifier(saveModifier)}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {isAbilityScore ? (
        <p className="text-xs text-slate-500">
          Modifier formula: floor((base - 10) / 2)
        </p>
      ) : null}
    </div>
  );
}
