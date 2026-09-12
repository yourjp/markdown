import React, { forwardRef } from 'react';
import GithubSlugger from 'github-slugger';

interface MarkdownSourceProps {
  markdown: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownSource = forwardRef<HTMLDivElement, MarkdownSourceProps>(
  ({ markdown, onScroll }, ref) => {
    const lines = markdown.split('\n');
    const slugger = new GithubSlugger();

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto markdown-source bg-white dark:bg-slate-900 text-black dark:text-slate-100 font-mono text-sm p-4 leading-relaxed"
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const match = line.match(/^(#{1,6})\s+(.+)$/);
              let headingId = '';
              if (match) {
                const cleanTitle = match[2]
                  .replace(/<[^>]*>/g, '')
                  .replace(/==/g, '')
                  .replace(/[\*\_`~]/g, '')
                  .trim();
                headingId = slugger.slug(cleanTitle);
              }

              return (
                <tr key={idx} id={headingId ? `source-heading-${headingId}` : undefined} className="hover:bg-gray-100 dark:hover:bg-slate-800/60">
                  <td className="w-12 text-right pr-4 text-gray-400 dark:text-slate-500 select-none border-r border-gray-200 dark:border-slate-800">
                    {idx + 1}
                  </td>
                  <td className="pl-4 whitespace-pre-wrap break-all">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
);

MarkdownSource.displayName = 'MarkdownSource';
