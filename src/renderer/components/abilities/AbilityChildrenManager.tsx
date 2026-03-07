import { useEffect, useMemo, useState } from 'react';

type AbilityChildrenManagerProps = {
  parentAbility: Ability;
  abilities: Ability[];
};

function isAbilityChildManagerSupported(ability: Ability): boolean {
  const subtype = ability.passive_subtype;
  return (
    ability.type === 'passive'
    && (subtype === 'linchpin'
      || subtype === 'keystone'
      || subtype === 'rostering')
  );
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function AbilityChildrenManager({
  parentAbility,
  abilities,
}: AbilityChildrenManagerProps) {
  const [children, setChildren] = useState<Ability[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingChildId, setAddingChildId] = useState<number | null>(null);
  const [removingChildId, setRemovingChildId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadChildren = async () => {
      setIsLoadingChildren(true);
      setLoadingError(null);

      try {
        const linkedChildren = await window.db.abilities.getChildren(
          parentAbility.id,
        );
        if (isMounted) {
          setChildren(linkedChildren);
        }
      } catch {
        if (isMounted) {
          setChildren([]);
          setLoadingError('Unable to load child abilities right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingChildren(false);
        }
      }
    };

    void loadChildren();

    return () => {
      isMounted = false;
    };
  }, [parentAbility.id]);

  const childIdSet = useMemo(
    () => new Set(children.map((child) => child.id)),
    [children],
  );

  const candidates = useMemo(
    () =>
      abilities.filter(
        (ability) =>
          ability.world_id === parentAbility.world_id
          && ability.id !== parentAbility.id
          && !childIdSet.has(ability.id),
      ),
    [abilities, childIdSet, parentAbility.id, parentAbility.world_id],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (ability: Ability) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${ability.name} ${ability.type} ${ability.passive_subtype ?? ''}`
      .toLowerCase()
      .includes(normalizedSearch);
  };

  const filteredChildren = useMemo(
    () => children.filter(matchesSearch),
    [children, normalizedSearch],
  );

  const filteredCandidates = useMemo(
    () => candidates.filter(matchesSearch),
    [candidates, normalizedSearch],
  );

  const handleAddChild = async (childId: number) => {
    setActionError(null);
    setAddingChildId(childId);

    try {
      await window.db.abilities.addChild({
        parent_id: parentAbility.id,
        child_id: childId,
      });
      const linkedChildren = await window.db.abilities.getChildren(
        parentAbility.id,
      );
      setChildren(linkedChildren);
    } catch (error) {
      const errorMessage = toErrorMessage(
        error,
        'Failed to add child ability.',
      );
      setActionError(
        errorMessage === 'Child ability link already exists'
          ? 'That ability is already linked as a child.'
          : errorMessage,
      );
    } finally {
      setAddingChildId((current) => (current === childId ? null : current));
    }
  };

  const handleRemoveChild = async (childId: number) => {
    setActionError(null);
    setRemovingChildId(childId);

    try {
      await window.db.abilities.removeChild({
        parent_id: parentAbility.id,
        child_id: childId,
      });
      setChildren((prev) => prev.filter((child) => child.id !== childId));
    } catch (error) {
      setActionError(toErrorMessage(error, 'Failed to remove child ability.'));
    } finally {
      setRemovingChildId((current) => (current === childId ? null : current));
    }
  };

  if (!isAbilityChildManagerSupported(parentAbility)) {
    return null;
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-slate-600'>
        Search abilities in this world, then add or remove child links.
      </p>

      <div className='space-y-1'>
        <label
          htmlFor={`ability-children-search-${parentAbility.id}`}
          className='block text-sm font-medium text-slate-800'
        >
          Search
        </label>
        <input
          id={`ability-children-search-${parentAbility.id}`}
          type='text'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search by name, type, or subtype'
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
        />
      </div>

      {loadingError
        ? (
          <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
            {loadingError}
          </p>
        )
        : null}

      {actionError
        ? (
          <p className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {actionError}
          </p>
        )
        : null}

      <div className='grid gap-4 md:grid-cols-2'>
        <section className='space-y-3 rounded-lg border border-slate-200 p-4'>
          <h3 className='text-sm font-semibold text-slate-900'>
            Linked children
          </h3>

          {isLoadingChildren
            ? <p className='text-sm text-slate-600'>Loading linked children...</p>
            : null}

          {!isLoadingChildren && filteredChildren.length === 0
            ? (
              <p className='text-sm text-slate-600'>
                {children.length === 0
                  ? 'No child abilities linked yet.'
                  : 'No linked children match your search.'}
              </p>
            )
            : null}

          {!isLoadingChildren && filteredChildren.length > 0
            ? (
              <ul className='space-y-2'>
                {filteredChildren.map((child) => (
                  <li
                    key={child.id}
                    className='flex items-start justify-between gap-3 rounded-md border border-slate-100 px-3 py-2'
                  >
                    <div>
                      <p className='text-sm font-medium text-slate-900'>
                        {child.name}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {child.type}
                        {child.passive_subtype
                          ? ` / ${child.passive_subtype}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        void handleRemoveChild(child.id);
                      }}
                      className='shrink-0 text-sm font-medium text-rose-600 transition hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60'
                      disabled={removingChildId === child.id || addingChildId !== null}
                    >
                      {removingChildId === child.id ? 'Removing...' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            )
            : null}
        </section>

        <section className='space-y-3 rounded-lg border border-slate-200 p-4'>
          <h3 className='text-sm font-semibold text-slate-900'>
            Available abilities
          </h3>

          {isLoadingChildren
            ? <p className='text-sm text-slate-600'>Loading candidates...</p>
            : null}

          {!isLoadingChildren && filteredCandidates.length === 0
            ? (
              <p className='text-sm text-slate-600'>
                {candidates.length === 0
                  ? 'No more abilities available to link.'
                  : 'No candidates match your search.'}
              </p>
            )
            : null}

          {!isLoadingChildren && filteredCandidates.length > 0
            ? (
              <ul className='space-y-2'>
                {filteredCandidates.map((candidate) => (
                  <li
                    key={candidate.id}
                    className='flex items-start justify-between gap-3 rounded-md border border-slate-100 px-3 py-2'
                  >
                    <div>
                      <p className='text-sm font-medium text-slate-900'>
                        {candidate.name}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {candidate.type}
                        {candidate.passive_subtype
                          ? ` / ${candidate.passive_subtype}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        void handleAddChild(candidate.id);
                      }}
                      className='shrink-0 text-sm font-medium text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
                      disabled={addingChildId === candidate.id || removingChildId !== null}
                    >
                      {addingChildId === candidate.id ? 'Adding...' : 'Add'}
                    </button>
                  </li>
                ))}
              </ul>
            )
            : null}
        </section>
      </div>
    </div>
  );
}
