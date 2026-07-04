import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownView, {
  markdownToPlainText,
  renderMarkdownToSafeHtml,
} from '../../../src/renderer/components/ui/MarkdownView';

describe('renderMarkdownToSafeHtml', () => {
  it('renders the essentials marks and nodes to their expected tags', () => {
    const html = renderMarkdownToSafeHtml(
      '# Title\n\n## Sub\n\n### Small\n\nA **bold** and *italic* and ~~struck~~ and `code` word.\n\n'
        + '- one\n- two\n\n1. first\n2. second\n\n> a quote',
    );

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Sub</h2>');
    expect(html).toContain('<h3>Small</h3>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<s>struck</s>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<blockquote>');
  });

  it('keeps http/https/mailto links and hardens them with rel + target', () => {
    const html = renderMarkdownToSafeHtml('[site](https://example.com)');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('>site</a>');
  });

  it('never emits an anchor for a javascript: link (markdown-it refuses to linkify it)', () => {
    const html = renderMarkdownToSafeHtml('[click](javascript:alert(1))');

    expect(html).not.toContain('<a');
    expect(html).not.toContain('href=');
    expect(html).toContain('click');
  });

  it('never emits an anchor for a data: link', () => {
    const html = renderMarkdownToSafeHtml('[x](data:text/html;base64,PHNjcmlwdD4=)');

    expect(html).not.toContain('<a');
    expect(html).not.toContain('href=');
  });

  it('strips the href from a rendered anchor whose scheme is not http/https/mailto', () => {
    // markdown-it DOES render relative links as anchors, so this exercises the
    // DOMPurify afterSanitizeAttributes hook that removes non-allow-listed hrefs.
    const html = renderMarkdownToSafeHtml('[local](/some/relative/path)');

    expect(html).toContain('<a');
    expect(html).not.toContain('href=');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('>local</a>');
  });

  it('escapes rather than emits raw HTML embedded in the markdown source', () => {
    const html = renderMarkdownToSafeHtml(
      'before <script>window.evil()</script> <img src=x onerror=alert(1)> after',
    );

    // No executable/embeddable tags survive; the source is escaped to inert text.
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdownToSafeHtml('')).toBe('');
  });
});

describe('markdownToPlainText', () => {
  it('strips formatting to a single-line plain-text preview', () => {
    expect(markdownToPlainText('A **bold** and *italic* word')).toBe('A bold and italic word');
  });

  it('flattens headings and lists into readable text', () => {
    const text = markdownToPlainText('# Title\n\n- one\n- two');
    expect(text).toContain('Title');
    expect(text).toContain('one');
    expect(text).toContain('two');
    expect(text).not.toContain('#');
    expect(text).not.toContain('- ');
  });

  it('returns an empty string for empty/nullish input', () => {
    expect(markdownToPlainText('')).toBe('');
    expect(markdownToPlainText(null)).toBe('');
    expect(markdownToPlainText(undefined)).toBe('');
  });
});

describe('MarkdownView', () => {
  it('renders sanitized markdown into a themed container', () => {
    const { container } = render(<MarkdownView markdown='**hi** there' className='text-sm' />);
    const view = container.querySelector('.markdown-view');

    expect(view).not.toBeNull();
    expect(view?.className).toContain('text-sm');
    expect(view?.innerHTML).toContain('<strong>hi</strong>');
  });

  it('renders nothing for null, undefined, or whitespace-only markdown', () => {
    const { container: a } = render(<MarkdownView markdown={null} />);
    const { container: b } = render(<MarkdownView markdown={undefined} />);
    const { container: c } = render(<MarkdownView markdown='   ' />);

    expect(a.querySelector('.markdown-view')).toBeNull();
    expect(b.querySelector('.markdown-view')).toBeNull();
    expect(c.querySelector('.markdown-view')).toBeNull();
  });
});
