import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHeadings } from './useHeadings';

describe('useHeadings', () => {
  it('extracts headings across LF, CRLF, and CR line endings', () => {
    const markdown = '# Title\r\n## Section\r### Legacy Mac';

    const { result } = renderHook(() => useHeadings(markdown));

    expect(result.current).toEqual([
      { id: 'title', title: 'Title', level: 1 },
      { id: 'section', title: 'Section', level: 2 },
      { id: 'legacy-mac', title: 'Legacy Mac', level: 3 },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const markdown = ['# Real', '```md', '# Not a heading', '```', '## Also Real'].join('\n');

    const { result } = renderHook(() => useHeadings(markdown));

    expect(result.current.map((heading) => heading.title)).toEqual(['Real', 'Also Real']);
  });

  it('cleans markdown, links, highlight syntax, and HTML from heading titles', () => {
    const markdown = '## **See** [Docs](https://example.com) ==Now== <span>Today</span>';

    const { result } = renderHook(() => useHeadings(markdown));

    expect(result.current[0]).toEqual({
      id: 'see-docs-now-today',
      title: 'See Docs Now Today',
      level: 2,
    });
  });

  it('generates unique slugs for repeated headings', () => {
    const { result } = renderHook(() => useHeadings('# Repeat\n# Repeat\n# Repeat'));

    expect(result.current.map((heading) => heading.id)).toEqual(['repeat', 'repeat-1', 'repeat-2']);
  });
});
