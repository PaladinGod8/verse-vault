import { useEffect, useState } from 'react';

type AbilityPickerPanelProps = {
  worldId: number;
  castingAbility: Ability | null;
  onAbilitySelect: (ability: Ability | null) => void;
};

export default function AbilityPickerPanel({
  worldId,
  castingAbility,
  onAbilitySelect,
}: AbilityPickerPanelProps) {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    window.db.abilities
      .getAllByWorld(worldId)
      .then((all) => {
        if (!isMounted) return;
        setAbilities(all.filter((a) => a.type === 'active'));
      })
      .catch(() => {
        if (!isMounted) return;
        setAbilities([]);
        setError('Unable to load abilities.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  const handleAbilityClick = (ability: Ability) => {
    if (ability.range_cells === null) {
      onAbilitySelect(null);
      return;
    }
    if (castingAbility?.id === ability.id) {
      onAbilitySelect(null);
    } else {
      onAbilitySelect(ability);
    }
  };

  return (
    <div className='flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 shadow-lg'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-semibold text-white'>Abilities</span>
        <button
          type='button'
          onClick={() => onAbilitySelect(null)}
          className='text-xs text-slate-400 hover:text-white'
        >
          Close
        </button>
      </div>

      {isLoading
        ? <p className='text-slate-400'>Loading abilities...</p>
        : error
        ? <p className='text-amber-400'>{error}</p>
        : abilities.length === 0
        ? <p className='text-slate-400'>No active abilities in this world.</p>
        : (
          <ul className='max-h-48 space-y-1 overflow-y-auto'>
            {abilities.map((ability) => {
              const isSelected = castingAbility?.id === ability.id;
              const hasRange = ability.range_cells !== null;
              return (
                <li key={ability.id}>
                  <button
                    type='button'
                    onClick={() => handleAbilityClick(ability)}
                    className={[
                      'w-full rounded px-2 py-1.5 text-left transition',
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : hasRange
                        ? 'text-slate-200 hover:bg-slate-700'
                        : 'cursor-default text-slate-500',
                    ].join(' ')}
                  >
                    <span className='font-medium'>{ability.name}</span>
                    {ability.range_cells !== null && (
                      <span className='ml-1 text-xs text-slate-400'>
                        {ability.range_cells}c
                        {ability.aoe_shape ? ` · ${ability.aoe_shape}` : ''}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
