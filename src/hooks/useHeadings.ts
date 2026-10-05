import { useMemo } from 'react';
import GithubSlugger from 'github-slugger';
import { HeadingItem } from '../types';

export function useHeadings(markdown: string): HeadingItem[] {
  return useMemo(() => {
    if (!markdown) return [];
    
    // Normalize CRLF to LF so Windows/Obsidian line endings work perfectly
    const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const headings: HeadingItem[] = [];
    const slugger = new GithubSlugger();
    let insideCodeBlock = false;

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Ignore code blocks
      if (trimmed.startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        return;
      }
      if (insideCodeBlock) return;

      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        
        // Remove HTML tags, markdown formatting, links, and highlight tags from title for TOC
        const cleanTitle = rawTitle
          .replace(/<[^>]*>/g, '')
          .replace(/==/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text [text](url) -> text
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
