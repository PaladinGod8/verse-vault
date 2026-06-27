import type { FactionMemberFormValue } from './FactionForm';

type FactionMembersEditorProps = {
  members: FactionMemberFormValue[];
  charactersInWorld: Character[];
  onChange: (members: FactionMemberFormValue[]) => void;
  disabled?: boolean;
};

export default function FactionMembersEditor({
  members,
  charactersInWorld,
  onChange,
  disabled = false,
}: FactionMembersEditorProps) {
  return (
    <fieldset className='space-y-3 border-t border-slate-200 pt-4'>
      <legend className='text-sm font-semibold text-slate-900'>
        Members, Founders &amp; Leadership
      </legend>
      <div className='space-y-2'>
        {members.map((member, index) => (
          <div key={index} className='flex items-center gap-2'>
            <select
              aria-label='Member character'
              value={member.character_id || ''}
              onChange={(e) => {
                const next = [...members];
                next[index] = { ...next[index], character_id: Number(e.target.value) };
                onChange(next);
              }}
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            >
              <option value=''>Select a character...</option>
              {charactersInWorld.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>
            <input
              aria-label='Member role'
              type='text'
              value={member.role}
              onChange={(e) => {
                const next = [...members];
                next[index] = { ...next[index], role: e.target.value };
                onChange(next);
              }}
              placeholder="member, founder, or a title like 'President'"
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
              disabled={disabled}
            />
            <button
              type='button'
              aria-label='Remove member'
              className='text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={() => onChange(members.filter((_, i) => i !== index))}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type='button'
        className='text-xs font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
        onClick={() => onChange([...members, { character_id: 0, role: 'member' }])}
        disabled={disabled}
      >
        Add Member
      </button>
    </fieldset>
  );
}
