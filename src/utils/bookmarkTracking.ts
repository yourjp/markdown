import { BookmarkItem } from '../types';

/**
 * Clean markdown formatting to extract pure text for content matching
 */
export function cleanBookmarkText(text: string): string {
  return text
    .replace(/^[#\s\-\*\+>\|]+/, '')
    .replace(/[\|]+$/, '')
    .replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Automatically adjusts bookmark line indices when the document content is edited
 * (lines inserted, deleted, or shifted).
 */
export function adjustBookmarksOnContentChange(
  bookmarks: BookmarkItem[],
  oldContent: string,
  newContent: string
): BookmarkItem[] {
  if (!bookmarks || bookmarks.length === 0) return bookmarks;
  if (oldContent === newContent) return bookmarks;

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // If contents didn't change line structure
  if (oldLines.length === newLines.length && oldLines.every((l, i) => l === newLines[i])) {
    return bookmarks;
  }

  // 1. Calculate common prefix length
  let prefixLen = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefixLen < minLen && oldLines[prefixLen] === newLines[prefixLen]) {
    prefixLen++;
  }

  // 2. Calculate common suffix length
  let suffixLen = 0;
  const maxSuffix = minLen - prefixLen;
  while (
    suffixLen < maxSuffix &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldChangedStart = prefixLen;
  const oldChangedEnd = oldLines.length - suffixLen;
  const newChangedStart = prefixLen;
  const newChangedEnd = newLines.length - suffixLen;
  const delta = newLines.length - oldLines.length;

  return bookmarks
    .map((bm) => {
      let newLineIndex = bm.lineIndex;

      if (bm.lineIndex < oldChangedStart) {
        // Unchanged prefix above edit
        newLineIndex = bm.lineIndex;
      } else if (bm.lineIndex >= oldChangedEnd) {
        // Unchanged suffix below edit: shifted by delta
        newLineIndex = bm.lineIndex + delta;
      } else {
        // Inside modified region: attempt content-based relocation
        const cleanSnippet = cleanBookmarkText(bm.snippet || bm.title || '');
        let found = -1;

        if (cleanSnippet && cleanSnippet.length >= 2) {
          // Check exact line content in new changed region first
          for (let i = newChangedStart; i < newChangedEnd; i++) {
            const cleanNew = cleanBookmarkText(newLines[i] || '');
            if (cleanNew.includes(cleanSnippet) || cleanSnippet.includes(cleanNew)) {
              found = i;
              break;
            }
          }

          // If not found in changed region, expand search window
          if (found === -1) {
            const searchStart = Math.max(0, newChangedStart - 8);
            const searchEnd = Math.min(newLines.length, newChangedEnd + 8);
            for (let i = searchStart; i < searchEnd; i++) {
              const cleanNew = cleanBookmarkText(newLines[i] || '');
              if (cleanNew && (cleanNew.includes(cleanSnippet) || cleanSnippet.includes(cleanNew))) {
                found = i;
                break;
              }
            }
          }
        }

        if (found !== -1) {
          newLineIndex = found;
        } else {
          // Fallback: estimate relative offset within changed block
          if (oldChangedEnd > oldChangedStart) {
            const ratio = (bm.lineIndex - oldChangedStart) / (oldChangedEnd - oldChangedStart);
            const estimated = Math.round(newChangedStart + ratio * Math.max(0, newChangedEnd - newChangedStart));
            newLineIndex = estimated;
          } else {
            newLineIndex = newChangedStart;
          }
        }
      }

      // Clamp within valid line bounds
      newLineIndex = Math.max(0, Math.min(newLines.length - 1, newLineIndex));

      return {
        ...bm,
        lineIndex: newLineIndex,
      };
    })
    .sort((a, b) => a.lineIndex - b.lineIndex);
}
