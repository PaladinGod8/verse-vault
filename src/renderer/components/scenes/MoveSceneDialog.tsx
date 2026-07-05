import { useEffect, useState } from 'react';
import ModalShell from '../ui/ModalShell';

type ActWithArcName = Act & { arc_name: string; };

type Props = {
  scene: Scene;
  currentActId: number;
  currentSessionId: number | null;
  campaignId: number;
  onConfirm: (newActId: number, newSessionId: number | null) => void;
  onCancel: () => void;
};

export default function MoveSceneDialog({
  scene,
  currentActId,
  currentSessionId,
  campaignId,
  onConfirm,
  onCancel,
}: Props) {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [actsWithArc, setActsWithArc] = useState<ActWithArcName[]>([]);
  const [selectedActId, setSelectedActId] = useState<number | null>(currentActId);
  const [sessionsForAct, setSessionsForAct] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    currentSessionId,
  );
  const [loadingActs, setLoadingActs] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoadingActs(true);
      try {
        const [allArcs, allActs] = await Promise.all([
          window.db.arcs.getAllByCampaign(campaignId),
          window.db.acts.getAllByCampaign(campaignId),
        ]);
        if (!isMounted) {
          return;
        }
        setArcs(allArcs);
        const arcMap = new Map(allArcs.map((a) => [a.id, a.name]));
        setActsWithArc(
          allActs.map((act) => ({
            ...act,
            arc_name: arcMap.get(act.arc_id) ?? 'Unknown Arc',
          })),
        );
      } catch {
        if (isMounted) {
          setError('Failed to load acts.');
        }
      } finally {
        if (isMounted) {
          setLoadingActs(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  useEffect(() => {
    let isMounted = true;

    if (selectedActId === null) {
      setSessionsForAct([]);
      return () => {
        isMounted = false;
      };
    }

    async function loadSessions() {
      setLoadingSessions(true);
      try {
        const sessions = await window.db.sessions.getAllByAct(selectedActId as number);
        if (isMounted) {
          setSessionsForAct(sessions);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load sessions.');
        }
      } finally {
        if (isMounted) {
          setLoadingSessions(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [selectedActId]);

  const grouped = arcs
    .map((arc) => ({
      arc,
      acts: actsWithArc.filter((act) => act.arc_id === arc.id),
    }))
    .filter((g) => g.acts.length > 0);

  const isNoOp = selectedActId === currentActId && selectedSessionId === currentSessionId;

  return (
    <ModalShell
      isOpen
      onClose={onCancel}
      labelledBy='move-scene-title'
      boxClassName='max-w-2xl'
    >
      <h2
        id='move-scene-title'
        className='mb-4 text-lg font-semibold text-slate-800'
      >
        Move &ldquo;{scene.name}&rdquo;
      </h2>

      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p className='mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase'>
            Act
          </p>
          {loadingActs && <p className='text-sm text-slate-500'>Loading acts...</p>}
          {!loadingActs && grouped.length === 0
            ? <p className='text-sm text-slate-500'>No acts available.</p>
            : null}
          {!loadingActs && grouped.length > 0 && (
            <div className='max-h-64 overflow-y-auto rounded border border-slate-200'>
              {grouped.map(({ arc, acts }) => (
                <div key={arc.id}>
                  <div className='bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase'>
                    {arc.name}
                  </div>
                  {acts.map((act) => (
                    <label
                      key={act.id}
                      className='flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50'
                    >
                      <input
                        type='radio'
                        name='target-act'
                        checked={selectedActId === act.id}
                        onChange={() => {
                          setSelectedActId(act.id);
                          setSelectedSessionId(null);
                        }}
                        className='accent-slate-800'
                      />
                      <span className='text-sm text-slate-700'>{act.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className='mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase'>
            Session (optional)
          </p>
          {selectedActId === null
            ? <p className='text-sm text-slate-500'>Pick an act first.</p>
            : null}
          {selectedActId !== null && loadingSessions
            ? <p className='text-sm text-slate-500'>Loading sessions...</p>
            : null}
          {selectedActId !== null && !loadingSessions
            ? (
              <div className='max-h-64 overflow-y-auto rounded border border-slate-200'>
                <label className='flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50'>
                  <input
                    type='radio'
                    name='target-session'
                    checked={selectedSessionId === null}
                    onChange={() => setSelectedSessionId(null)}
                    className='accent-slate-800'
                  />
                  <span className='text-sm text-slate-700'>No session (stray)</span>
                </label>
                {sessionsForAct.map((session) => (
                  <label
                    key={session.id}
                    className='flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50'
                  >
                    <input
                      type='radio'
                      name='target-session'
                      checked={selectedSessionId === session.id}
                      onChange={() => setSelectedSessionId(session.id)}
                      className='accent-slate-800'
                    />
                    <span className='text-sm text-slate-700'>{session.name}</span>
                  </label>
                ))}
              </div>
            )
            : null}
        </div>
      </div>

      {error ? <p className='mt-3 text-sm text-red-600'>{error}</p> : null}

      <div className='mt-4 flex justify-end gap-3'>
        <button
          type='button'
          onClick={onCancel}
          className='rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
        >
          Cancel
        </button>
        <button
          type='button'
          disabled={selectedActId === null || isNoOp}
          onClick={() => selectedActId !== null && onConfirm(selectedActId, selectedSessionId)}
          className='rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50'
        >
          Move
        </button>
      </div>
    </ModalShell>
  );
}
