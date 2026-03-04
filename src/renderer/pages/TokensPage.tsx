import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import TokenForm from '../components/tokens/TokenForm';
import CopyTokenToCampaignDialog from '../components/tokens/CopyTokenToCampaignDialog';
import WorldSidebar from '../components/worlds/WorldSidebar';

function scopeLabel(token: Token, campaigns: Campaign[]): string {
  if (token.campaign_id === null) return 'World';
  const campaign = campaigns.find((c) => c.id === token.campaign_id);
  return campaign ? `Campaign: ${campaign.name}` : 'Campaign';
}

export default function TokensPage() {
  const toast = useToast();
  const { id } = useParams();
  const worldId = useMemo(() => {
    if (!id) return null;
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, [id]);

  const [world, setWorld] = useState<World | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [deletingToken, setDeletingToken] = useState<Token | null>(null);
  const [pendingDeleteToken, setPendingDeleteToken] = useState<Token | null>(
    null,
  );
  const [copyingToken, setCopyingToken] = useState<Token | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setTokens([]);
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

        const [tokensList, campaignsList] = await Promise.all([
          window.db.tokens.getAllByWorld(worldId),
          window.db.campaigns.getAllByWorld(worldId),
        ]);

        if (isMounted) {
          setWorld(existingWorld);
          setTokens(tokensList);
          setCampaigns(campaignsList);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setTokens([]);
          setCampaigns([]);
          setError('Unable to load tokens right now.');
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

  const reloadTokens = async () => {
    if (worldId === null) return;
    const tokensList = await window.db.tokens.getAllByWorld(worldId);
    setTokens(tokensList);
  };

  const handleCreate = async (data: {
    name: string;
    image_src: string | null;
    is_visible: number;
  }) => {
    if (worldId === null) return;
    setIsSaving(true);
    try {
      await window.db.tokens.add({
        world_id: worldId,
        name: data.name,
        image_src: data.image_src,
        is_visible: data.is_visible,
      });
      await reloadTokens();
      setFormOpen(false);
      toast.success('Token created.', `"${data.name}" was added.`);
    } catch (err) {
      toast.error(
        'Failed to create token.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    image_src: string | null;
    is_visible: number;
  }) => {
    if (!editingToken) return;
    setIsSaving(true);
    try {
      await window.db.tokens.update(editingToken.id, {
        name: data.name,
        image_src: data.image_src,
        is_visible: data.is_visible,
      });
      await reloadTokens();
      setEditingToken(null);
      toast.success('Token updated.', `"${data.name}" was saved.`);
    } catch (err) {
      toast.error(
        'Failed to update token.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteToken) return;
    const token = pendingDeleteToken;
    setDeletingToken(token);
    try {
      await window.db.tokens.delete(token.id);
      await reloadTokens();
      toast.success('Token deleted.', `"${token.name}" was removed.`);
    } catch (err) {
      toast.error(
        'Failed to delete token.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setDeletingToken((current) =>
        current?.id === token.id ? null : current,
      );
      setPendingDeleteToken((current) =>
        current?.id === token.id ? null : current,
      );
    }
  };

  const handleCopyToCampaign = async (campaignId: number) => {
    if (!copyingToken || worldId === null) return;
    const token = copyingToken;
    setIsSaving(true);
    try {
      await window.db.tokens.add({
        world_id: worldId,
        campaign_id: campaignId,
        name: token.name,
        image_src: token.image_src,
        config: token.config,
        is_visible: token.is_visible,
      });
      await reloadTokens();
      setCopyingToken(null);
      toast.success('Token copied to campaign.', `"${token.name}" was copied.`);
    } catch (err) {
      toast.error(
        'Failed to copy token.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
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
              {world?.name ?? 'Tokens'}
            </h1>
          </div>

          {worldId !== null ? (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => {
                setEditingToken(null);
                setFormOpen(true);
              }}
            >
              New Token
            </button>
          ) : null}
        </header>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading tokens...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && tokens.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">No tokens yet.</p>
          </section>
        ) : null}

        {!isLoading && !error && tokens.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr
                    key={token.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {token.image_src ? (
                        <img
                          src={token.image_src}
                          alt={token.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-200" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{token.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {scopeLabel(token, campaigns)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(token.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(token.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormOpen(false);
                            setEditingToken(token);
                          }}
                          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingToken?.id === token.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteToken(token)}
                          className="text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingToken?.id === token.id}
                        >
                          {deletingToken?.id === token.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                        {token.campaign_id === null ? (
                          <button
                            type="button"
                            onClick={() => setCopyingToken(token)}
                            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={deletingToken?.id === token.id}
                          >
                            Copy to Campaign
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>

      {formOpen && worldId !== null ? (
        <ModalShell
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          labelledBy="create-token-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="create-token-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            New Token
          </h2>
          <TokenForm
            onSave={(data) => void handleCreate(data)}
            onClose={() => setFormOpen(false)}
            isSaving={isSaving}
          />
        </ModalShell>
      ) : null}

      {editingToken !== null ? (
        <ModalShell
          isOpen={editingToken !== null}
          onClose={() => setEditingToken(null)}
          labelledBy="edit-token-title"
          boxClassName="max-w-xl"
        >
          <h2
            id="edit-token-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Token
          </h2>
          <TokenForm
            initialValues={{
              name: editingToken.name,
              image_src: editingToken.image_src,
              is_visible: editingToken.is_visible,
            }}
            onSave={(data) => void handleUpdate(data)}
            onClose={() => setEditingToken(null)}
            isSaving={isSaving}
          />
        </ModalShell>
      ) : null}

      <ConfirmDialog
        isOpen={pendingDeleteToken !== null}
        title={`Delete "${pendingDeleteToken?.name ?? ''}"?`}
        message="This cannot be undone."
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteToken(null)}
        confirmLabel="Delete"
        isConfirming={deletingToken !== null}
      />

      {copyingToken !== null ? (
        <CopyTokenToCampaignDialog
          token={copyingToken}
          campaigns={campaigns}
          onConfirm={(campaignId) => void handleCopyToCampaign(campaignId)}
          onClose={() => setCopyingToken(null)}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
