import { useMemo } from 'react';
import { HeadingItem } from '../types';

export function useHeadings(markdown: string): HeadingItem[] {
  return useMemo(() => {
    const lines = markdown.split('\n');
    const headings: HeadingItem[] = [];
    const idCounts: Record<string, number> = {};

    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        
        // Remove HTML tags (e.g., <span style="...">...</span>) and markdown formatting from title for TOC
        const cleanTitle = rawTitle
          .replace(/<[^>]*>/g, '') // Strip HTML tags
          .replace(/[\*\_`~]/g, '') // Strip markdown formatting
          .trim();
        
        let id = cleanTitle
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\uac00-\ud7a3\s-]/g, '')
          .replace(/\s+/g, '-');
        
        if (!id) id = 'heading';

        if (idCounts[id]) {
          idCounts[id]++;
          id = `${id}-${idCounts[id]}`;
        } else {
          idCounts[id] = 1;
        }

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
