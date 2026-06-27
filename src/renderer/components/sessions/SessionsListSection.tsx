import { closestCenter, DndContext, type DragEndEvent, type SensorDescriptor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSessionRow from './SortableSessionRow';

type SessionsListSectionProps = {
  isLoading: boolean;
  error: string | null;
  reorderError: string | null;
  sessions: Session[];
  sortedSessions: Session[];
  sensors: SensorDescriptor<unknown>[];
  worldId: number | null;
  campaignId: number | null;
  arcId: number | null;
  actId: number | null;
  deletingId: number | null;
  isPersistingOrder: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (session: Session) => void;
  onDelete: (session: Session) => void;
  onMove: (session: Session) => void;
};

export default function SessionsListSection({
  isLoading,
  error,
  reorderError,
  sessions,
  sortedSessions,
  sensors,
  worldId,
  campaignId,
  arcId,
  actId,
  deletingId,
  isPersistingOrder,
  onDragEnd,
  onEdit,
  onDelete,
  onMove,
}: SessionsListSectionProps) {
  if (isLoading) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
        Loading sessions...
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

      {sessions.length === 0
        ? (
          <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
            <p className='text-sm text-slate-600'>No sessions yet.</p>
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
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Notes</th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Planned</th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={sortedSessions.map((session) => session.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedSessions.map((session, index) => (
                      <SortableSessionRow
                        key={session.id}
                        session={session}
                        sequence={index + 1}
                        worldId={worldId}
                        campaignId={campaignId}
                        arcId={arcId}
                        actId={actId}
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
