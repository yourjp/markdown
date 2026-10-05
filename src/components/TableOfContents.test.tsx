import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableOfContents } from './TableOfContents';

describe('TableOfContents', () => {
  it('renders an empty state when there are no headings', () => {
    render(<TableOfContents headings={[]} activeId="" onSelectHeading={vi.fn()} />);

    expect(screen.getByText('표시할 목차가 없습니다')).toBeInTheDocument();
  });

  it('renders heading count, active item, and calls onSelectHeading', () => {
    const onSelectHeading = vi.fn();
    render(
      <TableOfContents
        headings={[
          { id: 'intro', title: 'Intro', level: 1 },
          { id: 'details', title: 'Details', level: 2 },
        ]}
        activeId="details"
        onSelectHeading={onSelectHeading}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Details/ })).toHaveClass('toc-item-active');

    fireEvent.click(screen.getByRole('button', { name: /Intro/ }));
    expect(onSelectHeading).toHaveBeenCalledWith('intro');
  });

  it('strips existing numbering, leaves H1 unnumbered, and generates clean hierarchical numbering for H2+', () => {
    const onSelectHeading = vi.fn();
    render(
      <TableOfContents
        headings={[
          { id: 'doc-title', title: '1. 메인 문서 제목', level: 1 },
          { id: 'dev-goals', title: '1. 개발 목표', level: 2 },
          { id: 'sub-features', title: '1.1 핵심 기능', level: 3 },
          { id: 'alphabet-item', title: 'A) 참고 사항', level: 3 },
          { id: 'sec-2', title: '2. 추후 계획', level: 2 },
        ]}
        activeId="dev-goals"
        onSelectHeading={onSelectHeading}
      />,
    );

    // Should display clean titles without redundant existing numbering
    expect(screen.getByText('메인 문서 제목')).toBeInTheDocument();
    expect(screen.getByText('개발 목표')).toBeInTheDocument();
    expect(screen.getByText('핵심 기능')).toBeInTheDocument();
    expect(screen.getByText('참고 사항')).toBeInTheDocument();
    expect(screen.getByText('추후 계획')).toBeInTheDocument();

    // H1 has no numbering badge, H2 gets '1.', '2.', H3 get 'A.' and 'B.'
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
  });

  it('calls onClose from the close control', () => {
    const onClose = vi.fn();
    render(<TableOfContents headings={[]} activeId="" onClose={onClose} onSelectHeading={vi.fn()} />);

    fireEvent.click(screen.getByTitle('사이드바 닫기 (Ctrl+B)'));

    expect(onClose).toHaveBeenCalled();
  });

  it('renders bookmarks tab, lists bookmark items and handles clicks', () => {
    const onSelectBookmark = vi.fn();
    const onRemoveBookmark = vi.fn();
    const bookmarks = [
      { id: 'bm-1', title: '설정 방법', lineIndex: 12, snippet: '환경 설정 안내', createdAt: Date.now() },
    ];

    render(
      <TableOfContents
        headings={[{ id: 'h1', title: '개요', level: 1 }]}
        activeId=""
        onSelectHeading={vi.fn()}
        bookmarks={bookmarks}
        onSelectBookmark={onSelectBookmark}
        onRemoveBookmark={onRemoveBookmark}
      />
    );

    // Switch to bookmarks tab
    fireEvent.click(screen.getByText('책갈피'));
    expect(screen.getByText('설정 방법')).toBeInTheDocument();
    expect(screen.getByText('L13')).toBeInTheDocument();

    // Click bookmark item to jump
    fireEvent.click(screen.getByText('설정 방법'));
    expect(onSelectBookmark).toHaveBeenCalledWith(bookmarks[0]);

    // Click remove button
    fireEvent.click(screen.getByTitle('책갈피 삭제'));
    expect(onRemoveBookmark).toHaveBeenCalledWith('bm-1');
  });

  it('supports toggling bookmark sort order between position (위치순) and creation (생성순)', () => {
    localStorage.clear();
    const bookmarks = [
      { id: 'bm-1', title: 'A_앞쪽라인_과거생성', lineIndex: 5, snippet: '5번 줄', createdAt: 1000 },
      { id: 'bm-2', title: 'B_뒤쪽라인_최신생성', lineIndex: 50, snippet: '50번 줄', createdAt: 5000 },
    ];

    render(
      <TableOfContents
        headings={[{ id: 'h1', title: '개요', level: 1 }]}
        activeId=""
        onSelectHeading={vi.fn()}
        bookmarks={bookmarks}
      />
    );

    // Switch to bookmarks tab (default is position sort order: lineIndex ascending)
    fireEvent.click(screen.getByText('책갈피'));
    
    let titles = screen.getAllByText(/_[앞뒤]쪽라인_/).map((el) => el.textContent);
    expect(titles).toEqual(['A_앞쪽라인_과거생성', 'B_뒤쪽라인_최신생성']);

    // Switch to creation order (생성순: createdAt descending, newest first)
    const createdBtn = screen.getByRole('button', { name: /생성순/ });
    fireEvent.click(createdBtn);

    titles = screen.getAllByText(/_[앞뒤]쪽라인_/).map((el) => el.textContent);
    expect(titles).toEqual(['B_뒤쪽라인_최신생성', 'A_앞쪽라인_과거생성']);

    // Switch back to position order (위치순)
    const positionBtn = screen.getByRole('button', { name: /위치순/ });
    fireEvent.click(positionBtn);

    titles = screen.getAllByText(/_[앞뒤]쪽라인_/).map((el) => el.textContent);
    expect(titles).toEqual(['A_앞쪽라인_과거생성', 'B_뒤쪽라인_최신생성']);
  });
});
