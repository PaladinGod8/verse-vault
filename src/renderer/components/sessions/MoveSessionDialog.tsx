import { useEffect, useState } from 'react';
import ModalShell from '../ui/ModalShell';

type ActWithArcName = Act & { arc_name: string };

type Props = {
  session: Session;
  currentActId: number;
  campaignId: number;
  onConfirm: (newActId: number) => void;
  onCancel: () => void;
};

export default function MoveSessionDialog({
  session,
  currentActId,
  campaignId,
  onConfirm,
  onCancel,
}: Props) {
  const [actsWithArc, setActsWithArc] = useState<ActWithArcName[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [selectedActId, setSelectedActId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [allArcs, allActs] = await Promise.all([
          window.db.arcs.getAllByCampaign(campaignId),
          window.db.acts.getAllByCampaign(campaignId),
        ]);
        setArcs(allArcs);
        const arcMap = new Map(allArcs.map((a) => [a.id, a.name]));
        setActsWithArc(
          allActs.map((act) => ({
            ...act,
            arc_name: arcMap.get(act.arc_id) ?? 'Unknown Arc',
          })),
        );
      } catch {
        setError('Failed to load acts.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [campaignId]);

  const grouped = arcs
    .map((arc) => ({
      arc,
      acts: actsWithArc.filter(
        (act) => act.arc_id === arc.id && act.id !== currentActId,
      ),
    }))
    .filter((g) => g.acts.length > 0);

  return (
    <ModalShell
      isOpen
      onClose={onCancel}
      labelledBy="move-session-title"
      boxClassName="max-w-md"
    >
      <h2
        id="move-session-title"
        className="mb-4 text-lg font-semibold text-slate-800"
      >
        Move &ldquo;{session.name}&rdquo; to Act
      </h2>

      {loading && <p className="text-sm text-slate-500">Loading acts...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && grouped.length === 0 && (
        <p className="text-sm text-slate-500">
          No other Acts available in this Campaign.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="mb-4 max-h-64 overflow-y-auto rounded border border-slate-200">
          {grouped.map(({ arc, acts }) => (
            <div key={arc.id}>
              <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {arc.name}
              </div>
              {acts.map((act) => (
                <label
                  key={act.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="target-act"
                    value={act.id}
                    checked={selectedActId === act.id}
                    onChange={() => setSelectedActId(act.id)}
                    className="accent-slate-800"
                  />
                  <span className="text-sm text-slate-700">{act.name}</span>
                </label>
              ))}
            </div>
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
          disabled={selectedActId === null || loading}
          onClick={() => selectedActId !== null && onConfirm(selectedActId)}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Move
        </button>
      </div>
    </ModalShell>
  );
}
