import { useEffect, useMemo, useState } from 'react';
import { parseStatBlockSkills, parseStatBlockStatistics } from '../../lib/statblockStatisticsUtils';
import ModalShell from '../ui/ModalShell';

type StatBlockPopupProps = {
  isOpen: boolean;
  tokenName: string;
  sourceTokenId: number | null;
  castingAbility: Ability | null;
  onAbilitySelect: (ability: Ability | null) => void;
  onClose: () => void;
};

export default function StatBlockPopup({
  isOpen,
  tokenName,
  sourceTokenId,
  castingAbility,
  onAbilitySelect,
  onClose,
}: StatBlockPopupProps) {
  const [statBlock, setStatBlock] = useState<StatBlock | null>(null);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      return () => {
        isMounted = false;
      };
    }

    if (sourceTokenId === null) {
      setStatBlock(null);
      setAbilities([]);
      setIsLoading(false);
      setError('Selected token has no source link.');
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setError(null);

    window.db.statblocks
      .getLinkedStatblock(sourceTokenId)
      .then(async (linked) => {
        if (!isMounted) {
          return;
        }

        if (!linked) {
          setStatBlock(null);
          setAbilities([]);
          return;
        }

        const linkedAbilities = await window.db.statblocks.listAbilities(linked.id);
        if (!isMounted) {
          return;
        }

        setStatBlock(linked);
        setAbilities(linkedAbilities);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setStatBlock(null);
        setAbilities([]);
        setError('Unable to load linked statblock.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceTokenId]);

  const resourceEntries = useMemo(() => {
    if (!statBlock) {
      return [] as Array<[string, { current: number; maximum: number; }]>;
    }

    const statistics = parseStatBlockStatistics(statBlock.config);
    return Object.entries(statistics.statistics?.resources ?? {}).filter(
      (entry): entry is [string, { current: number; maximum: number; }] =>
        typeof entry[1]?.current === 'number' && typeof entry[1]?.maximum === 'number',
    );
  }, [statBlock]);

  const passiveEntries = useMemo(() => {
    if (!statBlock) {
      return [] as Array<[string, { baseValue: number; }]>;
    }

    const statistics = parseStatBlockStatistics(statBlock.config);
    return Object.entries(statistics.statistics?.passiveScores ?? {}).filter(
      (entry): entry is [string, { baseValue: number; }] => typeof entry[1]?.baseValue === 'number',
    );
  }, [statBlock]);

  const skills = useMemo(() => {
    if (!statBlock) {
      return [];
    }

    return parseStatBlockSkills(statBlock.config);
  }, [statBlock]);

  const handleAbilityClick = (ability: Ability) => {
    if (ability.range_cells === null) {
      onAbilitySelect(null);
      return;
    }

    if (castingAbility?.id === ability.id) {
      onAbilitySelect(null);
      return;
    }

    onAbilitySelect(ability);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy='runtime-statblock-popup-title'
      boxClassName='max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto'
    >
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2
              id='runtime-statblock-popup-title'
              className='text-lg font-semibold text-slate-900'
            >
              {tokenName} StatBlock
            </h2>
            <p className='text-sm text-slate-600'>
              Runtime view for the token-linked statblock.
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 transition hover:bg-slate-100'
          >
            Close
          </button>
        </div>

        {isLoading
          ? <p className='text-sm text-slate-600'>Loading statblock...</p>
          : error
          ? <p className='text-sm text-amber-700'>{error}</p>
          : statBlock === null
          ? <p className='text-sm text-slate-600'>No linked statblock for this token.</p>
          : (
            <div className='space-y-4'>
              <section className='rounded-lg border border-slate-200 bg-white p-4'>
                <h3 className='text-sm font-semibold text-slate-900'>
                  {statBlock.name}
                </h3>
                {statBlock.description
                  ? <p className='mt-1 text-sm text-slate-600'>{statBlock.description}</p>
                  : <p className='mt-1 text-sm text-slate-500'>No description.</p>}
              </section>

              <section className='rounded-lg border border-slate-200 bg-white p-4'>
                <h3 className='mb-2 text-sm font-semibold text-slate-900'>Abilities</h3>
                {abilities.length === 0
                  ? <p className='text-sm text-slate-500'>No abilities assigned.</p>
                  : (
                    <ul className='space-y-1'>
                      {abilities.map((ability) => {
                        const isSelected = castingAbility?.id === ability.id;
                        const hasRange = ability.range_cells !== null;
                        return (
                          <li key={ability.id}>
                            <button
                              type='button'
                              onClick={() => handleAbilityClick(ability)}
                              className={[
                                'w-full rounded px-2 py-1.5 text-left text-sm transition',
                                isSelected
                                  ? 'bg-sky-600 text-white'
                                  : hasRange
                                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                  : 'cursor-default bg-slate-50 text-slate-500',
                              ].join(' ')}
                            >
                              <span className='font-medium'>{ability.name}</span>
                              {ability.range_cells !== null
                                ? (
                                  <span className='ml-2 text-xs opacity-80'>
                                    {ability.range_cells}c
                                    {ability.aoe_shape ? ` - ${ability.aoe_shape}` : ''}
                                  </span>
                                )
                                : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </section>

              {resourceEntries.length > 0
                ? (
                  <section className='rounded-lg border border-slate-200 bg-white p-4'>
                    <h3 className='mb-2 text-sm font-semibold text-slate-900'>Resources</h3>
                    <div className='grid grid-cols-2 gap-2 text-sm text-slate-700 sm:grid-cols-3'>
                      {resourceEntries.map(([key, value]) => (
                        <div key={key} className='rounded bg-slate-100 px-2 py-1'>
                          <span className='font-semibold uppercase'>{key}</span>
                          <span className='ml-1'>
                            {value.current}/{value.maximum}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )
                : null}

              {passiveEntries.length > 0
                ? (
                  <section className='rounded-lg border border-slate-200 bg-white p-4'>
                    <h3 className='mb-2 text-sm font-semibold text-slate-900'>Passive Scores</h3>
                    <div className='flex flex-wrap gap-2 text-sm text-slate-700'>
                      {passiveEntries.map(([key, value]) => (
                        <div key={key} className='rounded bg-slate-100 px-2 py-1'>
                          <span className='font-semibold uppercase'>{key}</span>
                          <span className='ml-1'>{value.baseValue}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )
                : null}

              {skills.length > 0
                ? (
                  <section className='rounded-lg border border-slate-200 bg-white p-4'>
                    <h3 className='mb-2 text-sm font-semibold text-slate-900'>Skills</h3>
                    <div className='flex flex-wrap gap-2 text-sm text-slate-700'>
                      {skills.map((skill) => (
                        <div key={skill.key} className='rounded bg-slate-100 px-2 py-1'>
                          <span className='font-semibold'>{skill.key}</span>
                          <span className='ml-1'>{skill.rank}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )
                : null}
            </div>
          )}
      </div>
    </ModalShell>
  );
}
