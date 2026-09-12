import { useMemo } from 'react';
import GithubSlugger from 'github-slugger';
import { HeadingItem } from '../types';

export function useHeadings(markdown: string): HeadingItem[] {
  return useMemo(() => {
    const lines = markdown.split('\n');
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
        
        const id = slugger.slug(cleanTitle);

        headings.push({
          id,
          title: cleanTitle,
          level,
        });
      }
    });

    return headings;
  }, [markdown]);
}
