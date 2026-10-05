import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores saved tabs and renders the active document in view mode', async () => {
    localStorage.setItem(
      'openTabs',
      JSON.stringify([
        { id: 'tab-a', name: 'A.md', content: '# A title', timestamp: 1 },
        { id: 'tab-b', name: 'B.md', content: '# B title\n\nBody', timestamp: 2 },
      ]),
    );
    localStorage.setItem('activeTabId', 'tab-b');
    localStorage.setItem('viewMode', 'view');

    render(<App />);

    expect(screen.getByText('A.md')).toBeInTheDocument();
    expect(screen.getAllByText('B.md').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: 'B title' })[0]).toBeInTheDocument();
  });

  it('updates active tab content from source mode and persists open tabs', () => {
    localStorage.setItem(
      'openTabs',
      JSON.stringify([{ id: 'tab-a', name: 'A.md', content: '# Original', timestamp: 1 }]),
    );
    localStorage.setItem('activeTabId', 'tab-a');
    localStorage.setItem('viewMode', 'source');

    render(<App />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '# Changed' } });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    const savedTabs = JSON.parse(localStorage.getItem('openTabs') || '[]');
    expect(savedTabs[0]).toMatchObject({
      id: 'tab-a',
      name: 'A.md',
      content: '# Changed',
      isModified: true,
    });
  });

  it('preserves and displays bookmarks loaded from localStorage', () => {
    localStorage.setItem(
      'openTabs',
      JSON.stringify([{ id: 'tab-bm', name: 'Notes.md', content: '# Section 1\n\nContent here', timestamp: 1 }]),
    );
    localStorage.setItem('activeTabId', 'tab-bm');
    localStorage.setItem(
      'markdown_app_bookmarks',
      JSON.stringify({
        'Notes.md': [
          {
            id: 'bm-1',
            title: 'Section 1',
            lineIndex: 0,
            snippet: '# Section 1',
            createdAt: 1000,
          },
        ],
      }),
    );

    render(<App />);

    expect(screen.getAllByText('Section 1').length).toBeGreaterThanOrEqual(1);
  });

  it('automatically adjusts bookmark line index when new lines are inserted above', () => {
    localStorage.setItem(
      'openTabs',
      JSON.stringify([{ id: 'tab-shift', name: 'Shift.md', content: 'Line 0\nLine 1\n# Target Section', timestamp: 1 }]),
    );
    localStorage.setItem('activeTabId', 'tab-shift');
    localStorage.setItem('viewMode', 'source');
    localStorage.setItem(
      'markdown_app_bookmarks',
      JSON.stringify({
        'Shift.md': [
          {
            id: 'bm-shift',
            title: 'Target Section',
            lineIndex: 2,
            snippet: '# Target Section',
            createdAt: 1000,
          },
        ],
      }),
    );

    render(<App />);

    // Add 2 new lines at the top in source mode textarea
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Top 1\nTop 2\nLine 0\nLine 1\n# Target Section' } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const savedBookmarks = JSON.parse(localStorage.getItem('markdown_app_bookmarks') || '{}');
    const shiftBookmarks = savedBookmarks['Shift.md'];
    expect(shiftBookmarks).toBeDefined();
    expect(shiftBookmarks[0].lineIndex).toBe(4); // 2 + 2 = 4
  });
});
