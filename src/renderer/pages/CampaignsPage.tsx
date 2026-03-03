import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CampaignForm from '../components/campaigns/CampaignForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';

type AddCampaignInput = Parameters<DbApi['campaigns']['add']>[0];

export default function CampaignsPage() {
  const toast = useToast();
  const { id } = useParams();
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

  const [world, setWorld] = useState<World | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteCampaign, setPendingDeleteCampaign] =
    useState<Campaign | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setCampaigns([]);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setError('World not found.');
          }
          return;
        }

        const campaignsList = await window.db.campaigns.getAllByWorld(worldId);
        if (isMounted) {
          setWorld(existingWorld);
          setCampaigns(campaignsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setCampaigns([]);
          setError('Unable to load campaigns right now.');
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
  }, [worldId]);

  const handleCreateCampaign = async (data: AddCampaignInput) => {
    try {
      const newCampaign = await window.db.campaigns.add(data);
      setCampaigns((prev) => [
        newCampaign,
        ...prev.filter((c) => c.id !== newCampaign.id),
      ]);
      setIsCreateOpen(false);
      toast.success('Campaign created.', `"${newCampaign.name}" was added.`);
    } catch (createError) {
      toast.error(
        'Failed to create campaign.',
        createError instanceof Error
          ? createError.message
          : 'Please try again.',
      );
      throw createError;
    }
  };

  const handleUpdateCampaign = async (data: AddCampaignInput) => {
    if (!editingCampaign) {
      return;
    }

    const { name, summary } = data;

    try {
      const updatedCampaign = await window.db.campaigns.update(
        editingCampaign.id,
        { name, summary },
      );
      setCampaigns((prev) =>
        prev.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c)),
      );
      setEditingCampaign(null);
      toast.success(
        'Campaign updated.',
        `"${updatedCampaign.name}" was saved.`,
      );
    } catch (updateError) {
      toast.error(
        'Failed to update campaign.',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
      throw updateError;
    }
  };

  const handleRequestDeleteCampaign = (campaign: Campaign) => {
    setPendingDeleteCampaign(campaign);
  };

  const handleDeleteCampaign = async () => {
    if (!pendingDeleteCampaign) {
      return;
    }
    const campaign = pendingDeleteCampaign;

    setDeletingId(campaign.id);

    try {
      await window.db.campaigns.delete(campaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      toast.success('Campaign deleted.', `"${campaign.name}" was removed.`);
    } catch (deleteError) {
      toast.error(
        'Failed to delete campaign.',
        deleteError instanceof Error
          ? deleteError.message
          : 'Please try again.',
      );
    } finally {
      setDeletingId((current) => (current === campaign.id ? null : current));
      setPendingDeleteCampaign((current) =>
        current?.id === campaign.id ? null : current,
      );
    }
  };

  return (
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              to={`/world/${worldId}`}
              className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Back to world
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {world?.name ?? 'Campaigns'}
            </h1>
          </div>

          {worldId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateOpen(true)}
            >
              New Campaign
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading campaigns...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && campaigns.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No campaigns yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && campaigns.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{campaign.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {campaign.summary ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          to={`/world/${worldId}/campaign/${campaign.id}/scenes`}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          Scenes
                        </Link>
                        <Link
                          to={`/world/${worldId}/campaign/${campaign.id}/arcs`}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                        >
                          Arcs
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            setEditingCampaign(campaign);
                          }}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === campaign.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleRequestDeleteCampaign(campaign);
                          }}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingId === campaign.id}
                        >
                          {deletingId === campaign.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>

      {isCreateOpen && worldId !== null ? (
        <ModalShell
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          labelledBy="create-campaign-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="create-campaign-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            New Campaign
          </h2>
          <CampaignForm
            mode="create"
            worldId={worldId}
            onSubmit={handleCreateCampaign}
            onCancel={() => setIsCreateOpen(false)}
          />
        </ModalShell>
      ) : null}

      {editingCampaign !== null ? (
        <ModalShell
          isOpen={editingCampaign !== null}
          onClose={() => setEditingCampaign(null)}
          labelledBy="edit-campaign-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="edit-campaign-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Campaign
          </h2>
          <CampaignForm
            mode="edit"
            worldId={editingCampaign.world_id}
            initialValues={editingCampaign}
            onSubmit={handleUpdateCampaign}
            onCancel={() => setEditingCampaign(null)}
          />
        </ModalShell>
      ) : null}

      <ConfirmDialog
        isOpen={pendingDeleteCampaign !== null}
        title={`Delete "${pendingDeleteCampaign?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => {
          void handleDeleteCampaign();
        }}
        onCancel={() => setPendingDeleteCampaign(null)}
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
      />
    </div>
  );
}
