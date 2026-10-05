import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('renders common markdown blocks', () => {
    render(
      <MarkdownView
        markdown={'# Title\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst ok = true;\n```'}
        zoomLevel={1}
        searchQuery=""
        theme="light"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('renders Obsidian highlight syntax as mark elements', () => {
    const { container } = render(
      <MarkdownView markdown="This is ==important==" zoomLevel={1} searchQuery="" theme="light" />,
    );

    expect(container.querySelector('mark')).toHaveTextContent('important');
  });

  it('highlights plain paragraph text for a search query', () => {
    const { container } = render(
      <MarkdownView markdown="Find this word" zoomLevel={1} searchQuery="this" theme="light" />,
    );

    expect(container.querySelector('p mark')).toHaveTextContent('this');
  });

  it('reports source line and target checked state when a task checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <MarkdownView
        markdown={'Intro\n- [ ] first task\n- [x] second task'}
        zoomLevel={1}
        searchQuery=""
        theme="light"
        onToggleTaskListItem={onToggle}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith(1, true, expect.any(String));
  });

  it('renders bookmark icon marker when a line has a bookmark', () => {
    const bookmarks = [
      { id: 'bm-1', title: '중요 섹션', lineIndex: 0, snippet: 'Title', createdAt: Date.now() },
      { id: 'bm-2', title: '본문 내용', lineIndex: 2, snippet: 'Paragraph text', createdAt: Date.now() },
    ];

    render(
      <MarkdownView
        markdown={'# Title\n\nParagraph text'}
        zoomLevel={1}
        searchQuery=""
        theme="light"
        bookmarks={bookmarks}
      />
    );

    expect(screen.getByTitle(/책갈피: 중요 섹션/)).toBeInTheDocument();
    expect(screen.getByTitle(/책갈피: 본문 내용/)).toBeInTheDocument();
  });

  it('renders bookmark icon marker and data-line-index inside tables', () => {
    const tableMd = `Line 1
Line 2

| 목적 | 추천 호텔 | 핵심 이유 |
| --- | --- | --- |
| Four Points | Sheraton | 신축 |
| 전망 중심 | Novotel | 국회 |
| 도보 관광 | Mercure | 중심 |
| 기차 이동 | Courtyard | Keleti |
| 취사 숙박 | Millennium | 아파트 |
| 밤 문화 | Moxy | 거리 |
| 럭셔리 | St. Regis | Palace |`;

    const bookmarks = [
      { id: 'bm-train', title: '기차 이동 Courtyard Keleti', lineIndex: 8, snippet: '기차 이동', createdAt: Date.now() },
    ];

    const { container } = render(
      <MarkdownView
        markdown={tableMd}
        zoomLevel={1}
        searchQuery=""
        theme="light"
        bookmarks={bookmarks}
      />
    );

    const trs = container.querySelectorAll('tr');
    expect(trs.length).toBe(8); // 1 header + 7 body rows
    expect(trs[4]).toHaveAttribute('data-line-index', '8');
    expect(trs[4]).toHaveTextContent('기차 이동');

    // Should display bookmark icon inside the bookmarked row (Line 9 in 1-based display)
    expect(screen.getByTitle(/책갈피: 기차 이동 Courtyard Keleti \(Line 9\)/)).toBeInTheDocument();
  });
});
