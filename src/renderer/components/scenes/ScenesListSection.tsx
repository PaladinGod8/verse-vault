import { closestCenter, DndContext, type DragEndEvent, type SensorDescriptor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSceneRow from './SortableSceneRow';

type ScenesListSectionProps = {
  isLoading: boolean;
  error: string | null;
  reorderError: string | null;
  scenes: Scene[];
  sortedScenes: Scene[];
  sensors: SensorDescriptor<unknown>[];
  deletingId: number | null;
  isPersistingOrder: boolean;
  worldId: number | null;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (scene: Scene) => void;
  onMove: (scene: Scene) => void;
  onDelete: (scene: Scene) => void;
};

export default function ScenesListSection({
  isLoading,
  error,
  reorderError,
  scenes,
  sortedScenes,
  sensors,
  deletingId,
  isPersistingOrder,
  worldId,
  onDragEnd,
  onEdit,
  onMove,
  onDelete,
}: ScenesListSectionProps) {
  if (isLoading) {
    return (
      <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
        Loading scenes...
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

      {scenes.length === 0
        ? (
          <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
            <p className='text-sm text-slate-600'>No scenes yet.</p>
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
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={sortedScenes.map((scene) => scene.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {sortedScenes.map((scene, index) => (
                      <SortableSceneRow
                        key={scene.id}
                        scene={scene}
                        sequence={index + 1}
                        deletingId={deletingId}
                        isPersistingOrder={isPersistingOrder}
                        worldId={worldId}
                        onEdit={onEdit}
                        onMove={onMove}
                        onDelete={onDelete}
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
