import { useEffect, useState } from 'react';
import ModalShell from '../ui/ModalShell';

type SessionOption = {
  arcId: number;
  arcName: string;
  arcSortOrder: number;
  actId: number;
  actName: string;
  actSortOrder: number;
  sessionId: number;
  sessionName: string;
  sessionSortOrder: number;
};

type Props = {
  scene: Scene;
  currentSessionId: number;
  campaignId: number;
  onConfirm: (newSessionId: number) => void;
  onCancel: () => void;
};

const sortSessionOptions = (left: SessionOption, right: SessionOption) =>
  left.arcSortOrder - right.arcSortOrder ||
  left.arcId - right.arcId ||
  left.actSortOrder - right.actSortOrder ||
  left.actId - right.actId ||
  left.sessionSortOrder - right.sessionSortOrder ||
  left.sessionId - right.sessionId;

export default function MoveSceneDialog({
  scene,
  currentSessionId,
  campaignId,
  onConfirm,
  onCancel,
}: Props) {
  const [options, setOptions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      setSelectedSessionId(null);

      try {
        const [arcs, acts] = await Promise.all([
          window.db.arcs.getAllByCampaign(campaignId),
          window.db.acts.getAllByCampaign(campaignId),
        ]);
        const arcById = new Map(arcs.map((arc) => [arc.id, arc]));
        const sessionsByAct = await Promise.all(
          acts.map(async (act) => ({
            act,
            sessions: await window.db.sessions.getAllByAct(act.id),
          })),
        );

        const nextOptions = sessionsByAct
          .flatMap(({ act, sessions }) => {
            const arc = arcById.get(act.arc_id);
            if (!arc) {
              return [];
            }
            return sessions
              .filter((session) => session.id !== currentSessionId)
              .map((session) => ({
                arcId: arc.id,
                arcName: arc.name,
                arcSortOrder: arc.sort_order,
                actId: act.id,
                actName: act.name,
                actSortOrder: act.sort_order,
                sessionId: session.id,
                sessionName: session.name,
                sessionSortOrder: session.sort_order,
              }));
          })
          .sort(sortSessionOptions);

        if (isMounted) {
          setOptions(nextOptions);
        }
      } catch {
        if (isMounted) {
          setOptions([]);
          setError('Failed to load target sessions.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [campaignId, currentSessionId]);

  return (
    <ModalShell
      isOpen
      onClose={onCancel}
      labelledBy="move-scene-title"
      boxClassName="max-w-md"
    >
      <h2
        id="move-scene-title"
        className="mb-4 text-lg font-semibold text-slate-800"
      >
        Move &ldquo;{scene.name}&rdquo; to Session
      </h2>

      {loading && (
        <p className="text-sm text-slate-500">Loading target sessions...</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && options.length === 0 && (
        <p className="text-sm text-slate-500">
          No other Sessions available in this Campaign.
        </p>
      )}

      {!loading && !error && options.length > 0 && (
        <div className="mb-4 max-h-64 overflow-y-auto rounded border border-slate-200">
          {options.map((option) => (
            <label
              key={option.sessionId}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
            >
              <input
                type="radio"
                name="target-session"
                value={option.sessionId}
                checked={selectedSessionId === option.sessionId}
                onChange={() => setSelectedSessionId(option.sessionId)}
                className="accent-slate-800"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-700">
                  {option.sessionName}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {option.arcName} / {option.actName}
                </span>
              </span>
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
          disabled={selectedSessionId === null || loading}
          onClick={() =>
            selectedSessionId !== null && onConfirm(selectedSessionId)
          }
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Move
        </button>
      </div>
    </ModalShell>
  );
}
