import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterCombobox from '../../../src/renderer/components/factions/CharacterCombobox';
import { installIntersectionObserverStub } from '../../helpers/intersectionObserverStub';
import { resetWindowDb, setupWindowDb } from '../../helpers/ipcMock';

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    world_id: 1,
    name: 'Ledros Igni',
    profile: null,
    is_player_character: 0,
    owner: null,
    author: null,
    image_src: null,
    sections: '{}',
    wiki_summary: '{}',
    last_viewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('CharacterCombobox', () => {
  beforeEach(() => {
    setupWindowDb();
    resetWindowDb();
  });

  it('renders the options panel above DaisyUI modals (z-index > 999)', async () => {
    const user = userEvent.setup();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      hasMore: false,
    });

    render(<CharacterCombobox worldId={1} value={0} excludeCharacterIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));

    const panel = await screen.findByRole('listbox');
    const zIndexClass = Array.from(panel.classList).find((cls) => /^z-/.test(cls));
    const zIndexValue = Number(zIndexClass?.match(/^z-\[?(\d+)\]?$/)?.[1]);

    // DaisyUI's `.modal` is z-index 999 (forms render inside a ModalShell), so the
    // options panel must exceed that or it renders invisibly behind the modal.
    expect(zIndexValue).toBeGreaterThan(999);
  });

  it('uses theme-aware DaisyUI tokens, not hardcoded light-theme colors, so custom themes stay readable', async () => {
    const user = userEvent.setup();
    const character = buildCharacter({ id: 9, name: 'Ledros Igni' });
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [character],
      hasMore: false,
    });

    render(<CharacterCombobox worldId={1} value={0} excludeCharacterIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));

    const input = screen.getByRole('combobox');
    const panel = await screen.findByRole('listbox');
    const option = await screen.findByText('Ledros Igni');

    // `index.css` only flips hardcoded `bg-white`/`text-slate-*` classes for the exact
    // built-in `versevault-dark` theme name, not for user-picked custom themes - so this
    // component must use DaisyUI's theme-aware tokens instead.
    for (const el of [input, panel, option]) {
      expect(el.className).not.toMatch(
        /\b(bg-white|text-slate-\d+|bg-slate-\d+|border-slate-\d+)\b/,
      );
    }
    expect(panel.className).toMatch(/\bbg-base-100\b/);
    expect(input.className).toMatch(/\btext-base-content\b/);
  });

  it('selecting a search result calls onChange with the character id and name', async () => {
    const user = userEvent.setup();
    const character = buildCharacter({ id: 9, name: 'Ledros Igni' });
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [character],
      hasMore: false,
    });
    const onChange = vi.fn();

    render(
      <CharacterCombobox
        worldId={1}
        value={0}
        excludeCharacterIds={[]}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    const option = await screen.findByText('Ledros Igni');
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(9, 'Ledros Igni');
    await waitFor(() => expect(input).toHaveValue('Ledros Igni'));
  });

  it('passes already-selected member ids as excludeCharacterIds to the search', async () => {
    const user = userEvent.setup();
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      hasMore: false,
    });

    render(
      <CharacterCombobox
        worldId={1}
        value={0}
        excludeCharacterIds={[3, 4]}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox'));

    await waitFor(() =>
      expect(window.db.characters.searchByWorld).toHaveBeenCalledWith(
        expect.objectContaining({ excludeCharacterIds: [3, 4] }),
      )
    );
  });

  it('shows a loading state while searching and an empty state when there are no matches', async () => {
    const user = userEvent.setup();
    let resolveSearch!: (value: { items: Character[]; hasMore: boolean; }) => void;
    (window.db.characters.searchByWorld as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    render(<CharacterCombobox worldId={1} value={0} excludeCharacterIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText('Searching...')).toBeInTheDocument();

    resolveSearch({ items: [], hasMore: false });
    expect(await screen.findByText('No characters found.')).toBeInTheDocument();
  });

  it('re-triggers a search when typing over an already-selected character name', async () => {
    const user = userEvent.setup();
    const ledros = buildCharacter({ id: 9, name: 'Ledros Igni' });
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    searchMock.mockResolvedValue({ items: [ledros], hasMore: false });
    (window.db.characters.getById as ReturnType<typeof vi.fn>).mockResolvedValue(ledros);
    const onChange = vi.fn();

    render(
      <CharacterCombobox worldId={1} value={9} excludeCharacterIds={[]} onChange={onChange} />,
    );

    const input = await screen.findByDisplayValue('Ledros Igni');
    searchMock.mockClear();
    await user.clear(input);
    await user.type(input, 'lan');

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ query: 'lan' }))
    );
  });

  it('fetches the next page when the scroll sentinel intersects', async () => {
    const user = userEvent.setup();
    const intersectionObserver = installIntersectionObserverStub();
    const firstPage = [buildCharacter({ id: 1, name: 'Alaric' })];
    const secondPage = [buildCharacter({ id: 2, name: 'Borin' })];
    const searchMock = window.db.characters.searchByWorld as ReturnType<typeof vi.fn>;
    searchMock.mockResolvedValueOnce({ items: firstPage, hasMore: true });

    render(<CharacterCombobox worldId={1} value={0} excludeCharacterIds={[]} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));
    await screen.findByText('Alaric');
    const sentinel = screen.getByTestId('character-combobox-sentinel');

    searchMock.mockClear();
    searchMock.mockResolvedValueOnce({ items: secondPage, hasMore: false });
    intersectionObserver.triggerIntersection(sentinel);

    await waitFor(() =>
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({ offset: firstPage.length }),
      )
    );
    await screen.findByText('Borin');
  });
});
