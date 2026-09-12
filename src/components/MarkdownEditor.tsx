import React, { forwardRef } from 'react';

interface MarkdownEditorProps {
  markdown: string;
  onChange: (newMarkdown: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ markdown, onChange, onScroll }, ref) => {
    const lines = markdown.split('\n');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Insert 2 spaces for tab
        const newValue = markdown.substring(0, start) + '  ' + markdown.substring(end);
        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    };

    return (
      <div className="h-full flex overflow-hidden bg-white dark:bg-slate-900 text-black dark:text-slate-100 font-mono text-sm leading-relaxed border-r border-gray-200 dark:border-gray-800">
        {/* Line Numbers */}
        <div className="w-12 py-4 select-none text-right pr-4 text-gray-400 dark:text-slate-500 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0">
          {lines.map((_, idx) => (
            <div key={idx} className="h-6 leading-6">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Text Area Input */}
        <div ref={ref} onScroll={onScroll} className="flex-1 h-full overflow-y-auto relative">
          <textarea
            value={markdown}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="w-full h-full p-4 bg-transparent resize-none outline-none font-mono text-sm leading-6 text-gray-900 dark:text-gray-100 whitespace-pre"
            placeholder="여기에 마크다운 텍스트를 입력하거나 편집하세요..."
            style={{ minHeight: `${Math.max(lines.length * 24 + 32, 500)}px` }}
          />
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
