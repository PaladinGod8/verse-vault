/**
 * @role IPA phonetic tool drawer
 * @owns The staging scratchpad UI: English->IPA conversion, click-to-insert
 *       symbol palette, edit box, and copy-to-clipboard. A left-pinned overlay
 *       that floats above an open entity form without stealing its edits.
 * @seam Opened/closed by `useIpaTool`; conversion delegated to `convertToIpa`
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { convertToIpa, DEFAULT_ACCENT, type IpaAccent } from '../../lib/ipa/englishToIpa';
import { insertAtCursor } from '../../lib/ipa/insertAtCursor';
import { useToast } from '../ui/ToastProvider';
import IpaSymbolPalette from './IpaSymbolPalette';

type IpaToolDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ACCENTS: Array<{ value: IpaAccent; label: string; }> = [
  { value: 'en-GB', label: 'British' },
  { value: 'en-US', label: 'American' },
];

export default function IpaToolDrawer({ isOpen, onClose }: IpaToolDrawerProps) {
  const toast = useToast();
  const [english, setEnglish] = useState('');
  const [staging, setStaging] = useState('');
  const [accent, setAccent] = useState<IpaAccent>(DEFAULT_ACCENT);
  const stagingRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  // Restore the caret after a programmatic insert so successive inserts stack.
  useLayoutEffect(() => {
    if (pendingCaretRef.current !== null && stagingRef.current) {
      const caret = pendingCaretRef.current;
      stagingRef.current.focus();
      stagingRef.current.setSelectionRange(caret, caret);
      pendingCaretRef.current = null;
    }
  });

  const spliceIntoStaging = (insert: string, { separate }: { separate: boolean; }) => {
    const el = stagingRef.current;
    const start = el?.selectionStart ?? staging.length;
    const end = el?.selectionEnd ?? staging.length;
    const precedingChar = staging[Math.min(start, end) - 1];
    const needsSpace = separate && precedingChar !== undefined && !/\s/.test(precedingChar);
    const payload = (needsSpace ? ' ' : '') + insert;
    const { text, caret } = insertAtCursor(staging, start, end, payload);
    setStaging(text);
    pendingCaretRef.current = caret;
  };

  const handleConvert = () => {
    const ipa = convertToIpa(english, accent);
    if (!ipa) {
      return;
    }
    spliceIntoStaging(ipa, { separate: true });
  };

  const handlePaletteInsert = (char: string) => {
    spliceIntoStaging(char, { separate: false });
  };

  const handleCopy = async () => {
    if (!staging) {
      return;
    }
    try {
      await navigator.clipboard.writeText(staging);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed', 'Clipboard is not available.');
    }
  };

  const handleClear = () => {
    setEnglish('');
    setStaging('');
    pendingCaretRef.current = 0;
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      role='dialog'
      aria-label='IPA phonetic tool'
      className='bg-base-100 text-base-content fixed inset-y-0 left-0 z-[1000] flex w-full max-w-md flex-col gap-4 overflow-y-auto p-4 shadow-2xl'
    >
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>IPA Phonetic Tool</h2>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={onClose}
          aria-label='Close IPA tool'
        >
          ✕
        </button>
      </div>

      <div>
        <span className='mb-1 block text-sm font-medium text-slate-700'>Accent</span>
        <div className='join'>
          {ACCENTS.map((option) => (
            <button
              key={option.value}
              type='button'
              className={`btn join-item btn-sm ${accent === option.value ? 'btn-active' : ''}`}
              aria-pressed={accent === option.value}
              onClick={() => setAccent(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor='ipa-english' className='mb-1 block text-sm font-medium text-slate-700'>
          English text
        </label>
        <textarea
          id='ipa-english'
          value={english}
          onChange={(event) => setEnglish(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={2}
          placeholder='Type or paste English, e.g. bus driver'
        />
        <button type='button' className='btn btn-primary btn-sm mt-2' onClick={handleConvert}>
          Convert →
        </button>
      </div>

      <div>
        <label htmlFor='ipa-staging' className='mb-1 block text-sm font-medium text-slate-700'>
          IPA staging
        </label>
        <textarea
          id='ipa-staging'
          ref={stagingRef}
          value={staging}
          onChange={(event) => setStaging(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-base text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={3}
          placeholder='Converted IPA lands here — edit freely, then copy'
        />
      </div>

      <IpaSymbolPalette onInsert={handlePaletteInsert} />

      <div className='mt-auto flex gap-2 pt-2'>
        <button
          type='button'
          className='btn btn-primary flex-1'
          onClick={handleCopy}
          disabled={!staging}
        >
          Copy to clipboard
        </button>
        <button type='button' className='btn btn-ghost' onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>,
    document.body,
  );
}
