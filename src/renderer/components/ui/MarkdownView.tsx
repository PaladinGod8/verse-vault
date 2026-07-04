import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

/**
 * Read-only renderer for the markdown produced by {@link RichTextEditor}.
 *
 * Deliberately does NOT mount TipTap/ProseMirror — detail pages render many
 * prose fields at once, so this converts markdown -> HTML with markdown-it
 * (`html: false`, so raw HTML in the source is escaped, never parsed) and then
 * hard-sanitizes with DOMPurify before injecting.
 */
export type MarkdownViewProps = {
  markdown?: string | null;
  className?: string;
};

const md = new MarkdownIt({ html: false, linkify: false, breaks: false });

const SAFE_HREF = /^(https?:|mailto:)/i;

// DOMPurify hooks are global + stateful; register the link hardener exactly once.
let linkHookRegistered = false;
function ensureLinkHook(): void {
  if (linkHookRegistered) return;
  linkHookRegistered = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return;
    const href = node.getAttribute('href');
    if (!href || !SAFE_HREF.test(href)) {
      // Kills javascript:/data:/relative hrefs even though `href` is allow-listed.
      node.removeAttribute('href');
    }
    node.setAttribute('rel', 'noopener noreferrer nofollow');
    node.setAttribute('target', '_blank');
  });
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  's',
  'code',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
];
const ALLOWED_ATTR = ['href', 'rel', 'target'];

/**
 * Pure markdown -> safe-HTML transform. Exported so the sanitization branches
 * (link hardening, tag/attr allow-listing) are unit-testable without React.
 */
export function renderMarkdownToSafeHtml(markdown: string): string {
  if (!markdown) return '';
  ensureLinkHook();
  const rawHtml = md.render(markdown);
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Flattens markdown to a single-line plain-text preview for truncated card /
 * table cells, where rendering block elements would look wrong. Safe: reads
 * textContent from the sanitized render, so no markup or injection leaks.
 */
export function markdownToPlainText(markdown?: string | null): string {
  if (!markdown) return '';
  const html = renderMarkdownToSafeHtml(markdown);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export default function MarkdownView({ markdown, className }: MarkdownViewProps) {
  if (!markdown || !markdown.trim()) return null;
  const html = renderMarkdownToSafeHtml(markdown);
  return (
    <div
      className={`markdown-view ${className ?? ''}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
