import { useState } from 'react';

export type TokenMoveDialogMode = 'toWorld' | 'toCampaign' | null;

export function useTokenDialogs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [pendingDeleteToken, setPendingDeleteToken] = useState<Token | null>(
    null,
  );
  const [copyingToken, setCopyingToken] = useState<Token | null>(null);
  const [movingToken, setMovingToken] = useState<Token | null>(null);
  const [moveDialogMode, setMoveDialogMode] = useState<TokenMoveDialogMode>(
    null,
  );
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  const openCreate = () => {
    setEditingToken(null);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
  };

  const startEdit = (token: Token) => {
    setIsCreateOpen(false);
    setEditingToken(token);
  };

  const closeEdit = () => {
    setEditingToken(null);
  };

  const requestDelete = (token: Token) => {
    setPendingDeleteToken(token);
  };

  const clearDeleteRequest = () => {
    setPendingDeleteToken(null);
  };

  const openCopyToCampaign = (token: Token) => {
    setCopyingToken(token);
  };

  const closeCopyToCampaign = () => {
    setCopyingToken(null);
  };

  const openMoveToWorld = (token: Token) => {
    setMoveDialogMode('toWorld');
    setMovingToken(token);
    setIsMoveDialogOpen(true);
  };

  const openMoveToCampaign = (token: Token) => {
    setMoveDialogMode('toCampaign');
    setMovingToken(token);
    setIsMoveDialogOpen(true);
  };

  const closeMoveDialog = () => {
    setIsMoveDialogOpen(false);
    setMovingToken(null);
  };

  return {
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
  };
}
