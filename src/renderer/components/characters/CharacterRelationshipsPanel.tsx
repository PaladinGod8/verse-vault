import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CharacterRelationshipView } from '../../../shared/contracts/dbApiPayloads';
import { useCharacterRelationships } from '../../hooks/useCharacterRelationships';
import ConfirmDialog from '../ui/ConfirmDialog';
import ModalShell from '../ui/ModalShell';
import { useToast } from '../ui/ToastProvider';
import CharacterRelationshipForm, {
  type CharacterRelationshipFormValues,
} from './CharacterRelationshipForm';

type CharacterRelationshipsPanelProps = {
  characterId: number;
  worldId: number | null;
};

export default function CharacterRelationshipsPanel({
  characterId,
  worldId,
}: CharacterRelationshipsPanelProps) {
  const toast = useToast();
  const { relationships, isSaving, addRelationship, updateRelationship, deleteRelationship } =
    useCharacterRelationships({ characterId, toast });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<
    CharacterRelationshipView | null
  >(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const titleId = useId();

  if (worldId === null) {
    return null;
  }

  const openAddModal = () => {
    setEditingRelationship(null);
    setIsModalOpen(true);
  };

  const openEditModal = (relationship: CharacterRelationshipView) => {
    setEditingRelationship(relationship);
    setIsModalOpen(true);
  };

  const handleSave = async (data: CharacterRelationshipFormValues) => {
    // The form's character_label/related_label are always "subject/counterpart" from the
    // viewed character's perspective. The DB's character_label/related_label are pinned to
    // whichever id landed in character_id vs related_character_id when the row was first
    // created, which may be the counterpart, not the viewed character - so an edit must
    // reorient the two labels onto the correct DB column instead of passing them through.
    const ok = editingRelationship
      ? await updateRelationship(
        editingRelationship.id,
        editingRelationship.character_id === characterId
          ? { character_label: data.character_label, related_label: data.related_label }
          : { character_label: data.related_label, related_label: data.character_label },
      )
      : await addRelationship({
        character_id: characterId,
        related_character_id: data.related_character_id,
        character_label: data.character_label,
        related_label: data.related_label,
      });
    if (ok) {
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      <h2 className='text-sm font-semibold text-slate-900'>Character Relationships</h2>
      {relationships.length === 0
        ? <p className='mt-1 text-sm text-slate-500'>No tracked relationships yet.</p>
        : (
          <ul className='mt-2 space-y-1'>
            {relationships.map((relationship) => (
              <li
                key={relationship.id}
                className='flex items-center justify-between gap-2 text-sm text-slate-700'
              >
                <span>
                  <Link
                    to={`/world/${worldId}/characters/${relationship.counterpart_id}`}
                    className='font-medium text-slate-900 hover:underline'
                  >
                    {relationship.counterpart_name}
                  </Link>{' '}
                  <span className='text-slate-500'>({relationship.subject_label})</span>
                </span>
                <span className='flex gap-2'>
                  <button
                    type='button'
                    className='text-xs font-medium text-slate-600 hover:text-slate-900'
                    onClick={() => openEditModal(relationship)}
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    className='text-xs font-medium text-rose-600 hover:text-rose-700'
                    onClick={() => setPendingDeleteId(relationship.id)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      <button
        type='button'
        className='mt-2 text-xs font-medium text-slate-700 hover:text-slate-900'
        onClick={openAddModal}
      >
        Add Relationship
      </button>

      {isModalOpen
        ? (
          <ModalShell
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            labelledBy={titleId}
            boxClassName='max-w-lg'
          >
            <h2 id={titleId} className='mb-4 text-lg font-semibold text-slate-900'>
              {editingRelationship ? 'Edit Relationship' : 'Add Relationship'}
            </h2>
            <CharacterRelationshipForm
              worldId={worldId}
              characterId={characterId}
              initialValues={editingRelationship
                ? {
                  related_character_id: editingRelationship.counterpart_id,
                  character_label: editingRelationship.subject_label,
                  related_label: editingRelationship.counterpart_label,
                }
                : undefined}
              onSave={handleSave}
              onClose={() => setIsModalOpen(false)}
              isSaving={isSaving}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title='Remove relationship'
        message='This will remove the relationship for both characters.'
        confirmLabel='Remove'
        onConfirm={async () => {
          if (pendingDeleteId !== null) {
            await deleteRelationship(pendingDeleteId);
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
