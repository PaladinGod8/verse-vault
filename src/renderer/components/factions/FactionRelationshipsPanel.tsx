import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FactionRelationshipView } from '../../../shared/contracts/dbApiPayloads';
import { useFactionRelationships } from '../../hooks/useFactionRelationships';
import ConfirmDialog from '../ui/ConfirmDialog';
import ModalShell from '../ui/ModalShell';
import { useToast } from '../ui/ToastProvider';
import FactionRelationshipForm, {
  type FactionRelationshipFormValues,
} from './FactionRelationshipForm';

type FactionRelationshipsPanelProps = {
  factionId: number;
  worldId: number;
  allFactionsInWorld: Faction[];
};

export default function FactionRelationshipsPanel({
  factionId,
  worldId,
  allFactionsInWorld,
}: FactionRelationshipsPanelProps) {
  const toast = useToast();
  const { relationships, isSaving, addRelationship, updateRelationship, deleteRelationship } =
    useFactionRelationships({ factionId, toast });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<FactionRelationshipView | null>(
    null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const titleId = useId();

  const openAddModal = () => {
    setEditingRelationship(null);
    setIsModalOpen(true);
  };

  const openEditModal = (relationship: FactionRelationshipView) => {
    setEditingRelationship(relationship);
    setIsModalOpen(true);
  };

  const handleSave = async (data: FactionRelationshipFormValues) => {
    // The form's faction_label/related_label are always "subject/counterpart" from the
    // viewed faction's perspective. The DB's faction_label/related_label are pinned to
    // whichever id landed in faction_id vs related_faction_id when the row was first
    // created, which may be the counterpart, not the viewed faction - so an edit must
    // reorient the two labels onto the correct DB column instead of passing them through.
    const ok = editingRelationship
      ? await updateRelationship(
        editingRelationship.id,
        editingRelationship.faction_id === factionId
          ? { faction_label: data.faction_label, related_label: data.related_label }
          : { faction_label: data.related_label, related_label: data.faction_label },
      )
      : await addRelationship({
        faction_id: factionId,
        related_faction_id: data.related_faction_id,
        faction_label: data.faction_label,
        related_label: data.related_label,
      });
    if (ok) {
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      <h2 className='text-sm font-semibold text-slate-900'>Faction Relationships</h2>
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
                    to={`/world/${worldId}/factions/${relationship.counterpart_id}`}
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
            <FactionRelationshipForm
              factionId={factionId}
              allFactionsInWorld={allFactionsInWorld}
              initialValues={editingRelationship
                ? {
                  related_faction_id: editingRelationship.counterpart_id,
                  faction_label: editingRelationship.subject_label,
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
        message='This will remove the relationship for both factions.'
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
