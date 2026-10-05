import React, { forwardRef, ReactNode, useState, useEffect, useRef, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CalloutBlock } from './CalloutBlock';
import { MarkdownImage } from './MarkdownImage';
import { preprocessMarkdown, parseStyleString } from '../utils/markdownEmbeds';
import { ThemeMode, BookmarkItem } from '../types';
import { Bookmark } from 'lucide-react';

interface MarkdownViewProps {
  markdown: string;
  zoomLevel: number;
  searchQuery: string;
  theme?: ThemeMode;
  filePath?: string;
  bookmarks?: BookmarkItem[];
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onToggleTaskListItem?: (taskIndex: number, checked: boolean, textContext?: string) => void;
  onEmbedImage?: (rawSrc: string, dataUrl: string, sourcePath?: string) => void;
}

// Custom remark plugin to preserve single soft line breaks (<br />) inside paragraphs
const remarkBreaksPlugin = () => {
  return (tree: any) => {
    visit(tree, (node: any, index: any, parent: any) => {
      if (node?.type !== 'text') return;
      if (!parent || parent.type === 'code' || parent.type === 'inlineCode') return;
      if (!node.value || typeof node.value !== 'string' || !node.value.includes('\n')) return;

      const lines = node.value.split('\n');
      if (lines.length <= 1) return;

      const newNodes: any[] = [];
      lines.forEach((line: string, i: number) => {
        if (i > 0) {
          newNodes.push({ type: 'break' });
        }
        if (line) {
          newNodes.push({ type: 'text', value: line });
        }
      });

      if (typeof index === 'number' && parent.children) {
        parent.children.splice(index, 1, ...newNodes);
      }
    });
  };
};

// Custom remark plugin to attach 0-based source markdown line index to nodes
const remarkAttachSourceLine = () => {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.position && node.position.start) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties['data-source-line'] = String(node.position.start.line - 1);
      }
    });
  };
};

// Custom rehype plugin to propagate data-source-line attribute from li to task list input checkboxes
const rehypePropagateSourceLine = () => {
  return (hastTree: any) => {
    visit(hastTree, 'element', (node: any) => {
      if (node.tagName === 'li' && node.properties?.dataSourceLine !== undefined) {
        const line = node.properties.dataSourceLine;
        visit(node, 'element', (child: any) => {
          if (child.tagName === 'input' && child.properties?.type === 'checkbox') {
            child.properties.dataSourceLine = line;
          }
        });
      }
    });
  };
};

