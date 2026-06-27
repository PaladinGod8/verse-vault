import { useId } from 'react';
import type { WikiSummaryFieldDef } from '../../lib/characterWikiSummaryFieldConfig';

type CharacterWikiSummaryGroupFieldsProps = {
  legend: string;
  fields: WikiSummaryFieldDef[];
  values: Record<string, string | null | undefined>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

export default function CharacterWikiSummaryGroupFields({
  legend,
  fields,
  values,
  onChange,
  disabled = false,
}: CharacterWikiSummaryGroupFieldsProps) {
  const idPrefix = useId();

  return (
    <fieldset className='space-y-3'>
      <legend className='text-sm font-semibold text-slate-800'>{legend}</legend>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {fields.map((field) => {
          const inputId = `${idPrefix}-${field.key}`;
          return (
            <div key={field.key}>
              <label
                htmlFor={inputId}
                className='mb-1 block text-xs font-medium text-slate-600'
              >
                {field.label}
              </label>
              <input
                id={inputId}
                type='text'
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                className='w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
