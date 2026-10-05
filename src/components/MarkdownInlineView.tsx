import React, { forwardRef, useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { CalloutBlock } from './CalloutBlock';
import { MarkdownImage } from './MarkdownImage';
import { preprocessMarkdown, parseStyleString } from '../utils/markdownEmbeds';
import { ThemeMode, BookmarkItem } from '../types';
import { Bookmark } from 'lucide-react';

interface MarkdownInlineViewProps {
  markdown: string;
  zoomLevel: number;
  searchQuery: string;
  theme?: ThemeMode;
  filePath?: string;
  bookmarks?: BookmarkItem[];
  onChangeMarkdown: (newMarkdown: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onEmbedImage?: (rawSrc: string, dataUrl: string, sourcePath?: string) => void;
}

interface LineItemProps {
  index: number;
  line: string;
  isEditing: boolean;
  bookmark?: BookmarkItem;
  theme?: ThemeMode;
  markdownComponents: any;
  onStartEdit: (index: number) => void;
  onCommit: (index: number, value: string) => void;
  onCommitAndGoNext: (index: number, value: string) => void;
  onCommitAndGoPrev: (index: number, value: string) => void;
  onInsertLineAfter: (index: number, value: string) => void;
  onInsertLineBefore: (index: number, value: string) => void;
  onDeleteLine: (index: number) => void;
  onCancelEdit: () => void;
}

const LineItem = memo(
  ({
    index,
    line,
    isEditing,
    bookmark,
    theme,
    markdownComponents,
    onStartEdit,
    onCommit,
    onCommitAndGoNext,
    onCommitAndGoPrev,
    onInsertLineAfter,
    onInsertLineBefore,
    onDeleteLine,
    onCancelEdit,
  }: LineItemProps) => {
    const [editVal, setEditVal] = useState<string>(line);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync line value and focus input when editing begins
    useEffect(() => {
      if (isEditing) {
        setEditVal(line);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
          }
        });
      }
    }, [isEditing]);

    const applyFormatting = (inputEl: HTMLInputElement, prefix: string, suffix: string = prefix) => {
      const start = inputEl.selectionStart || 0;
      const end = inputEl.selectionEnd || 0;
      const selected = editVal.substring(start, end);
      const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
      const newValue = editVal.substring(0, start) + replacement + editVal.substring(end);
      setEditVal(newValue);

      requestAnimationFrame(() => {
        if (inputEl) {
          const newCursorPos = selected
            ? start + prefix.length + selected.length + suffix.length
            : start + prefix.length;
          inputEl.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    };

    const removeAllFormatting = () => {
      const cleaned = editVal
        .replace(/^(#+\s*|[\-\*\+]\s*|\d+\.\s*|>\s*)/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/==([^=]+)==/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
      setEditVal(cleaned);
    };

    const applyLinePrefix = (prefix: string) => {
      const cleanValue = editVal.replace(/^(#+\s*|[\-\*\+]\s*|\d+\.\s*|>\s*)/, '');
      setEditVal(`${prefix}${cleanValue}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase();

        // Remove All Formatting Shortcut: Ctrl+0 or Ctrl+\
        if (e.key === '0' || e.key === '\\') {
          e.preventDefault();
          removeAllFormatting();
          return;
        }

        // Delete Current Line Shortcut: Ctrl+Shift+K or Ctrl+D
        if ((key === 'k' && e.shiftKey) || (key === 'd' && !e.shiftKey)) {
          e.preventDefault();
          onDeleteLine(index);
          return;
        }

        // Heading Shortcuts: Ctrl+1, Ctrl+2, Ctrl+3
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

        // Text Formatting Shortcuts
        if (key === 'b') {
          e.preventDefault();
          applyFormatting(e.currentTarget, '**');
          return;
        } else if (key === 'i') {
          e.preventDefault();
          applyFormatting(e.currentTarget, '*');
          return;
        } else if (key === 'h') {
          e.preventDefault();
          applyFormatting(e.currentTarget, '==');
          return;
        } else if (key === 'u' || (key === 'x' && e.shiftKey)) {
          e.preventDefault();
          applyFormatting(e.currentTarget, '~~');
          return;
        } else if (key === 'e') {
          e.preventDefault();
          applyFormatting(e.currentTarget, '`');
          return;
        } else if (key === 'k') {
          e.preventDefault();
          applyFormatting(e.currentTarget, '[', '](https://)');
          return;
        } else if (key === 't') {
          e.preventDefault();
          applyLinePrefix('- [ ] ');
          return;
        } else if (key === 'l') {
          e.preventDefault();
          applyLinePrefix('- ');
          return;
        } else if (key === 'q') {
          e.preventDefault();
          applyLinePrefix('> ');
          return;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            onInsertLineBefore(index, editVal);
          } else {
            onInsertLineAfter(index, editVal);
          }
          return;
        }
      }

      if (e.key === 'Escape') {
        onCancelEdit();
      } else if (e.key === 'Backspace' && editVal === '') {
        e.preventDefault();
        onDeleteLine(index);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          onCommitAndGoPrev(index, editVal);
        } else {
          onCommitAndGoNext(index, editVal);
        }
      } else if (e.key === 'ArrowUp') {
        const inputEl = e.currentTarget;
        if (inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
          e.preventDefault();
          onCommitAndGoPrev(index, editVal);
        }
      } else if (e.key === 'ArrowDown') {
        const inputEl = e.currentTarget;
        if (inputEl.selectionStart === editVal.length && inputEl.selectionEnd === editVal.length) {
          e.preventDefault();
          onCommitAndGoNext(index, editVal);
        }
      }
    };

    if (isEditing) {
      return (
        <div className="my-1 flex items-center space-x-2">
          {bookmark && (
            <span title={`책갈피: ${bookmark.title} (L${index + 1})`} className="text-amber-500 shrink-0">
              <Bookmark size={13} className="fill-amber-500 text-amber-500" />
            </span>
          )}
          <span className="text-xs font-mono text-gray-400 font-normal select-none shrink-0">{index + 1}</span>
          <input
            ref={inputRef}
            type="text"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={() => onCommit(index, editVal)}
            onKeyDown={handleKeyDown}
            className="w-full bg-blue-50/20 dark:bg-blue-950/20 text-black dark:text-slate-100 border border-transparent rounded px-2 py-0.5 outline-none font-sans text-base leading-relaxed transition-all focus:border-transparent focus:ring-0"
          />
        </div>
      );
    }

    const lineSanitized = preprocessMarkdown(line);

    return (
      <div
        tabIndex={0}
        onClick={() => onStartEdit(index)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onStartEdit(index);
          }
        }}
        className="group cursor-pointer rounded px-1.5 py-0.5 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all min-h-[26px] flex items-baseline"
        title="클릭 또는 Enter 키를 눌러 해당 라인 즉시 편집"
      >
        {bookmark && (
          <span
            className="inline-flex items-center align-middle mr-1.5 text-amber-500 fill-amber-500 select-none print:hidden drop-shadow-xs shrink-0"
            title={`책갈피: ${bookmark.title} (L${index + 1})`}
          >
            <Bookmark size={15} className="fill-amber-500 text-amber-500 shrink-0 inline-block" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          {line.trim() === '' ? (
            <div className="h-5 text-gray-300 dark:text-gray-600 italic text-xs select-none">
              (빈 줄 - 클릭 또는 Enter 키를 눌러 입력)
            </div>
          ) : (
            <ReactMarkdown
              urlTransform={(url) => url}
              remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
              components={markdownComponents}
            >
              {lineSanitized}
            </ReactMarkdown>
          )}
        </div>
      </div>
    );
  }
);

LineItem.displayName = 'LineItem';

export const MarkdownInlineView = memo(
  forwardRef<HTMLDivElement, MarkdownInlineViewProps>(
    ({ markdown, zoomLevel, searchQuery, theme, filePath, bookmarks, onChangeMarkdown, onScroll, onEmbedImage }, ref) => {
    const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const isSepia = theme === 'sepia' || (typeof document !== 'undefined' && document.documentElement.classList.contains('sepia'));

    const bookmarkMap = useMemo(() => {
      const map = new Map<number, BookmarkItem>();
      if (bookmarks && bookmarks.length > 0) {
        bookmarks.forEach((bm) => {
          map.set(bm.lineIndex, bm);
        });
      }
      return map;
    }, [bookmarks]);

    const markdownComponents = useMemo<any>(() => ({
      blockquote: CalloutBlock,
      span({ node, children, style, ...props }: any) {
        return <span style={parseStyleString(style)} {...props}>{children}</span>;
      },
      p({ node, children, style, ...props }: any) {
        return <p style={parseStyleString(style)} {...props}>{children}</p>;
      },
      div({ node, children, style, ...props }: any) {
        return <div style={parseStyleString(style)} {...props}>{children}</div>;
      },
      mark({ node, children, style, ...props }: any) {
        return <mark style={parseStyleString(style)} {...props}>{children}</mark>;
      },
      font({ node, children, color, size, face, style, ...props }: any) {
        const parsedStyle = {
          ...(color ? { color } : {}),
          ...(size ? { fontSize: size } : {}),
          ...(face ? { fontFamily: face } : {}),
          ...parseStyleString(style),
        };
        return <span style={parsedStyle} {...props}>{children}</span>;
      },
      img({ node, src, alt, width, height, style, ...props }: any) {
        return (
          <MarkdownImage
            src={src}
            alt={alt}
            width={width}
            height={height}
            style={style}
            baseFilePath={filePath}
            onEmbedImage={onEmbedImage}
            {...props}
          />
        );
      },
      pre({ children }: any) {
        return <>{children}</>;
      },
      code({ node, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const isBlock = Boolean(match) || (typeof children === 'string' && children.includes('\n'));
        if (isBlock) {
          const language = match ? match[1] : 'text';
          return (
            <SyntaxHighlighter
              key={`inline-code-${theme || (isDark ? 'dark' : isSepia ? 'sepia' : 'light')}-${language}`}
              style={isDark ? vscDarkPlus : ghcolors}
              language={language}
              PreTag="div"
              className={`rounded-lg shadow-sm my-2 border ${
                isDark ? 'border-gray-800' : isSepia ? 'border-[#d8c8ab]' : 'border-gray-200'
              }`}
              customStyle={{
                backgroundColor: isDark ? '#1e293b' : isSepia ? '#f2e5c9' : '#ffffff',
                color: isDark ? '#f8fafc' : isSepia ? '#382823' : '#000000',
                fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace',
                lineHeight: '1.45',
                letterSpacing: '0px',
                whiteSpace: 'pre',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }), [theme, isDark, isSepia, filePath, onEmbedImage]);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const normalized = (markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = useMemo(() => normalized.split('\n'), [normalized]);

    const handleStartEdit = useCallback((index: number) => {
      setEditingIndex(index);
    }, []);

    const handleCancelEdit = useCallback(() => {
      setEditingIndex(null);
    }, []);

    const handleCommit = useCallback(
      (index: number, val: string) => {
        const updatedLines = [...lines];
        if (updatedLines[index] === val) {
          setEditingIndex(null);
          return;
        }
        updatedLines[index] = val;
        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(null);
      },
      [lines, onChangeMarkdown]
    );

    const handleCommitAndGoNext = useCallback(
      (index: number, val: string) => {
        const updatedLines = [...lines];
        updatedLines[index] = val;

        if (index === lines.length - 1) {
          updatedLines.push('');
        }

        const nextIndex = index + 1;
        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(nextIndex);
      },
      [lines, onChangeMarkdown]
    );

    const handleCommitAndGoPrev = useCallback(
      (index: number, val: string) => {
        if (index <= 0) return;
        const updatedLines = [...lines];
        updatedLines[index] = val;

        const prevIndex = index - 1;
        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(prevIndex);
      },
      [lines, onChangeMarkdown]
    );

    const handleInsertLineAfter = useCallback(
      (index: number, val: string) => {
        const updatedLines = [...lines];
        updatedLines[index] = val;
        updatedLines.splice(index + 1, 0, '');

        const nextIndex = index + 1;
        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(nextIndex);
      },
      [lines, onChangeMarkdown]
    );

    const handleInsertLineBefore = useCallback(
      (index: number, val: string) => {
        const updatedLines = [...lines];
        updatedLines[index] = val;
        updatedLines.splice(index, 0, '');

        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(index);
      },
      [lines, onChangeMarkdown]
    );

    const handleDeleteLine = useCallback(
      (index: number) => {
        if (lines.length <= 1) {
          onChangeMarkdown('');
          setEditingIndex(0);
          return;
        }

        const updatedLines = [...lines];
        updatedLines.splice(index, 1);

        const targetIndex = Math.min(index, updatedLines.length - 1);
        onChangeMarkdown(updatedLines.join('\n'));
        setEditingIndex(targetIndex);
      },
      [lines, onChangeMarkdown]
    );

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto p-8 lg:p-12 markdown-body bg-white dark:bg-gray-900"
        style={{ fontSize: `${zoomLevel * 100}%` }}
      >
        {lines.map((line, idx) => (
          <LineItem
            key={idx}
            index={idx}
            line={line}
            isEditing={editingIndex === idx}
            bookmark={bookmarkMap.get(idx)}
            theme={theme}
            markdownComponents={markdownComponents}
            onStartEdit={handleStartEdit}
            onCommit={handleCommit}
            onCommitAndGoNext={handleCommitAndGoNext}
            onCommitAndGoPrev={handleCommitAndGoPrev}
            onInsertLineAfter={handleInsertLineAfter}
            onInsertLineBefore={handleInsertLineBefore}
            onDeleteLine={handleDeleteLine}
            onCancelEdit={handleCancelEdit}
          />
        ))}
      </div>
    );
  }
)
);

MarkdownInlineView.displayName = 'MarkdownInlineView';
