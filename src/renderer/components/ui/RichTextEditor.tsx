// eslint-disable-next-line import/no-named-as-default -- default export is the extension
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
// eslint-disable-next-line import/no-named-as-default -- default export is the extension bundle
import StarterKit from '@tiptap/starter-kit';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Markdown } from 'tiptap-markdown';

export type RichTextEditorVariant = 'full' | 'compact';

export type RichTextEditorProps = {
  /** Controlled markdown value. */
  value: string;
  /** Fires with the serialized markdown whenever the document changes. */
  onChange: (markdown: string) => void;
  variant?: RichTextEditorVariant;
  placeholder?: string;
  /** When false the surface + toolbar are read-only (e.g. while saving). */
  editable?: boolean;
  /** Forwarded onto the editable element so a `<label htmlFor>` can target it. */
  id?: string;
  'aria-label'?: string;
};

const SAFE_HREF = /^(https?:|mailto:)/i;

/** Exported for direct branch testing of the link allow-list. */
export function isSafeLinkHref(href: string): boolean {
  return SAFE_HREF.test(href.trim());
}

type CommandKey =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'ordered'
  | 'quote';

const FULL_COMMANDS: CommandKey[] = [
  'bold',
  'italic',
  'strike',
  'code',
  'h1',
  'h2',
  'h3',
  'bullet',
  'ordered',
  'quote',
];
const COMPACT_COMMANDS: CommandKey[] = ['bold', 'italic', 'bullet'];

type Editor = ReturnType<typeof useEditor>;

// tiptap-markdown augments editor.storage at runtime but its type augmentation
// is not reliably picked up, so narrow through a local shape.
type MarkdownStorage = { markdown: { getMarkdown: () => string; }; };
function getMarkdown(editor: NonNullable<Editor>): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
}

type CommandSpec = {
  label: string;
  icon: ReactNode;
  isActive: (editor: NonNullable<Editor>) => boolean;
  run: (editor: NonNullable<Editor>) => void;
};

const COMMANDS: Record<CommandKey, CommandSpec> = {
  bold: {
    label: 'Bold',
    icon: <span className='font-bold'>B</span>,
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    label: 'Italic',
    icon: <span className='italic'>I</span>,
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  strike: {
    label: 'Strikethrough',
    icon: <span className='line-through'>S</span>,
    isActive: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  code: {
    label: 'Inline code',
    icon: <span className='font-mono'>{'<>'}</span>,
    isActive: (e) => e.isActive('code'),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  h1: {
    label: 'Heading 1',
    icon: <span>H1</span>,
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  h2: {
    label: 'Heading 2',
    icon: <span>H2</span>,
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  h3: {
    label: 'Heading 3',
    icon: <span>H3</span>,
    isActive: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  bullet: {
    label: 'Bullet list',
    icon: <span>&bull;</span>,
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  ordered: {
    label: 'Numbered list',
    icon: <span>1.</span>,
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  quote: {
    label: 'Quote',
    icon: <span>&rdquo;</span>,
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
};

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type='button'
      className='rich-text-editor__btn'
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function LinkControl({ editor, disabled }: { editor: NonNullable<Editor>; disabled: boolean; }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const apply = () => {
    if (isSafeLinkHref(url)) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }
    setOpen(false);
    setUrl('');
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setOpen(false);
    setUrl('');
  };

  return (
    <span className='rich-text-editor__link'>
      <ToolbarButton
        label='Link'
        icon={<span>&#128279;</span>}
        active={editor.isActive('link')}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      />
      {open
        ? (
          <span className='rich-text-editor__link-popover' role='group' aria-label='Edit link'>
            <input
              type='text'
              aria-label='Link URL'
              value={url}
              placeholder='https://...'
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  apply();
                }
              }}
            />
            <button type='button' onClick={apply}>Apply link</button>
            <button type='button' onClick={remove}>Remove link</button>
          </span>
        )
        : null}
    </span>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  variant = 'full',
  placeholder,
  editable = true,
  id,
  'aria-label': ariaLabel,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const attributes: Record<string, string> = { class: 'rich-text-editor__content' };
  if (id) attributes.id = id;
  if (ariaLabel) attributes['aria-label'] = ariaLabel;

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        horizontalRule: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      Markdown.configure({
        html: false,
        linkify: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editorProps: { attributes },
    onUpdate: ({ editor }) => onChangeRef.current(getMarkdown(editor)),
  });

  // Sync external value changes (modal re-open, sibling edits) without a feedback
  // loop: only replace content when the incoming markdown differs from what the
  // editor already holds, and never re-emit an update.
  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const commandKeys = variant === 'compact' ? COMPACT_COMMANDS : FULL_COMMANDS;
  const controlsDisabled = !editable || !editor;

  return (
    <div className='rich-text-editor'>
      <div className='rich-text-editor__toolbar' role='toolbar' aria-label='Formatting'>
        {commandKeys.map((key) => {
          const spec = COMMANDS[key];
          return (
            <ToolbarButton
              key={key}
              label={spec.label}
              icon={spec.icon}
              active={editor ? spec.isActive(editor) : false}
              disabled={controlsDisabled}
              onClick={() => editor && spec.run(editor)}
            />
          );
        })}
        {editor
          ? <LinkControl editor={editor} disabled={controlsDisabled} />
          : <ToolbarButton label='Link' icon={<span>&#128279;</span>} active={false} disabled />}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
