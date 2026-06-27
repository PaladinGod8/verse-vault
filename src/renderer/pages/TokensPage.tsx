import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import CopyTokenToCampaignDialog from '../components/tokens/CopyTokenToCampaignDialog';
import MoveTokenDialog from '../components/tokens/MoveTokenDialog';
import TokenForm from '../components/tokens/TokenForm';
import TokensListSection from '../components/tokens/TokensListSection';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ModalShell from '../components/ui/ModalShell';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import { useTokenCrud } from '../hooks/useTokenCrud';
import { useTokenDialogs } from '../hooks/useTokenDialogs';
import { useTokenMoveCopy } from '../hooks/useTokenMoveCopy';
import { useWorldTokensData } from '../hooks/useWorldTokensData';
import { parsePositiveIntParam } from '../lib/routeParams';
import { normalizeTokenImageSrc } from '../lib/tokenImageSrc';

export default function TokensPage() {
  const toast = useToast();
  const { id } = useParams();
  const worldId = useMemo(() => parsePositiveIntParam(id), [id]);

  const { world, tokens, campaigns, isLoading, error, setTokens, reload: reloadTokens } =
    useWorldTokensData(worldId);
  const {
    isCreateOpen,
    editingToken,
    pendingDeleteToken,
    copyingToken,
    movingToken,
    moveDialogMode,
    isMoveDialogOpen,
    openCreate,
    closeCreate,
    startEdit,
    closeEdit,
    requestDelete,
    clearDeleteRequest,
    openCopyToCampaign,
    closeCopyToCampaign,
    openMoveToWorld,
    openMoveToCampaign,
    closeMoveDialog,
  } = useTokenDialogs();
  const {
    isSaving,
    deletingTokenId,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useTokenCrud({
    worldId,
    editingToken,
    pendingDeleteToken,
    reloadTokens,
    toast,
    onCreateSaved: closeCreate,
    onUpdateSaved: closeEdit,
    onDeleteSettled: clearDeleteRequest,
  });
  const {
    isCopySaving,
    isMoveDialogPending,
    handleCopyToCampaign,
    handleConfirmMove,
  } = useTokenMoveCopy({
    worldId,
    campaigns,
    copyingToken,
    movingToken,
    moveDialogMode,
    reloadTokens,
    setTokens,
    toast,
    onCopySaved: closeCopyToCampaign,
    onMoveSaved: closeMoveDialog,
  });
  const isMutationPending = isSaving || isCopySaving;

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='flex items-start justify-between gap-4'>
          <div className='space-y-2'>
            <Link
              to={`/world/${worldId}`}
              className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
            >
              Back to world
            </Link>
            <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
              {world?.name ?? 'Tokens'}
            </h1>
          </div>

          {worldId !== null
            ? (
              <button
                type='button'
                className='shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
                onClick={openCreate}
              >
                New Token
              </button>
            )
            : null}
        </header>

        <TokensListSection
          isLoading={isLoading}
          error={error}
          tokens={tokens}
          campaigns={campaigns}
          deletingTokenId={deletingTokenId}
          isMoveDialogPending={isMoveDialogPending}
          isSaving={isMutationPending}
          onEdit={startEdit}
          onMoveToWorld={openMoveToWorld}
          onMoveToCampaign={openMoveToCampaign}
          onCopyToCampaign={openCopyToCampaign}
          onDeleteRequest={requestDelete}
        />
      </main>

      {isCreateOpen && worldId !== null
        ? (
          <ModalShell
            isOpen={isCreateOpen}
            onClose={closeCreate}
            labelledBy='create-token-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='create-token-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              New Token
            </h2>
            <TokenForm
              onSave={(data) => void handleCreate(data)}
              onClose={closeCreate}
              isSaving={isMutationPending}
            />
          </ModalShell>
        )
        : null}

      {editingToken !== null
        ? (
          <ModalShell
            isOpen={editingToken !== null}
            onClose={closeEdit}
            labelledBy='edit-token-title'
            boxClassName='max-w-xl'
          >
            <h2
              id='edit-token-title'
              className='mb-4 text-lg font-semibold text-slate-900'
            >
              Edit Token
            </h2>
            <TokenForm
              initialValues={{
                name: editingToken.name,
                grid_type: editingToken.grid_type,
                image_src: normalizeTokenImageSrc(editingToken.image_src),
                is_visible: editingToken.is_visible,
              }}
              onSave={(data) => void handleUpdate(data)}
              onClose={closeEdit}
              isSaving={isMutationPending}
            />
          </ModalShell>
        )
        : null}

      <ConfirmDialog
        isOpen={pendingDeleteToken !== null}
        title={`Delete "${pendingDeleteToken?.name ?? ''}"?`}
        message='This cannot be undone.'
        onConfirm={() => void handleDelete()}
        onCancel={clearDeleteRequest}
        confirmLabel='Delete'
        isConfirming={deletingTokenId !== null}
      />

      {copyingToken !== null
        ? (
          <CopyTokenToCampaignDialog
            token={copyingToken}
            campaigns={campaigns}
            onConfirm={(campaignId) => void handleCopyToCampaign(campaignId)}
            onClose={closeCopyToCampaign}
            isSaving={isMutationPending}
          />
        )
        : null}

      {movingToken !== null
        ? (
          <MoveTokenDialog
            token={movingToken}
            mode={moveDialogMode || 'toWorld'}
            campaigns={campaigns}
            isOpen={isMoveDialogOpen}
            isPending={isMoveDialogPending}
            onConfirm={handleConfirmMove}
            onCancel={closeMoveDialog}
          />
        )
        : null}
    </div>
  );
}
