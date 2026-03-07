import { useEffect, useState } from 'react';
import type {
  ResourceStatisticDefinition,
  StatBlockResourceValue,
} from '../../../shared/statisticsTypes';
import { clampResourceValue, isResourceValueValid } from '../../lib/statisticsCalculations';

type Props = {
  definition: ResourceStatisticDefinition;
  value: StatBlockResourceValue | null;
  onChange: (value: StatBlockResourceValue) => void;
  disabled?: boolean;
};

export default function ResourceStatisticInput({
  definition,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [current, setCurrent] = useState(value?.current ?? 0);
  const [maximum, setMaximum] = useState(value?.maximum ?? 0);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(value?.current ?? 0);
    setMaximum(value?.maximum ?? 0);
  }, [value]);

  const handleCurrentChange = (newCurrent: number) => {
    setCurrent(newCurrent);

    if (!isResourceValueValid(newCurrent, maximum)) {
      setValidationError('Current cannot exceed maximum');
    } else {
      setValidationError(null);
      onChange({ current: newCurrent, maximum });
    }
  };

  const handleMaximumChange = (newMaximum: number) => {
    setMaximum(newMaximum);

    const clampedCurrent = clampResourceValue(current, newMaximum);
    setCurrent(clampedCurrent);
    setValidationError(null);
    onChange({ current: clampedCurrent, maximum: newMaximum });
  };

  return (
    <div className='space-y-2'>
      <label className='block text-sm font-medium text-slate-700'>
        {definition.name} ({definition.abbreviation})
      </label>
      {definition.description
        ? <p className='text-xs text-slate-500'>{definition.description}</p>
        : null}

      <div className='flex gap-2'>
        <div className='flex-1'>
          <label
            htmlFor={`${definition.id}-current`}
            className='mb-1 block text-xs text-slate-600'
          >
            Current
          </label>
          <input
            type='number'
            id={`${definition.id}-current`}
            value={current}
            onChange={(e) => handleCurrentChange(Number(e.target.value))}
            disabled={disabled}
            min={0}
            className='w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50'
          />
        </div>
        <div className='flex items-end pb-1'>
          <span className='text-slate-400'>/</span>
        </div>
        <div className='flex-1'>
          <label
            htmlFor={`${definition.id}-maximum`}
            className='mb-1 block text-xs text-slate-600'
          >
            Maximum
          </label>
          <input
            type='number'
            id={`${definition.id}-maximum`}
            value={maximum}
            onChange={(e) => handleMaximumChange(Number(e.target.value))}
            disabled={disabled}
            min={0}
            className='w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50'
          />
        </div>
      </div>

      {validationError ? <p className='text-xs text-red-600'>{validationError}</p> : null}
    </div>
  );
}
