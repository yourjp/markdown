import React, { forwardRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownViewProps {
  markdown: string;
  zoomLevel: number;
  searchQuery: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MarkdownView = forwardRef<HTMLDivElement, MarkdownViewProps>(
  ({ markdown, zoomLevel, searchQuery, onScroll }, ref) => {
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
            p({ children }: { children?: ReactNode }) {
              if (typeof children === 'string') {
                return <p>{highlightSearchText(children)}</p>;
              }
              return <p>{children}</p>;
            },
            span({ node, children, style, ...props }: any) {
              if (typeof children === 'string' && searchQuery.trim()) {
                return <span style={style} {...props}>{highlightSearchText(children)}</span>;
              }
              return <span style={style} {...props}>{children}</span>;
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
