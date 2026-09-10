import React, { forwardRef } from 'react';

interface MarkdownSourceProps {
  markdown: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownSource = forwardRef<HTMLDivElement, MarkdownSourceProps>(
  ({ markdown, onScroll }, ref) => {
    const lines = markdown.split('\n');

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm p-4 leading-relaxed"
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const match = line.match(/^(#{1,6})\s+(.+)$/);
              let headingId = '';
              if (match) {
                const cleanTitle = match[2]
                  .replace(/<[^>]*>/g, '')
                  .replace(/[\*\_`~]/g, '')
                  .trim();
                headingId = cleanTitle
                  .toLowerCase()
                  .replace(/[^\w\u4e00-\u9fa5\uac00-\ud7a3\s-]/g, '')
                  .replace(/\s+/g, '-');
              }

              return (
                <tr key={idx} id={headingId ? `source-heading-${headingId}` : undefined} className="hover:bg-gray-800/60">
                  <td className="w-12 text-right pr-4 text-gray-500 select-none border-r border-gray-800">
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
