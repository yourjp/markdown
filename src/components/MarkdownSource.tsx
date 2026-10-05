import React, { forwardRef, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import GithubSlugger from 'github-slugger';
import { BookmarkItem } from '../types';
import { Bookmark } from 'lucide-react';

interface MarkdownSourceProps {
  markdown: string;
  onChange?: (newMarkdown: string) => void;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  bookmarks?: BookmarkItem[];
}

export const MarkdownSource = forwardRef<HTMLTextAreaElement, MarkdownSourceProps>(
  ({ markdown, onChange, onScroll, bookmarks }, ref) => {
    const [localValue, setLocalValue] = useState<string>(markdown);
    const debounceTimerRef = useRef<number | null>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Sync external markdown to local state only when external content differs
    useEffect(() => {
      if (markdown === localValue) return;

      const textarea = textareaRef.current;
      const prevStart = textarea?.selectionStart;
      const prevEnd = textarea?.selectionEnd;
      const prevScrollTop = textarea?.scrollTop;

      setLocalValue(markdown);

      if (textarea && prevStart !== undefined && prevEnd !== undefined && prevScrollTop !== undefined) {
        requestAnimationFrame(() => {
          if (document.activeElement === textarea) {
            textarea.selectionStart = prevStart;
            textarea.selectionEnd = prevEnd;
            textarea.scrollTop = prevScrollTop;
          }
        });
      }
    }, [markdown]);

    const flushChange = useCallback(
      (value: string) => {
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (onChange) {
          onChange(value);
        }
      },
      [onChange]
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalValue(val);

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        if (onChange) {
          onChange(val);
        }
      }, 150);
    };

    const handleBlur = () => {
      flushChange(localValue);
    };

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') {
          flushChange(e.currentTarget.value);
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Insert 2 spaces for tab
        const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
        setLocalValue(newValue);

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          if (onChange) {
            onChange(newValue);
          }
        }, 150);

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
        onScroll(e);
      }
    };

    // Calculate lines and headings for line numbers and TOC scroll target
    const lineInfo = useMemo(() => {
      const normalized = (localValue || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n');
      const slugger = new GithubSlugger();

      return lines.map((line, idx) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
        let headingId = '';
        if (match) {
          const cleanTitle = match[2]
            .replace(/<[^>]*>/g, '')
            .replace(/==/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[\*\_`~]/g, '')
            .trim();
          if (cleanTitle) {
            headingId = slugger.slug(cleanTitle);
          }
        }
        return { index: idx + 1, headingId };
      });
    }, [localValue]);

    // Forward ref merging
    const setRefs = (el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as any).current = el;
      }
    };

    const bookmarkMap = useMemo(() => {
      const map = new Map<number, BookmarkItem>();
      if (bookmarks && bookmarks.length > 0) {
        bookmarks.forEach((bm) => {
          map.set(bm.lineIndex, bm);
        });
      }
      return map;
    }, [bookmarks]);

    return (
      <div className="h-full w-full flex overflow-hidden bg-white dark:bg-slate-900 text-black dark:text-slate-100 font-mono text-sm leading-relaxed border-r border-gray-200 dark:border-gray-800 markdown-source-root">
        {/* Line Numbers gutter synced with textarea scroll */}
        <div
          ref={lineNumbersRef}
          className="w-14 py-4 select-none text-right pr-2 text-gray-400 dark:text-slate-500 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 shrink-0 overflow-hidden font-mono text-xs markdown-gutter"
        >
          {lineInfo.map(({ index, headingId }) => {
            const bm = bookmarkMap.get(index - 1);
            return (
              <div
                key={index}
                id={headingId ? `source-heading-${headingId}` : `source-line-${index}`}
                className={`h-6 leading-6 flex items-center justify-end space-x-1 ${bm ? 'font-bold text-amber-500' : ''}`}
                title={bm ? `책갈피: ${bm.title} (L${index})` : undefined}
              >
                {bm && (
                  <Bookmark size={11} className="fill-amber-500 text-amber-500 shrink-0" />
                )}
                <span>{index}</span>
              </div>
            );
          })}
        </div>

        {/* Editable Source Textarea */}
        <textarea
          ref={setRefs}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onScroll={handleTextareaScroll}
          spellCheck={false}
          className="flex-1 h-full p-4 bg-transparent resize-none outline-none font-mono text-sm leading-6 text-black dark:text-gray-100 overflow-y-auto whitespace-pre tab-4"
          placeholder="여기에 마크다운 소스코드를 입력하거나 편집하세요..."
        />
      </div>
    );
  }
);

MarkdownSource.displayName = 'MarkdownSource';
