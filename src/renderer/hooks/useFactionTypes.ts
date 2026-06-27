type UseFactionTypesParams = {
  worldId: number | null;
  reload: () => Promise<void>;
};

/**
 * Wraps the faction type management actions (add/rename/delete) used by
 * ManageFactionTypesModal, reloading the world's faction data after each mutation.
 */
export function useFactionTypes({ worldId, reload }: UseFactionTypesParams) {
  const add = async (name: string) => {
    if (worldId === null) return;
    await window.db.factionTypes.add({ world_id: worldId, name });
    await reload();
  };

  const rename = async (id: number, name: string) => {
    await window.db.factionTypes.rename(id, name);
    await reload();
  };

  const remove = async (id: number) => {
    await window.db.factionTypes.delete(id);
    await reload();
  };

  return { add, rename, remove };
}
