import { useId, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import ModalShell from '../ui/ModalShell';

type ManageFactionTypesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  factionTypes: FactionType[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function ManageFactionTypesModal({
  isOpen,
  onClose,
  factionTypes,
  onAdd,
  onRename,
  onDelete,
}: ManageFactionTypesModalProps) {
  const titleId = useId();
  const [newTypeName, setNewTypeName] = useState('');
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const nameFor = (type: FactionType) => editedNames[type.id] ?? type.name;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} labelledBy={titleId} boxClassName='max-w-lg'>
      <h2 id={titleId} className='mb-4 text-lg font-semibold text-slate-900'>
        Manage Faction Types
      </h2>

      <ul className='space-y-2'>
        {factionTypes.map((type) => (
          <li key={type.id} className='flex items-center gap-2'>
            <input
              type='text'
              value={nameFor(type)}
              onChange={(e) => setEditedNames({ ...editedNames, [type.id]: e.target.value })}
              className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
            />
            <button
              type='button'
              className='rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
              onClick={() => void onRename(type.id, nameFor(type).trim())}
            >
              Save
            </button>
            <button
              type='button'
              className='rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50'
              onClick={() => setPendingDeleteId(type.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className='mt-4 flex items-center gap-2'>
        <label htmlFor='new-faction-type-name' className='sr-only'>New type name</label>
        <input
          id='new-faction-type-name'
          aria-label='New type name'
          type='text'
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder='New type name'
          className='flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />
        <button
          type='button'
          className='rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={!newTypeName.trim()}
          onClick={() => {
            void onAdd(newTypeName.trim());
            setNewTypeName('');
          }}
        >
          Add Type
        </button>
      </div>

      <div className='mt-6 flex justify-end'>
        <button type='button' className='btn btn-ghost' onClick={onClose}>
          Close
        </button>
      </div>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title='Delete this faction type?'
        message='Factions using this type will become Uncategorized. This cannot be undone.'
        confirmLabel='Delete'
        onConfirm={() => {
          if (pendingDeleteId !== null) {
            void onDelete(pendingDeleteId);
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </ModalShell>
  );
}
