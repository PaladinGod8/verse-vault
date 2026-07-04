import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock TipTap so the real ProseMirror engine is never mounted in jsdom. ---
const { fakeEditor, chainRecorder } = vi.hoisted(() => {
  const chainRecorder = { calls: [] as Array<{ method: string; args: unknown[]; }> };
  const makeChain = () => {
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          return (...args: unknown[]) => {
            if (prop === 'run') return true;
            chainRecorder.calls.push({ method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const active = new Set<string>();
  const fakeEditor = {
    _options: null as Record<string, unknown> | null,
    isEditable: true,
    _active: active,
    chain: () => makeChain(),
    isActive: (name: string, attrs?: Record<string, unknown>) =>
      active.has(attrs ? `${name}:${JSON.stringify(attrs)}` : name),
    setEditable: vi.fn((v: boolean) => {
      fakeEditor.isEditable = v;
    }),
    commands: { setContent: vi.fn() },
    storage: { markdown: { getMarkdown: vi.fn(() => 'MOCK_MD') } },
  };
  return { fakeEditor, chainRecorder };
});

vi.mock('@tiptap/react', () => ({
  useEditor: (options: Record<string, unknown>) => {
    fakeEditor._options = options;
    return fakeEditor;
  },
  EditorContent: () => <div data-testid='editor-content' />,
}));
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: () => ({ name: 'starter-kit' }) } }));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: () => ({ name: 'placeholder' }) },
}));
vi.mock('tiptap-markdown', () => ({ Markdown: { configure: () => ({ name: 'markdown' }) } }));

import RichTextEditor, { isSafeLinkHref } from '../../../src/renderer/components/ui/RichTextEditor';

function getToolbar() {
  return screen.getByRole('toolbar', { name: /formatting/i });
}

describe('isSafeLinkHref', () => {
  it('accepts http, https, and mailto', () => {
    expect(isSafeLinkHref('http://a.com')).toBe(true);
    expect(isSafeLinkHref('https://a.com')).toBe(true);
    expect(isSafeLinkHref('mailto:a@b.com')).toBe(true);
  });

  it('rejects javascript, data, and relative/empty hrefs', () => {
    expect(isSafeLinkHref('javascript:alert(1)')).toBe(false);
    expect(isSafeLinkHref('data:text/html,x')).toBe(false);
    expect(isSafeLinkHref('/relative')).toBe(false);
    expect(isSafeLinkHref('')).toBe(false);
  });
});

describe('RichTextEditor', () => {
  beforeEach(() => {
    chainRecorder.calls = [];
    fakeEditor._active.clear();
    fakeEditor.isEditable = true;
    fakeEditor.setEditable.mockClear();
    fakeEditor.commands.setContent.mockClear();
    fakeEditor.storage.markdown.getMarkdown.mockClear();
    fakeEditor.storage.markdown.getMarkdown.mockReturnValue('MOCK_MD');
  });

  it('renders all 11 formatting buttons in the full variant', () => {
    render(<RichTextEditor value='' onChange={vi.fn()} variant='full' />);
    expect(within(getToolbar()).getAllByRole('button')).toHaveLength(11);
  });

  it('renders exactly bold/italic/bullet/link in the compact variant', () => {
    render(<RichTextEditor value='' onChange={vi.fn()} variant='compact' />);
    const buttons = within(getToolbar()).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(within(getToolbar()).getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(within(getToolbar()).getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(within(getToolbar()).getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(within(getToolbar()).getByRole('button', { name: 'Link' })).toBeInTheDocument();
  });

  it('defaults to the full variant', () => {
    render(<RichTextEditor value='' onChange={vi.fn()} />);
    expect(within(getToolbar()).getAllByRole('button')).toHaveLength(11);
  });

  it('invokes toggleBold when Bold is clicked', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor value='' onChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(chainRecorder.calls.some((c) => c.method === 'toggleBold')).toBe(true);
  });

  it('invokes toggleHeading with the right level when a heading is clicked', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor value='' onChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Heading 2' }));
    const call = chainRecorder.calls.find((c) => c.method === 'toggleHeading');
    expect(call?.args[0]).toEqual({ level: 2 });
  });

  it('reflects active marks via aria-pressed', () => {
    fakeEditor._active.add('bold');
    render(<RichTextEditor value='' onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables the toolbar buttons when not editable', () => {
    render(<RichTextEditor value='' onChange={vi.fn()} editable={false} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  });

  it('emits markdown through onChange when the editor updates', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value='MOCK_MD' onChange={onChange} />);
    fakeEditor.storage.markdown.getMarkdown.mockReturnValue('# new markdown');
    const onUpdate = fakeEditor._options?.onUpdate as (arg: { editor: unknown; }) => void;
    onUpdate({ editor: fakeEditor });
    expect(onChange).toHaveBeenCalledWith('# new markdown');
  });

  it('syncs external value changes into the editor without re-emitting', () => {
    const { rerender } = render(<RichTextEditor value='MOCK_MD' onChange={vi.fn()} />);
    // value equals current serialized markdown -> no setContent on mount.
    expect(fakeEditor.commands.setContent).not.toHaveBeenCalled();
    rerender(<RichTextEditor value='changed elsewhere' onChange={vi.fn()} />);
    expect(fakeEditor.commands.setContent).toHaveBeenCalledWith('changed elsewhere', {
      emitUpdate: false,
    });
  });

  it('forwards id and aria-label to the editor DOM attributes', () => {
    render(
      <RichTextEditor value='' onChange={vi.fn()} id='lore-note-content' aria-label='Content' />,
    );
    const attrs = (fakeEditor._options?.editorProps as { attributes: Record<string, string>; })
      .attributes;
    expect(attrs.id).toBe('lore-note-content');
    expect(attrs['aria-label']).toBe('Content');
  });

  it('applies a safe link and rejects an unsafe one', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor value='' onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.type(screen.getByLabelText('Link URL'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Apply link' }));
    const setLink = chainRecorder.calls.find((c) => c.method === 'setLink');
    expect(setLink?.args[0]).toEqual({ href: 'https://example.com' });

    chainRecorder.calls = [];
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.type(screen.getByLabelText('Link URL'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Apply link' }));
    expect(chainRecorder.calls.some((c) => c.method === 'setLink')).toBe(false);
  });
});
