import { useEffect, useState } from 'react';

type Props = {
  act: Act;
  currentArcId: number;
  campaignId: number;
  onConfirm: (newArcId: number) => void;
  onCancel: () => void;
};

export default function MoveActDialog({
  act,
  currentArcId,
  campaignId,
  onConfirm,
  onCancel,
}: Props) {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [selectedArcId, setSelectedArcId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const allArcs = await window.db.arcs.getAllByCampaign(campaignId);
        setArcs(allArcs.filter((a) => a.id !== currentArcId));
      } catch {
        setError('Failed to load arcs.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [campaignId, currentArcId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Move &ldquo;{act.name}&rdquo; to Arc
        </h2>

        {loading && <p className="text-sm text-slate-500">Loading arcs…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && arcs.length === 0 && (
          <p className="text-sm text-slate-500">
            No other Arcs available in this Campaign.
          </p>
        )}

        {!loading && !error && arcs.length > 0 && (
          <div className="mb-4 max-h-64 overflow-y-auto rounded border border-slate-200">
            {arcs.map((arc) => (
              <label
                key={arc.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="target-arc"
                  value={arc.id}
                  checked={selectedArcId === arc.id}
                  onChange={() => setSelectedArcId(arc.id)}
                  className="accent-slate-800"
                />
                <span className="text-sm text-slate-700">{arc.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedArcId === null || loading}
            onClick={() => selectedArcId !== null && onConfirm(selectedArcId)}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
