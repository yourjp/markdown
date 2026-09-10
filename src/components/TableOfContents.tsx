import React from 'react';
import { HeadingItem } from '../types';
import { ListTree } from 'lucide-react';

interface TableOfContentsProps {
  headings: HeadingItem[];
  activeId: string;
  onSelectHeading: (id: string) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  headings,
  activeId,
  onSelectHeading,
}) => {
  return (
    <aside className="w-64 min-w-[200px] max-w-[320px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0 select-none overflow-hidden">
      <div className="p-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2 font-bold text-xs uppercase tracking-wider toc-header-text">
        <ListTree size={16} />
        <span className="font-bold">Table of Contents</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {headings.length === 0 ? (
          <div className="text-xs italic p-2 text-center toc-item-text">
            표시할 목차가 없습니다
          </div>
        ) : (
          headings.map((heading) => {
            const isActive = activeId === heading.id;
            const indentClass =
              heading.level === 1
                ? 'pl-2 font-bold'
                : heading.level === 2
                ? 'pl-5 text-sm font-bold'
                : heading.level === 3
                ? 'pl-8 text-xs font-semibold'
                : 'pl-11 text-xs font-semibold';

            return (
              <button
                key={heading.id}
                onClick={() => onSelectHeading(heading.id)}
                className={`w-full text-left py-2 pr-2 rounded-md transition-all truncate block text-sm ${indentClass} ${
                  isActive ? 'toc-item-active' : 'toc-item-text'
                }`}
                title={heading.title}
              >
                {heading.title}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
