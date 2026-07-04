// Integration guard: mounts the REAL editor (no tiptap mock) to prove the
// extension stack instantiates and tiptap-markdown parses content at runtime.
// Everything else about the wrapper is covered by richTextEditor.test.tsx with
// a mocked engine; this catches TipTap/tiptap-markdown breakage on upgrades.
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextEditor from '../../../src/renderer/components/ui/RichTextEditor';

describe('RichTextEditor real mount', () => {
  it('instantiates the extension stack and parses markdown content into formatted DOM', async () => {
    const { container } = render(
      <RichTextEditor value={'# Heading\n\n**bold** and *italic*'} onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(container.querySelector('.rich-text-editor__content strong')?.textContent)
        .toBe('bold');
    });
    expect(container.querySelector('.rich-text-editor__content h1')?.textContent).toBe('Heading');
    expect(container.querySelector('.rich-text-editor__content em')?.textContent).toBe('italic');
  });
});
