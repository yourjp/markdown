import { describe, expect, it } from 'vitest';
import { BookmarkItem } from '../types';
import { adjustBookmarksOnContentChange } from './bookmarkTracking';

describe('adjustBookmarksOnContentChange', () => {
  const createBookmark = (id: string, title: string, lineIndex: number, snippet?: string): BookmarkItem => ({
    id,
    title,
    lineIndex,
    snippet: snippet || title,
    createdAt: Date.now(),
  });

  it('returns same bookmarks when content is identical', () => {
    const bookmarks = [createBookmark('bm-1', 'Title', 2)];
    const content = 'Line 0\nLine 1\nTitle\nLine 3';
    const result = adjustBookmarksOnContentChange(bookmarks, content, content);
    expect(result).toEqual(bookmarks);
  });

  it('shifts bookmarks down when lines are added at the top', () => {
    const bookmarks = [
      createBookmark('bm-1', 'First', 1, 'First'),
      createBookmark('bm-2', 'Second', 3, 'Second'),
    ];
    const oldContent = 'Header\nFirst\nBody\nSecond';
    // Adding 2 new lines at the top
    const newContent = 'NewTop1\nNewTop2\nHeader\nFirst\nBody\nSecond';

    const result = adjustBookmarksOnContentChange(bookmarks, oldContent, newContent);
    expect(result[0].lineIndex).toBe(3); // 1 + 2 = 3
    expect(result[1].lineIndex).toBe(5); // 3 + 2 = 5
  });

  it('shifts bookmarks up when lines are deleted above them', () => {
    const bookmarks = [
      createBookmark('bm-1', 'Top', 0, 'Top'),
      createBookmark('bm-2', 'Target', 4, 'Target'),
    ];
    const oldContent = 'Top\nDelete1\nDelete2\nDelete3\nTarget\nFooter';
    // Deleted Delete1, Delete2, Delete3
    const newContent = 'Top\nTarget\nFooter';

    const result = adjustBookmarksOnContentChange(bookmarks, oldContent, newContent);
    expect(result[0].lineIndex).toBe(0); // Top remains at line 0
    expect(result[1].lineIndex).toBe(1); // Target moves from line 4 to line 1 (-3)
  });

  it('keeps bookmarks before the insertion point unchanged and shifts those after it', () => {
    const bookmarks = [
      createBookmark('bm-1', 'Before', 1, 'Before'),
      createBookmark('bm-2', 'After', 4, 'After'),
    ];
    const oldContent = 'L0\nBefore\nL2\nL3\nAfter\nL5';
    // Insert 2 lines between L2 and L3 (at line 3)
    const newContent = 'L0\nBefore\nL2\nInserted1\nInserted2\nL3\nAfter\nL5';

    const result = adjustBookmarksOnContentChange(bookmarks, oldContent, newContent);
    expect(result[0].lineIndex).toBe(1); // Before stays at 1
    expect(result[1].lineIndex).toBe(6); // After moves from 4 to 6 (+2)
  });

  it('relocates bookmark by snippet matching when modified inside edited range', () => {
    const bookmarks = [
      createBookmark('bm-1', 'Meeting Notes', 2, '## Meeting Notes 2026'),
    ];
    const oldContent = 'Header\nIntro\n## Meeting Notes 2026\nItem 1\nItem 2';
    // Text on line 2 modified slightly and lines inserted above it
    const newContent = 'Header\nIntro\nExtra Line\n## Meeting Notes 2026 (Updated)\nItem 1\nItem 2';

    const result = adjustBookmarksOnContentChange(bookmarks, oldContent, newContent);
    expect(result[0].lineIndex).toBe(3);
  });

  it('clamps bookmark line index within bounds when document is shortened', () => {
    const bookmarks = [
      createBookmark('bm-1', 'Near End', 10, 'Near End'),
    ];
    const oldContent = Array.from({ length: 15 }, (_, i) => `Line ${i}`).join('\n');
    const newContent = 'Line 0\nLine 1'; // shrunk to 2 lines

    const result = adjustBookmarksOnContentChange(bookmarks, oldContent, newContent);
    expect(result[0].lineIndex).toBe(1); // clamped to last available line (index 1)
  });
});
