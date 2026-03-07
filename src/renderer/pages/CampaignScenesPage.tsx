import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import WorldSidebar from '../components/worlds/WorldSidebar';

export default function CampaignScenesPage() {
  const { id, campaignId } = useParams();

  const worldId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [id]);

  const parsedCampaignId = useMemo(() => {
    if (!campaignId) {
      return null;
    }

    const parsed = Number(campaignId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [campaignId]);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenes, setScenes] = useState<CampaignSceneListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null) {
      setCampaign(null);
      setScenes([]);
      setError('Invalid world or campaign id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingCampaign = await window.db.campaigns.getById(parsedCampaignId);
        if (!existingCampaign || existingCampaign.world_id !== worldId) {
          if (isMounted) {
            setCampaign(null);
            setScenes([]);
            setError('Campaign not found.');
          }
          return;
        }

        const campaignScenes = await window.db.scenes.getAllByCampaign(parsedCampaignId);
        if (isMounted) {
          setCampaign(existingCampaign);
          setScenes(campaignScenes);
        }
      } catch {
        if (isMounted) {
          setCampaign(null);
          setScenes([]);
          setError('Unable to load campaign scenes right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [worldId, parsedCampaignId]);

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <nav className='flex items-center gap-2 text-sm text-slate-500'>
            <Link
              to={`/world/${worldId}/campaigns`}
              className='font-medium transition hover:text-slate-900'
            >
              Campaigns
            </Link>
            <span>/</span>
            <span className='text-slate-700'>Scenes</span>
          </nav>
          <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
            {campaign ? `${campaign.name} - Scenes` : 'Campaign Scenes'}
          </h1>
        </header>

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading campaign scenes...
            </section>
          )
          : null}

        {!isLoading && error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : null}

        {!isLoading && !error && scenes.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>No scenes yet.</p>
            </section>
          )
          : null}

        {!isLoading && !error && scenes.length > 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white shadow-sm'>
              <table className='w-full text-sm text-slate-700'>
                <thead>
                  <tr className='border-b border-slate-200'>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Scene
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Session
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Act
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Arc
                    </th>
                    <th className='px-4 py-3 text-left font-medium text-slate-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scenes.map((scene) => (
                    <tr
                      key={scene.id}
                      className='border-b border-slate-100 last:border-0'
                    >
                      <td className='px-4 py-3 font-medium'>{scene.name}</td>
                      <td className='px-4 py-3 text-slate-500'>
                        {scene.session_name}
                      </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {scene.act_name}
                      </td>
                      <td className='px-4 py-3 text-slate-500'>
                        {scene.arc_name}
                      </td>
                      <td className='px-4 py-3'>
                        <Link
                          to={`/world/${worldId}/campaign/${parsedCampaignId}/arc/${scene.arc_id}/act/${scene.act_id}/session/${scene.session_id}/scenes`}
                          className='text-sm font-medium text-slate-600 transition hover:text-slate-900'
                        >
                          Open Session Scenes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
          : null}
      </main>
    </div>
  );
}