export const MarkdownView = memo(
  forwardRef<HTMLDivElement, MarkdownViewProps>(
    ({ markdown, zoomLevel, searchQuery, theme, filePath, bookmarks, onScroll, onToggleTaskListItem, onEmbedImage }, ref) => {
    const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const isSepia = theme === 'sepia' || (typeof document !== 'undefined' && document.documentElement.classList.contains('sepia'));
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fadeTimerRef = useRef<number | null>(null);

    const normalizedMd = (markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const processedMd = useMemo(() => preprocessMarkdown(normalizedMd), [normalizedMd]);
    const totalLines = Math.max(1, normalizedMd.split('\n').length);

    const bookmarkMap = useMemo(() => {
      const map = new Map<number, BookmarkItem>();
      if (bookmarks && bookmarks.length > 0) {
        bookmarks.forEach((bm) => {
          map.set(bm.lineIndex, bm);
        });
      }
      return map;
    }, [bookmarks]);

    const renderBookmarkMarker = (lineAttr: any, iconSize: number = 15) => {
      if (lineAttr === undefined || lineAttr === null || lineAttr === '') return null;
      const lineIdx = parseInt(String(lineAttr), 10);
      if (isNaN(lineIdx)) return null;
      const bm = bookmarkMap.get(lineIdx);
      if (!bm) return null;
      return (
        <span
          className="inline-flex items-center align-middle mr-1.5 text-amber-500 fill-amber-500 select-none print:hidden drop-shadow-xs"
          title={`책갈피: ${bm.title} (Line ${bm.lineIndex + 1})`}
        >
          <Bookmark size={iconSize} className="fill-amber-500 text-amber-500 shrink-0 inline-block" />
        </span>
      );
    };

    const [progress, setProgress] = useState<{ percent: number; currentLine: number; totalLines: number }>({
      percent: 0,
      currentLine: 1,
      totalLines,
    });
    const [showProgress, setShowProgress] = useState<boolean>(false);

    // Merge forwarded ref with local ref
    const setRefs = (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as any).current = element;
      }
    };

    const updateScrollProgress = (el: HTMLDivElement) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      const percent = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 0;

      let currentLine = 1;
      if (scrollTop <= 10) {
        currentLine = 1;
      } else if (maxScroll > 0 && scrollTop >= maxScroll - 15) {
        currentLine = totalLines;
      } else {
        currentLine = Math.max(1, Math.min(totalLines, Math.round(1 + (totalLines - 1) * (percent / 100))));
      }

      setProgress({ percent, currentLine, totalLines });

      // Show indicator slightly transparent, fade out after 2.5s of inactivity
      setShowProgress(true);
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
      }
      fadeTimerRef.current = window.setTimeout(() => {
        setShowProgress(false);
      }, 2500);
    };

    const handleLocalScroll = (e: React.UIEvent<HTMLDivElement>) => {
      updateScrollProgress(e.currentTarget);
      if (onScroll) {
        onScroll(e);
      }
    };

    // Clean up timer on unmount
    useEffect(() => {
      return () => {
        if (fadeTimerRef.current) {
          window.clearTimeout(fadeTimerRef.current);
        }
      };
    }, []);

    const highlightSearchText = (text: string): ReactNode => {
      if (!searchQuery.trim()) return text;
      const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    };

    const markdownComponents = useMemo<any>(() => ({
      input({ node, type, checked, disabled, 'data-source-line': dataSourceLine, ...props }: any) {
        if (type === 'checkbox') {
          let sourceLineIndex: number | null = null;
          const rawLine = dataSourceLine ?? props.dataSourceLine;
          if (rawLine !== undefined && rawLine !== null && rawLine !== '') {
            sourceLineIndex = parseInt(String(rawLine), 10);
          } else if (node?.position?.start?.line) {
            sourceLineIndex = node.position.start.line - 1;
          }

          let textContext = '';
          if (node && node.parent && node.parent.children) {
            textContext = node.parent.children
              .map((c: any) => c.value || c.children?.map((sub: any) => sub.value).join('') || '')
              .join('')
              .trim();
          }

          return (
            <input
              type="checkbox"
              checked={!!checked}
              onChange={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleTaskListItem && sourceLineIndex !== null) {
                  onToggleTaskListItem(sourceLineIndex, !checked, textContext);
                }
              }}
              className="cursor-pointer accent-blue-600 mr-2 align-middle inline-block w-4 h-4 rounded border-gray-300 dark:border-gray-600 transition-transform hover:scale-110 shrink-0"
            />
          );
        }
        return <input type={type} checked={checked} disabled={disabled} {...props} />;
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
              key={`view-code-${theme || (isDark ? 'dark' : isSepia ? 'sepia' : 'light')}-${language}`}
              style={isDark ? vscDarkPlus : ghcolors}
              language={language}
              PreTag="div"
              className={`rounded-lg shadow-sm my-4 border ${
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
      h1({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h1 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 20)}
            {children}
          </h1>
        );
      },
      h2({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h2 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 18)}
            {children}
          </h2>
        );
      },
      h3({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h3 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 16)}
            {children}
          </h3>
        );
      },
      h4({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h4 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 15)}
            {children}
          </h4>
        );
      },
      h5({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h5 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 14)}
            {children}
          </h5>
        );
      },
      h6({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <h6 data-line-index={lineAttr} {...props}>
            {renderBookmarkMarker(lineAttr, 14)}
            {children}
          </h6>
        );
      },
      p({ node, children, style, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        const parsedStyle = parseStyleString(style);
        const content = typeof children === 'string' && searchQuery.trim() ? highlightSearchText(children) : children;
        return (
          <p data-line-index={lineAttr} style={parsedStyle} {...props}>
            {renderBookmarkMarker(lineAttr, 15)}
            {content}
          </p>
        );
      },
      span({ node, children, style, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        const parsedStyle = parseStyleString(style);
        if (typeof children === 'string' && searchQuery.trim()) {
          return <span data-line-index={lineAttr} style={parsedStyle} {...props}>{highlightSearchText(children)}</span>;
        }
        return <span data-line-index={lineAttr} style={parsedStyle} {...props}>{children}</span>;
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
      li({ node, className, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const isTaskItem = className?.includes('task-list-item');
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <li
            data-line-index={lineAttr}
            className={`${className || ''} ${
            isTaskItem ? 'list-none my-1' : ''
            }`}
            {...props}
          >
            {renderBookmarkMarker(lineAttr, 14)}
            {children}
          </li>
        );
      },
      table({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <div className="overflow-x-auto my-4" data-line-index={lineAttr}>
            <table data-line-index={lineAttr} {...props}>
              {children}
            </table>
          </div>
        );
      },
      thead({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <thead data-line-index={lineAttr} {...props}>
            {children}
          </thead>
        );
      },
      tbody({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <tbody data-line-index={lineAttr} {...props}>
            {children}
          </tbody>
        );
      },
      tr({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        const lineIdx = lineAttr !== undefined ? parseInt(String(lineAttr), 10) : undefined;
        const bm = lineIdx !== undefined ? bookmarkMap.get(lineIdx) : undefined;
        return (
          <tr
            data-line-index={lineAttr}
            className={bm ? 'bg-amber-500/10 dark:bg-amber-500/15' : undefined}
            {...props}
          >
            {React.Children.map(children, (child, i) => {
              if (bm && i === 0 && React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  children: (
                    <>
                      <span
                        className="inline-flex items-center align-middle mr-1.5 text-amber-500 fill-amber-500 select-none print:hidden drop-shadow-xs"
                        title={`책갈피: ${bm.title} (Line ${bm.lineIndex + 1})`}
                      >
                        <Bookmark size={13} className="fill-amber-500 text-amber-500 shrink-0 inline-block" />
                      </span>
                      {(child.props as any).children}
                    </>
                  ),
                });
              }
              return child;
            })}
          </tr>
        );
      },
      th({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <th data-line-index={lineAttr} {...props}>
            {children}
          </th>
        );
      },
      td({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
        const lineAttr = dataSourceLine ?? props.dataSourceLine;
        return (
          <td data-line-index={lineAttr} {...props}>
            {children}
          </td>
        );
      },
      del({ node, children, ...props }: any) {
        return <del {...props}>{children}</del>;
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
      blockquote: CalloutBlock,
    }), [isDark, isSepia, theme, searchQuery, filePath, onToggleTaskListItem, onEmbedImage, bookmarkMap]);

    return (
      <div className="relative w-full h-full overflow-hidden">
        <div
          ref={setRefs}
          onScroll={handleLocalScroll}
          className="h-full overflow-y-auto p-8 lg:p-12 markdown-body bg-white dark:bg-gray-900"
          style={{ fontSize: `${zoomLevel * 100}%` }}
        >
          <ReactMarkdown
            urlTransform={(url) => url}
            remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaksPlugin, remarkAttachSourceLine]}
            rehypePlugins={[rehypeRaw, rehypeSlug, rehypePropagateSourceLine]}
            components={markdownComponents}
          >
            {processedMd}
          </ReactMarkdown>
        </div>

        {/* Floating Scroll Reading Progress Pill (Fades to transparent when inactive) */}
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full text-xs font-mono font-medium shadow-lg backdrop-blur-md bg-gray-900/80 dark:bg-gray-800/85 text-gray-100 border border-white/15 dark:border-gray-700/60 transition-all duration-700 select-none pointer-events-none flex items-center space-x-2 ${
            showProgress ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="text-blue-400 dark:text-blue-300 font-bold">{progress.percent}%</span>
          <span className="text-gray-300 dark:text-gray-400 text-[11px]">
            ( {progress.currentLine} / {progress.totalLines} )
          </span>
        </div>
      </div>
    );
  }
)
);

MarkdownView.displayName = 'MarkdownView';
