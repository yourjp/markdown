import React, { forwardRef, useRef } from 'react';

interface MarkdownEditorProps {
  markdown: string;
  onChange: (newMarkdown: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ markdown, onChange, onScroll }, ref) => {
    const lines = markdown.split('\n');
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      if (onScroll) {
        onScroll(e as any);
      }
    };

    return (
      <div ref={ref} className="h-full w-full flex overflow-hidden bg-white dark:bg-slate-900 text-black dark:text-slate-100 font-mono text-sm leading-relaxed border-r border-gray-200 dark:border-gray-800">
        {/* Line Numbers column synced with textarea scroll */}
        <div
          ref={lineNumbersRef}
          className="w-12 py-4 select-none text-right pr-3 text-gray-400 dark:text-slate-500 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0 overflow-hidden"
        >
          {lines.map((_, idx) => (
            <div key={idx} className="h-6 leading-6 text-xs">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Primary Textarea Editor */}
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleTextareaScroll}
          spellCheck={false}
          className="flex-1 h-full p-4 bg-transparent resize-none outline-none font-mono text-sm leading-6 text-gray-900 dark:text-gray-100 overflow-y-auto whitespace-pre tab-4"
          placeholder="여기에 마크다운 텍스트를 입력하거나 편집하세요..."
        />
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
