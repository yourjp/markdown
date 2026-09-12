import React, { forwardRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownViewProps {
  markdown: string;
  zoomLevel: number;
  searchQuery: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onToggleTaskListItem?: (taskIndex: number, checked: boolean, textContext?: string) => void;
}

// Custom remark plugin to attach source line numbers to markdown AST nodes
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

export const MarkdownView = forwardRef<HTMLDivElement, MarkdownViewProps>(
  ({ markdown, zoomLevel, searchQuery, onScroll, onToggleTaskListItem }, ref) => {
    const sanitizedMarkdown = markdown
      .replace(/(^|[^\~])\~([^\~]+)\~([^\~]|$)/g, (match, p1, p2, p3) => {
        return `${p1}&#126;${p2}&#126;${p3}`;
      })
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');

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

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto p-8 lg:p-12 markdown-body bg-white dark:bg-gray-900 transition-all"
        style={{ fontSize: `${zoomLevel * 100}%` }}
      >
        <ReactMarkdown
          remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkAttachSourceLine]}
          rehypePlugins={[rehypeRaw, rehypeSlug, rehypePropagateSourceLine]}
          components={{
            input({ node, type, checked, disabled, 'data-source-line': dataSourceLine, ...props }: any) {
              if (type === 'checkbox') {
                // Extract exact source line index (0-based) from custom data attribute or AST position
                let sourceLineIndex: number | null = null;
                const rawLine = dataSourceLine ?? props.dataSourceLine;
                if (rawLine !== undefined && rawLine !== null && rawLine !== '') {
                  sourceLineIndex = parseInt(String(rawLine), 10);
                } else if (node?.position?.start?.line) {
                  sourceLineIndex = node.position.start.line - 1;
                }

                // Extract sibling text content for fallback text context matching
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
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const isDark = document.documentElement.classList.contains('dark');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={isDark ? vscDarkPlus : ghcolors}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-lg shadow-sm my-4 border border-black dark:border-gray-800"
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
            },
            p({ node, children, 'data-source-line': dataSourceLine, ...props }: any) {
              const lineAttr = dataSourceLine ?? props.dataSourceLine;
              if (typeof children === 'string') {
                return <p data-line-index={lineAttr} {...props}>{highlightSearchText(children)}</p>;
              }
              return <p data-line-index={lineAttr} {...props}>{children}</p>;
            },
            span({ node, children, style, 'data-source-line': dataSourceLine, ...props }: any) {
              const lineAttr = dataSourceLine ?? props.dataSourceLine;
              if (typeof children === 'string' && searchQuery.trim()) {
                return <span data-line-index={lineAttr} style={style} {...props}>{highlightSearchText(children)}</span>;
              }
              return <span data-line-index={lineAttr} style={style} {...props}>{children}</span>;
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
                  {children}
                </li>
              );
            },
            del({ node, children, ...props }: any) {
              return <del {...props}>{children}</del>;
            }
          }}
        >
          {sanitizedMarkdown}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownView.displayName = 'MarkdownView';

