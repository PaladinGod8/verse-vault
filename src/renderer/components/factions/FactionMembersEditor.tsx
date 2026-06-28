import { useState } from 'react';
import CharacterCombobox from './CharacterCombobox';
import type { FactionMemberFormValue } from './FactionForm';

type FactionMembersEditorProps = {
  members: FactionMemberFormValue[];
  worldId: number;
  onChange: (members: FactionMemberFormValue[]) => void;
  disabled?: boolean;
};

const MEMBERS_PER_PAGE = 10;

export default function FactionMembersEditor({
  members,
  worldId,
  onChange,
  disabled = false,
}: FactionMembersEditorProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * MEMBERS_PER_PAGE;
  const visibleMembers = members.slice(pageStart, pageStart + MEMBERS_PER_PAGE);

  return (
    <fieldset className='space-y-3 border-t border-slate-200 pt-4'>
      <legend className='text-sm font-semibold text-slate-900'>
        Members, Founders &amp; Leadership
      </legend>
      <div className='space-y-2'>
        {visibleMembers.map((member, localIndex) => {
          const index = pageStart + localIndex;
          return (
            <div key={index} className='flex items-center gap-2'>
              <CharacterCombobox
                worldId={worldId}
                value={member.character_id}
                excludeCharacterIds={members
                  .filter((_, i) => i !== index)
                  .map((m) => m.character_id)
                  .filter((id) => id !== 0)}
                onChange={(characterId) => {
                  const next = [...members];
                  next[index] = { ...next[index], character_id: characterId };
                  onChange(next);
                }}
                disabled={disabled}
              />
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
          );
        })}
      </div>
      {totalPages > 1
        ? (
          <div className='flex items-center justify-between text-xs text-slate-600'>
            <button
              type='button'
              aria-label='Previous page'
              className='font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40'
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={disabled || currentPage === 0}
            >
              Previous
            </button>
            <span>Page {currentPage + 1} of {totalPages}</span>
            <button
              type='button'
              aria-label='Next page'
              className='font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40'
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={disabled || currentPage >= totalPages - 1}
            >
              Next
            </button>
          </div>
        )
        : null}
      <button
        type='button'
        className='text-xs font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
        onClick={() => {
          onChange([...members, { character_id: 0, role: 'member' }]);
          setPage(Math.floor(members.length / MEMBERS_PER_PAGE));
        }}
        disabled={disabled}
      >
        Add Member
      </button>
    </fieldset>
  );
}
