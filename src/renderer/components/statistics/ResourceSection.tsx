import type { ResourceStatisticDefinition } from '../../../shared/statisticsTypes';
import ConfirmDialog from '../ui/ConfirmDialog';
import ModalShell from '../ui/ModalShell';
import ResourceDefinitionForm from './ResourceDefinitionForm';

type ResourceSectionProps = {
  resources: ResourceStatisticDefinition[];
  isCreateOpen: boolean;
  onCreateOpen: () => void;
  onCreateClose: () => void;
  onCreateSubmit: (data: ResourceStatisticDefinition) => Promise<void>;
  editingResource: ResourceStatisticDefinition | null;
  onEditOpen: (resource: ResourceStatisticDefinition) => void;
  onEditClose: () => void;
  onEditSubmit: (data: ResourceStatisticDefinition) => Promise<void>;
  pendingDelete: ResourceStatisticDefinition | null;
  onDeleteRequest: (resource: ResourceStatisticDefinition) => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  isDeleting: boolean;
};

export default function ResourceSection({
  resources,
  isCreateOpen,
  onCreateOpen,
  onCreateClose,
  onCreateSubmit,
  editingResource,
  onEditOpen,
  onEditClose,
  onEditSubmit,
  pendingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: ResourceSectionProps) {
  return (
    <>
      <section>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-slate-900'>
            Primary Resources
          </h2>
          <button
            onClick={onCreateOpen}
            className='rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700'
          >
            Add Resource
          </button>
        </div>

        {resources.length === 0
          ? (
            <p className='text-sm text-slate-600'>
              No resources defined yet. Add your first resource to get started.
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
                      Default
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-slate-700'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200'>
                  {resources.map((resource) => (
                    <tr key={resource.id} className='hover:bg-slate-50'>
                      <td className='px-4 py-2 text-sm text-slate-900'>
                        {resource.id}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-900'>
                        {resource.name}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-700'>
                        {resource.abbreviation}
                      </td>
                      <td className='px-4 py-2 text-sm text-slate-700'>
                        {resource.isDefault ? 'Yes' : 'No'}
                      </td>
                      <td className='px-4 py-2 text-sm'>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => onEditOpen(resource)}
                            className='text-blue-600 hover:text-blue-800'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteRequest(resource)}
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
            labelledBy='create-resource-title'
            boxClassName='max-w-lg'
          >
            <h2
              id='create-resource-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Create Resource
            </h2>
            <ResourceDefinitionForm
              mode='create'
              existingIds={resources.map((r) => r.id)}
              onSubmit={onCreateSubmit}
              onCancel={onCreateClose}
            />
          </ModalShell>
        )
        : null}

      {editingResource
        ? (
          <ModalShell
            isOpen={editingResource !== null}
            onClose={onEditClose}
            labelledBy='edit-resource-title'
            boxClassName='max-w-lg'
          >
            <h2
              id='edit-resource-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Resource
            </h2>
            <ResourceDefinitionForm
              mode='edit'
              initialValues={editingResource}
              existingIds={resources.map((r) => r.id)}
              onSubmit={onEditSubmit}
              onCancel={onEditClose}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        message='This will remove the resource definition. Existing statblock data will not be affected.'
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
        confirmLabel='Delete'
        isConfirming={isDeleting}
      />
    </>
  );
}
