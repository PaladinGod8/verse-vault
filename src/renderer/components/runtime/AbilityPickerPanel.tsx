import { useEffect, useState } from 'react';

type AbilityPickerPanelProps = {
  sourceTokenId: number | null;
  tokenName: string;
  castingAbility: Ability | null;
  onAbilitySelect: (ability: Ability | null) => void;
};

export default function AbilityPickerPanel({
  sourceTokenId,
  tokenName,
  castingAbility,
  onAbilitySelect,
}: AbilityPickerPanelProps) {
  const [linkedStatBlock, setLinkedStatBlock] = useState<StatBlock | null>(null);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (sourceTokenId === null) {
      setLinkedStatBlock(null);
      setAbilities([]);
      setIsLoading(false);
      setError('Selected token has no source link.');
      onAbilitySelect(null);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setError(null);

    window.db.statblocks
      .getLinkedStatblock(sourceTokenId)
      .then(async (statblock) => {
        if (!isMounted) return;

        if (!statblock) {
          setLinkedStatBlock(null);
          setAbilities([]);
          onAbilitySelect(null);
          return;
        }

        const linkedAbilities = await window.db.statblocks.listAbilities(
          statblock.id,
        );
        if (!isMounted) return;

        setLinkedStatBlock(statblock);
        setAbilities(linkedAbilities.filter((ability) => ability.type === 'active'));
      })
      .catch(() => {
        if (!isMounted) return;
        setLinkedStatBlock(null);
        setAbilities([]);
        setError('Unable to load linked statblock abilities.');
        onAbilitySelect(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onAbilitySelect, sourceTokenId]);

  useEffect(() => {
    if (
      castingAbility
      && !abilities.some((ability) => ability.id === castingAbility.id)
    ) {
      onAbilitySelect(null);
    }
  }, [abilities, castingAbility, onAbilitySelect]);

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
        <span className='font-semibold text-white'>
          {tokenName} Abilities
        </span>
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
        : linkedStatBlock === null
        ? <p className='text-slate-400'>No linked statblock for this token.</p>
        : abilities.length === 0
        ? <p className='text-slate-400'>No active abilities on this statblock.</p>
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
                        {ability.aoe_shape ? ` - ${ability.aoe_shape}` : ''}
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
