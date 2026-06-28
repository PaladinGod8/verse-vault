import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCharacterSearch } from '../../hooks/useCharacterSearch';

type CharacterComboboxProps = {
  worldId: number;
  value: number;
  excludeCharacterIds: number[];
  onChange: (characterId: number, characterName: string) => void;
  disabled?: boolean;
};

export default function CharacterCombobox({
  worldId,
  value,
  excludeCharacterIds,
  onChange,
  disabled = false,
}: CharacterComboboxProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const { setQuery, items, isLoading, hasMore, error, fetchMore } = useCharacterSearch({
    worldId,
    excludeCharacterIds,
  });
  const fetchMoreRef = useRef(fetchMore);
  fetchMoreRef.current = fetchMore;
  const sentinelDisconnectRef = useRef<() => void>(() => undefined);
  const sentinelRef = useCallback((node: HTMLLIElement | null) => {
    sentinelDisconnectRef.current();
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) fetchMoreRef.current();
    });
    observer.observe(node);
    sentinelDisconnectRef.current = () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (value === 0) {
      setSelectedCharacter(null);
      return;
    }
    if (selectedCharacter?.id === value) return;
    const fromResults = items.find((character) => character.id === value);
    if (fromResults) {
      setSelectedCharacter(fromResults);
      return;
    }
    window.db.characters.getById(value).then((character) => {
      if (character) setSelectedCharacter(character);
    });
  }, [value]);

  return (
    <Combobox
      value={selectedCharacter}
      onChange={(character: Character | null) => {
        if (!character) return;
        setSelectedCharacter(character);
        onChange(character.id, character.name);
      }}
      disabled={disabled}
      immediate
    >
      <ComboboxInput
        aria-label='Member character'
        displayValue={(character: Character | null) => character?.name ?? ''}
        onChange={(event) => setQuery(event.target.value)}
        placeholder='Select a character...'
        className='border-base-300 text-base-content focus:border-primary flex-1 rounded-md border bg-base-100 px-2 py-1.5 text-sm focus:outline-none'
      />
      <ComboboxOptions
        anchor='bottom start'
        // z-[1000]: this combobox always renders inside a ModalShell, and DaisyUI's
        // `.modal` is z-index 999 - anything lower renders invisibly behind the modal.
        // Uses theme-aware DaisyUI tokens (not hardcoded Tailwind colors) so it stays
        // readable in custom user-picked themes, not just the built-in dark theme.
        className='border-base-300 text-base-content z-[1000] max-h-60 w-(--input-width) overflow-auto rounded-md border bg-base-100 text-sm shadow-lg empty:hidden'
      >
        {isLoading && items.length === 0
          ? <div className='text-base-content/60 px-2 py-1.5'>Searching...</div>
          : null}
        {!isLoading && !error && items.length === 0
          ? <div className='text-base-content/60 px-2 py-1.5'>No characters found.</div>
          : null}
        {error ? <div className='text-error px-2 py-1.5'>{error}</div> : null}
        {items.map((character) => (
          <ComboboxOption
            key={character.id}
            value={character}
            className='data-focus:bg-base-200 cursor-pointer px-2 py-1.5'
          >
            {character.name}
          </ComboboxOption>
        ))}
        {hasMore
          ? <li ref={sentinelRef} aria-hidden='true' data-testid='character-combobox-sentinel' />
          : null}
      </ComboboxOptions>
    </Combobox>
  );
}
