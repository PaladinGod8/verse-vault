/**
 * @role IPA symbol palette (click-to-insert)
 * @owns Rendering the grouped IPA glyph chips and reporting the clicked glyph
 *       to the parent so it can be spliced into the staging box at the cursor
 */
import { IPA_SYMBOL_GROUPS } from '../../lib/ipa/ipaSymbols';

type IpaSymbolPaletteProps = {
  onInsert: (char: string) => void;
};

export default function IpaSymbolPalette({ onInsert }: IpaSymbolPaletteProps) {
  return (
    <div className='space-y-3'>
      {IPA_SYMBOL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className='mb-1 text-xs font-medium text-slate-500'>{group.label}</p>
          <div className='flex flex-wrap gap-1'>
            {group.symbols.map((symbol) => (
              <button
                key={symbol.char}
                type='button'
                className='btn btn-sm btn-ghost border border-slate-300 font-mono text-base'
                title={symbol.example}
                aria-label={`${symbol.char} as in ${symbol.example}`}
                onClick={() => onInsert(symbol.char)}
              >
                {symbol.char}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
