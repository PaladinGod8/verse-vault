import { closestCenter, DndContext, type DragEndEvent, type SensorDescriptor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableActRow from './SortableActRow';

type ActsListSectionProps = {
  isLoading: boolean;
  error: string | null;
  reorderError: string | null;
  acts: Act[];
  sortedActs: Act[];
  sensors: SensorDescriptor<unknown>[];
  worldId: number | null;
  campaignId: number | null;
  arcId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (act: Act) => void;
  onDelete: (act: Act) => void;
  onMove: (act: Act) => void;
};

export default function ActsListSection({
  isLoading,
  error,
  reorderError,
  acts,
  sortedActs,
  sensors,
  worldId,
  campaignId,
  arcId,
  deletingId,
  isPersistingOrder,
  onDragEnd,
  onEdit,
  onDelete,
  onMove,
}: ActsListSectionProps) {
  if (isLoading) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
        Loading acts...
      </section>
    );
  }

  if (error) {
    return (
      <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
        {error}
      </section>
    );
  }

  return (
    <>
      {reorderError
        ? (
          <section className='rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm'>
            {reorderError}
          </section>
        )
        : null}

      {acts.length === 0
        ? (
          <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
            <p className='text-sm text-slate-600'>No acts yet.</p>
          </section>
        )
        : (
          <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <table className='w-full text-sm text-slate-700'>
                <thead>
                  <tr className='border-b border-slate-200'>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Order</th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Name</th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={sortedActs.map((act) => act.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedActs.map((act, index) => (
                      <SortableActRow
                        key={act.id}
                        act={act}
                        sequence={index + 1}
                        worldId={worldId}
                        campaignId={campaignId}
                        arcId={arcId}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onMove={onMove}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </section>
        )}
    </>
  );
}
