import type { FactionSections } from '../../../shared/contracts/factionTypes';
import RichTextEditor from '../ui/RichTextEditor';

const SECTION_FIELDS: Array<{ key: keyof FactionSections; label: string; }> = [
  { key: 'history', label: 'History' },
  { key: 'goalsMotives', label: 'Goals/Motives' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'notes', label: 'Notes' },
];

type FactionSectionsEditorProps = {
  sections: FactionSections;
  onChange: (sections: FactionSections) => void;
  disabled?: boolean;
};

export default function FactionSectionsEditor({
  sections,
  onChange,
  disabled = false,
}: FactionSectionsEditorProps) {
  return (
    <fieldset className='space-y-3'>
      <legend className='text-sm font-semibold text-slate-800'>Sections</legend>
      {SECTION_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label
            htmlFor={`faction-section-${key}`}
            className='mb-1 block text-xs font-medium text-slate-600'
          >
            {label}
          </label>
          <RichTextEditor
            id={`faction-section-${key}`}
            value={sections[key] ?? ''}
            onChange={(md) => onChange({ ...sections, [key]: md })}
            variant='full'
            editable={!disabled}
            aria-label={label}
          />
        </div>
      ))}
    </fieldset>
  );
}
