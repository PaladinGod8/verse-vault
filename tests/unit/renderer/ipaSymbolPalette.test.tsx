import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import IpaSymbolPalette from '../../../src/renderer/components/ipa/IpaSymbolPalette';
import { IPA_SYMBOL_GROUPS } from '../../../src/renderer/lib/ipa/ipaSymbols';

describe('IPA_SYMBOL_GROUPS data', () => {
  it('has non-empty groups with labelled symbols and example words', () => {
    expect(IPA_SYMBOL_GROUPS.length).toBeGreaterThan(0);
    for (const group of IPA_SYMBOL_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.symbols.length).toBeGreaterThan(0);
      for (const symbol of group.symbols) {
        expect(symbol.char.length).toBeGreaterThan(0);
        expect(symbol.example.length).toBeGreaterThan(0);
      }
    }
  });

  it('contains no duplicate symbols across groups', () => {
    const chars = IPA_SYMBOL_GROUPS.flatMap((group) => group.symbols.map((s) => s.char));
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('includes the stress and length marks and the schwa', () => {
    const chars = new Set(
      IPA_SYMBOL_GROUPS.flatMap((group) => group.symbols.map((s) => s.char)),
    );
    for (const mark of ['ˈ', 'ˌ', 'ː', 'ə']) {
      expect(chars.has(mark)).toBe(true);
    }
  });
});

describe('IpaSymbolPalette', () => {
  it('renders every group label', () => {
    render(<IpaSymbolPalette onInsert={vi.fn()} />);
    for (const group of IPA_SYMBOL_GROUPS) {
      expect(screen.getByText(group.label)).toBeVisible();
    }
  });

  it('inserts the clicked symbol via onInsert', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(<IpaSymbolPalette onInsert={onInsert} />);

    await user.click(screen.getByRole('button', { name: 'ʌ as in strut' }));

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith('ʌ');
  });

  it('exposes the example word as a hover title', () => {
    render(<IpaSymbolPalette onInsert={vi.fn()} />);
    const schwa = screen.getByRole('button', { name: 'ə as in comma' });
    expect(schwa).toHaveAttribute('title', 'comma');
  });
});
