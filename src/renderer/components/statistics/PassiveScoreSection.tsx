import type { PassiveScoreDefinition } from '../../../shared/statisticsTypes';
import ConfirmDialog from '../ui/ConfirmDialog';
import ModalShell from '../ui/ModalShell';
import PassiveScoreDefinitionForm from './PassiveScoreDefinitionForm';

type PassiveScoreSectionProps = {
  passiveScores: PassiveScoreDefinition[];
  isCreateOpen: boolean;
  onCreateOpen: () => void;
  onCreateClose: () => void;
  onCreateSubmit: (data: PassiveScoreDefinition) => Promise<void>;
  editingPassiveScore: PassiveScoreDefinition | null;
  onEditOpen: (passiveScore: PassiveScoreDefinition) => void;
  onEditClose: () => void;
  onEditSubmit: (data: PassiveScoreDefinition) => Promise<void>;
  pendingDelete: PassiveScoreDefinition | null;
  onDeleteRequest: (passiveScore: PassiveScoreDefinition) => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  isDeleting: boolean;
};

function formatPassiveScoreType(type: PassiveScoreDefinition['type']): string {
  if (type === 'ability_score') {
    return 'Ability';
  }
  if (type === 'proficiency_bonus') {
    return 'PB';
  }
  return 'Custom';
}

export default function PassiveScoreSection({
  passiveScores,
  isCreateOpen,
  onCreateOpen,
  onCreateClose,
  onCreateSubmit,
  editingPassiveScore,
  onEditOpen,
  onEditClose,
  onEditSubmit,
  pendingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: PassiveScoreSectionProps) {
  return (
    <>
      <section>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>
            Core Ability Scores & Passive Scores
          </h2>
          <button
            onClick={onCreateOpen}
            className='rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700'
          >
            Add Passive Score
          </button>
        </div>

        {passiveScores.length === 0
          ? (
            <p className='text-sm text-slate-600'>
              No passive scores defined yet. Add your first passive score to get started.
            </p>
          )
          : (
            <div className='overflow-hidden rounded-lg border border-slate-200'>
              <table className='w-full'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      ID
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Name
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Abbreviation
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Type
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Default
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200'>
                  {passiveScores.map((ps) => (
                    <tr key={ps.id} className='hover:bg-slate-50'>
                      <td className='px-4 py-2 text-sm text-slate-900'>
                        {ps.id}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-900'>
                        {ps.name}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-700'>
                        {ps.abbreviation}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-700'>
                        {formatPassiveScoreType(ps.type)}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-700'>
                        {ps.isDefault ? 'Yes' : 'No'}
                      </td>
                      <td className='px-4 py-2 text-sm'>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => onEditOpen(ps)}
                            className='text-blue-600 hover:text-blue-800'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteRequest(ps)}
                            className='text-red-600 hover:text-red-800'
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {isCreateOpen
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={onCreateClose}
            labelledBy='create-passive-score-title'
            boxClassName='max-w-lg'
          >
            <h2
              id='create-passive-score-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Create Passive Score
            </h2>
            <PassiveScoreDefinitionForm
              mode='create'
              existingIds={passiveScores.map((ps) => ps.id)}
              onSubmit={onCreateSubmit}
              onCancel={onCreateClose}
            />
          </ModalShell>
        )
        : null}

      {editingPassiveScore
        ? (
          <ModalShell
            isOpen={editingPassiveScore !== null}
            onClose={onEditClose}
            labelledBy='edit-passive-score-title'
            boxClassName='max-w-lg'
          >
            <h2
              id='edit-passive-score-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Passive Score
            </h2>
            <PassiveScoreDefinitionForm
              mode='edit'
              initialValues={editingPassiveScore}
              existingIds={passiveScores.map((ps) => ps.id)}
              onSubmit={onEditSubmit}
              onCancel={onEditClose}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message='This will remove the passive score definition. Existing statblock data will not be affected.'
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
        confirmLabel='Delete'
        isConfirming={isDeleting}
      />
    </>
  );
}
