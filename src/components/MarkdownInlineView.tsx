import React, { forwardRef, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownInlineViewProps {
  markdown: string;
  zoomLevel: number;
  searchQuery: string;
  onChangeMarkdown: (newMarkdown: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownInlineView = forwardRef<HTMLDivElement, MarkdownInlineViewProps>(
  ({ markdown, zoomLevel, searchQuery, onChangeMarkdown, onScroll }, ref) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const lines = markdown.split('\n');

    // Focus input element when editing a line
    useEffect(() => {
      if (editingIndex !== null && inputRef.current) {
        inputRef.current.focus();
      }
    }, [editingIndex]);

    const handleCommit = (index: number) => {
      if (editingIndex === null) return;
      const updatedLines = [...lines];
      updatedLines[index] = editValue;
      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(null);
    };

    const handleCommitAndGoNext = (index: number) => {
      const updatedLines = [...lines];
      updatedLines[index] = editValue;

      // If at the last line, append a new empty line
      if (index === lines.length - 1) {
        updatedLines.push('');
      }

      const nextIndex = index + 1;
      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(nextIndex);
      setEditValue(updatedLines[nextIndex] || '');
    };

    const handleCommitAndGoPrev = (index: number) => {
      if (index <= 0) return;
      const updatedLines = [...lines];
      updatedLines[index] = editValue;

      const prevIndex = index - 1;
      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(prevIndex);
      setEditValue(updatedLines[prevIndex] || '');
    };

    // Insert a new empty line below current line
    const handleInsertEmptyLineAfter = (index: number) => {
      const updatedLines = [...lines];
      updatedLines[index] = editValue;
      updatedLines.splice(index + 1, 0, '');

      const nextIndex = index + 1;
      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(nextIndex);
      setEditValue('');
    };

    // Insert a new empty line above current line
    const handleInsertEmptyLineBefore = (index: number) => {
      const updatedLines = [...lines];
      updatedLines[index] = editValue;
      updatedLines.splice(index, 0, '');

      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(index);
      setEditValue('');
    };

    // Delete current line completely
    const handleDeleteLine = (index: number) => {
      if (lines.length <= 1) {
        // If it's the only line, clear it
        onChangeMarkdown('');
        setEditingIndex(0);
        setEditValue('');
        return;
      }

      const updatedLines = [...lines];
      updatedLines.splice(index, 1);

      const targetIndex = Math.min(index, updatedLines.length - 1);
      onChangeMarkdown(updatedLines.join('\n'));
      setEditingIndex(targetIndex);
      setEditValue(updatedLines[targetIndex] || '');
    };

    const applyFormatting = (inputEl: HTMLInputElement | HTMLTextAreaElement, prefix: string, suffix: string = prefix) => {
      const start = inputEl.selectionStart || 0;
      const end = inputEl.selectionEnd || 0;
      const selected = editValue.substring(start, end);
      const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
      const newValue = editValue.substring(0, start) + replacement + editValue.substring(end);
      setEditValue(newValue);

      requestAnimationFrame(() => {
        if (inputEl) {
          const newCursorPos = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length;
          inputEl.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    };

    const removeAllFormatting = () => {
      // Strips headings (#), list prefixes (- * + 1.), quote (>), bold (**), italic (*), strikethrough (~~), highlight (==), inline code (`), links ([text](url))
      const cleaned = editValue
        .replace(/^(#+\s*|[\-\*\+]\s*|\d+\.\s*|>\s*)/, '') // Strip block prefixes
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
        .replace(/\*([^*]+)\*/g, '$1') // Italic
        .replace(/~~([^~]+)~~/g, '$1') // Strikethrough
        .replace(/==([^=]+)==/g, '$1') // Highlight
        .replace(/`([^`]+)`/g, '$1') // Inline code
      setEditValue(cleaned);
    };

    const applyLinePrefix = (prefix: string) => {
      const cleanValue = editValue.replace(/^(#+\s*|[\-\*\+]\s*|\d+\.\s*|>\s*)/, '');
      setEditValue(`${prefix}${cleanValue}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
      e.stopPropagation();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase();
        
        // 0. Remove All Formatting Shortcut: Ctrl+0 or Ctrl+\
        if (e.key === '0' || e.key === '\\') {
          e.preventDefault();
          removeAllFormatting();
          return;
        }

        // 0.1 Delete Current Line Shortcut: Ctrl+Shift+K or Ctrl+D
        if ((key === 'k' && e.shiftKey) || (key === 'd' && !e.shiftKey)) {
          e.preventDefault();
          handleDeleteLine(index);
          return;
        }

        // 1. Heading (H1, H2, H3) Shortcuts: Ctrl+1, Ctrl+2, Ctrl+3
        if (e.key === '1') {
          e.preventDefault();
          applyLinePrefix('# ');
          return;
        } else if (e.key === '2') {
          e.preventDefault();
          applyLinePrefix('## ');
          return;
        } else if (e.key === '3') {
          e.preventDefault();
          applyLinePrefix('### ');
          return;
        }

        // 2. Text Formatting Shortcuts
        if (key === 'b') {
          // Bold: **text**
          e.preventDefault();
          applyFormatting(e.currentTarget, '**');
          return;
        } else if (key === 'i') {
          // Italic: *text*
          e.preventDefault();
          applyFormatting(e.currentTarget, '*');
          return;
        } else if (key === 'h') {
          // Highlight: ==text==
          e.preventDefault();
          applyFormatting(e.currentTarget, '==');
          return;
        } else if (key === 'u' || (key === 'x' && e.shiftKey)) {
          // Strikethrough: ~~text~~
          e.preventDefault();
          applyFormatting(e.currentTarget, '~~');
          return;
        } else if (key === 'e') {
          // Inline Code: `code`
          e.preventDefault();
          applyFormatting(e.currentTarget, '`');
          return;
        } else if (key === 'k') {
          // Link: [text](url)
          e.preventDefault();
          applyFormatting(e.currentTarget, '[', '](https://)');
          return;
        } else if (key === 't') {
          // Task List Item: - [ ] text
          e.preventDefault();
          applyLinePrefix('- [ ] ');
          return;
        } else if (key === 'l') {
          // List Item: - text
          e.preventDefault();
          applyLinePrefix('- ');
          return;
        } else if (key === 'q') {
          // Blockquote: > text
          e.preventDefault();
          applyLinePrefix('> ');
          return;
        } else if (e.key === 'Enter') {
          // Ctrl+Enter: Insert new blank line below
          e.preventDefault();
          if (e.shiftKey) {
            handleInsertEmptyLineBefore(index);
          } else {
            handleInsertEmptyLineAfter(index);
          }
          return;
        }
      }

      if (e.key === 'Escape') {
        setEditingIndex(null);
      } else if (e.key === 'Backspace' && editValue === '') {
        // Backspace on empty line deletes the line
        e.preventDefault();
        handleDeleteLine(index);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handleCommitAndGoPrev(index);
        } else {
          handleCommitAndGoNext(index);
        }
      } else if (e.key === 'ArrowUp') {
        const inputEl = e.currentTarget;
        if (inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
          e.preventDefault();
          handleCommitAndGoPrev(index);
        }
      } else if (e.key === 'ArrowDown') {
        const inputEl = e.currentTarget;
        if (inputEl.selectionStart === editValue.length && inputEl.selectionEnd === editValue.length) {
          e.preventDefault();
          handleCommitAndGoNext(index);
        }
      }
    };

    const startEditingLine = (index: number) => {
      setEditingIndex(index);
      setEditValue(lines[index] || '');
    };

    const sanitizedMarkdown = markdown
      .replace(/(^|[^\~])\~([^\~]+)\~([^\~]|$)/g, (match, p1, p2, p3) => `${p1}&#126;${p2}&#126;${p3}`)
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto p-8 lg:p-12 markdown-body bg-white dark:bg-gray-900 transition-all"
        style={{ fontSize: `${zoomLevel * 100}%` }}
      >
        {lines.map((line, idx) => {
          const isEditing = editingIndex === idx;

          if (isEditing) {
            return (
              <div key={idx} className="my-1 flex items-center space-x-2">
                <span className="text-xs font-mono text-gray-400 font-normal select-none shrink-0">{idx + 1}</span>
                <input
                  ref={inputRef as any}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleCommit(idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="w-full bg-blue-50/20 dark:bg-blue-950/20 text-inherit border border-transparent rounded px-2 py-0.5 outline-none font-sans text-base leading-relaxed transition-all focus:border-transparent focus:ring-0"
                />
              </div>
            );
          }

          // Single line markdown renderer wrapper preserving GFM styling
          const lineSanitized = line
            .replace(/(^|[^\~])\~([^\~]+)\~([^\~]|$)/g, (match, p1, p2, p3) => `${p1}&#126;${p2}&#126;${p3}`)
            .replace(/==([^=]+)==/g, '<mark>$1</mark>');

          return (
            <div
              key={idx}
              tabIndex={0}
              onClick={() => startEditingLine(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEditingLine(idx);
                }
              }}
              className="group cursor-pointer rounded px-1.5 py-0.5 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all min-h-[26px]"
              title="클릭 또는 Enter 키를 눌러 해당 라인 즉시 편집"
            >
              {line.trim() === '' ? (
                <div className="h-5 text-gray-300 dark:text-gray-600 italic text-xs select-none">
                  (빈 줄 - 클릭 또는 Enter 키를 눌러 입력)
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                  rehypePlugins={[rehypeRaw, rehypeSlug]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isDark = document.documentElement.classList.contains('dark');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={isDark ? vscDarkPlus : ghcolors}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg shadow-sm my-2 border border-black dark:border-gray-800"
                          customStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#000000',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {lineSanitized}
                </ReactMarkdown>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

MarkdownInlineView.displayName = 'MarkdownInlineView';
