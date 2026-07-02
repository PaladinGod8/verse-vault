import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CampaignNoteCard from '../components/campaignNotes/CampaignNoteCard';
import CampaignNoteMetadataForm, {
  type CampaignNoteMetadataFormValues,
} from '../components/campaignNotes/CampaignNoteMetadataForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EntityCountBadge from '../components/ui/EntityCountBadge';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { campaignNoteMatchesQuery } from '../lib/campaignNoteSearch';
import { parsePositiveIntParam } from '../lib/routeParams';
import { sortNamedRecords } from '../lib/sortNamedRecords';

export default function CampaignNotesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id, campaignId } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);
  const parsedCampaignId = useMemo(() => parsePositiveIntParam(campaignId), [campaignId]);

  const [world, setWorld] = useState<World | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [tagVocabulary, setTagVocabulary] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<CampaignNote | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null || parsedCampaignId === null) {
      setError('Invalid campaign route.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [existingWorld, existingCampaign, campaignNotes, campaignTags] = await Promise.all([
          window.db.worlds.getById(worldId),
          window.db.campaigns.getById(parsedCampaignId),
          window.db.campaignNotes.getAllByCampaign(parsedCampaignId),
          window.db.campaignNotes.getAllTagsByCampaign(parsedCampaignId),
        ]);

        if (!existingWorld || !existingCampaign) {
          if (isMounted) {
            setWorld(null);
            setCampaign(null);
            setError('Campaign not found.');
          }
          return;
        }

        if (isMounted) {
          setWorld(existingWorld);
          setCampaign(existingCampaign);
          setNotes(campaignNotes);
          setTagVocabulary(campaignTags);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setCampaign(null);
          setNotes([]);
          setTagVocabulary([]);
          setError('Unable to load campaign notes right now.');
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
  }, [parsedCampaignId, worldId]);

  const visibleNotes = useMemo(
    () => sortNamedRecords(notes).filter((note) => campaignNoteMatchesQuery(note, searchQuery)),
    [notes, searchQuery],
  );

  const handleCreate = async (data: CampaignNoteMetadataFormValues) => {
    if (worldId === null || parsedCampaignId === null) {
      return;
    }

    setIsSaving(true);
    try {
      const createdNote = await window.db.campaignNotes.add({
        world_id: worldId,
        campaign_id: parsedCampaignId,
        name: data.name,
        tags: data.tags,
        canvas_scene: null,
        canvas_preview_image: null,
      });
      toast.success('Campaign note created.', `"${createdNote.name}" was added.`);
      navigate(`/world/${worldId}/campaign/${parsedCampaignId}/notes/${createdNote.id}`);
    } catch (error) {
      toast.error(
        'Failed to create campaign note.',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteNote) {
      return;
    }

    const note = pendingDeleteNote;
    setDeletingNoteId(note.id);
    try {
      await window.db.campaignNotes.delete(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setTagVocabulary(await window.db.campaignNotes.getAllTagsByCampaign(note.campaign_id));
      setPendingDeleteNote(null);
      toast.success('Campaign note deleted.', `"${note.name}" was removed.`);
    } catch (error) {
      toast.error(
        'Failed to delete campaign note.',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setDeletingNoteId((current) => (current === note.id ? null : current));
    }
  };

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='flex items-start justify-between gap-4'>
          <div className='space-y-2'>
            <Link
              to={`/world/${worldId}/campaigns`}
              className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
            >
              Back to campaigns
            </Link>
            <div className='space-y-1'>
              <p className='text-sm text-slate-500'>{world?.name ?? 'Campaign Notes'}</p>
              <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
                {campaign?.name ?? 'Campaign Notes'}
              </h1>
            </div>
          </div>

          {parsedCampaignId !== null
            ? (
              <div className='flex items-center gap-3'>
                <EntityCountBadge count={notes.length} singularLabel='campaign note' />
                <button
                  type='button'
                  className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                  onClick={() => setIsCreateOpen(true)}
                >
                  New Campaign Note
                </button>
              </div>
            )
            : null}
        </header>

        <input
          type='search'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Search campaign notes by name or #tag...'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
        />

        {isLoading
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm'>
              Loading campaign notes...
            </section>
          )
          : error
          ? (
            <section className='rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm'>
              {error}
            </section>
          )
          : visibleNotes.length === 0
          ? (
            <section className='rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
              <p className='text-sm text-slate-600'>
                {notes.length === 0
                  ? 'No campaign notes yet.'
                  : 'No campaign notes match your search.'}
              </p>
            </section>
          )
          : (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {visibleNotes.map((note) => (
                <CampaignNoteCard
                  key={note.id}
                  note={note}
                  onOpen={() =>
                    navigate(`/world/${worldId}/campaign/${parsedCampaignId}/notes/${note.id}`)}
                  onDelete={() => setPendingDeleteNote(note)}
                  isDeleting={deletingNoteId === note.id}
                />
              ))}
            </div>
          )}
      </main>

      {isCreateOpen
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            labelledBy='create-campaign-note-title'
            boxClassName='max-w-2xl'
          >
            <h2
              id='create-campaign-note-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Campaign Note
            </h2>
            <CampaignNoteMetadataForm
              onSave={(data) => void handleCreate(data)}
              onClose={() => setIsCreateOpen(false)}
              isSaving={isSaving}
              tagVocabulary={tagVocabulary}
              submitLabel='Create note'
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteNote !== null}
        title={`Delete "${pendingDeleteNote?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteNote(null)}
        confirmLabel='Delete'
        isConfirming={deletingNoteId !== null}
      />
    </div>
  );
}
