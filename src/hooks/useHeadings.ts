import { useMemo } from 'react';
import GithubSlugger from 'github-slugger';
import { HeadingItem } from '../types';

export function useHeadings(markdown: string): HeadingItem[] {
  return useMemo(() => {
    if (!markdown) return [];

    // Normalize Windows/Obsidian CRLF (and legacy CR) before parsing headings.
    // Without this, a trailing \r can stay attached to heading lines and break
    // strict heading regex/title cleanup in some editors and render paths.
    const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const headings: HeadingItem[] = [];
    const slugger = new GithubSlugger();

    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        
        // Remove HTML tags, markdown formatting, and == highlight tags from title for TOC
        const cleanTitle = rawTitle
          .replace(/<[^>]*>/g, '')
          .replace(/==/g, '')
          .replace(/[\*\_`~]/g, '')
          .trim();
        
        if (cleanTitle) {
          const id = slugger.slug(cleanTitle);

          headings.push({
            id,
            title: cleanTitle,
            level,
          });
        }
      }
    });

    return headings;
  }, [markdown]);
}
