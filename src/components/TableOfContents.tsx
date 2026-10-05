import React, { useMemo, useState } from 'react';
import { HeadingItem, BookmarkItem } from '../types';
import { ListTree, PanelLeftClose, ListOrdered, Bookmark, Trash2, Clock, ArrowUpDown } from 'lucide-react';
import { stripHeadingNumbering, generateTocNumbering } from '../utils/tocNumbering';

type BookmarkSortOrder = 'created' | 'position';

interface TableOfContentsProps {
  headings: HeadingItem[];
  activeId: string;
  width?: number;
  onClose?: () => void;
  onSelectHeading: (id: string) => void;
  bookmarks?: BookmarkItem[];
  onSelectBookmark?: (bookmark: BookmarkItem) => void;
  onRemoveBookmark?: (id: string) => void;
  onClearBookmarks?: () => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  headings,
  activeId,
  width = 280,
  onClose,
  onSelectHeading,
  bookmarks = [],
  onSelectBookmark,
  onRemoveBookmark,
  onClearBookmarks,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks'>('toc');
  const [isNumberingEnabled, setIsNumberingEnabled] = useState<boolean>(() => {
    return localStorage.getItem('toc_numbering_enabled') !== 'false';
  });
  const [bookmarkSortOrder, setBookmarkSortOrder] = useState<BookmarkSortOrder>(() => {
    return (localStorage.getItem('bookmark_sort_order') as BookmarkSortOrder) || 'position';
  });

  const handleToggleNumbering = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNumberingEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('toc_numbering_enabled', String(next));
      return next;
    });
  };

  const handleToggleSortOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkSortOrder((prev) => {
      const next = prev === 'position' ? 'created' : 'position';
      localStorage.setItem('bookmark_sort_order', next);
      return next;
    });
  };

  const numberingList = useMemo(() => generateTocNumbering(headings), [headings]);

  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => {
      if (bookmarkSortOrder === 'position') {
        return a.lineIndex - b.lineIndex;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [bookmarks, bookmarkSortOrder]);

  const formatBookmarkTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${m}/${d} ${hh}:${mm}`;
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="min-w-[160px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0 select-none overflow-hidden text-gray-900 dark:text-gray-100 transition-none toc-aside"
    >
      {/* Header with Tabs (TOC / Bookmarks) and Controls */}
      <div className="p-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 toc-header-text toc-header-border shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('toc')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer text-xs font-bold ${
              activeTab === 'toc'
                ? 'toc-tab-active shadow-xs'
                : 'toc-tab-btn'
            }`}
            title="목차 (Table of Contents)"
          >
            <ListTree size={15} className="shrink-0" />
            <span>TOC</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200/80 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {headings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer text-xs font-bold ${
              activeTab === 'bookmarks'
                ? 'bookmark-tab-active shadow-xs'
                : 'toc-tab-btn'
            }`}
            title="본문 우클릭으로 추가한 책갈피 목록"
          >
            <Bookmark size={15} className={`shrink-0 ${activeTab === 'bookmarks' ? 'text-amber-600 dark:text-amber-400 fill-amber-500' : 'text-amber-500'}`} />
            <span>책갈피</span>
            {bookmarks.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bookmark-badge-active shadow-2xs">
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-1 shrink-0">
          {activeTab === 'toc' && (
            <button
              onClick={handleToggleNumbering}
              title={isNumberingEnabled ? '목차 자동 넘버링 끄기' : '목차 자동 넘버링 켜기'}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isNumberingEnabled
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ListOrdered size={15} />
            </button>
          )}

          {activeTab === 'bookmarks' && bookmarks.length > 0 && onClearBookmarks && (
            <button
              onClick={() => {
                if (window.confirm('현재 문서의 모든 책갈피를 삭제하시겠습니까?')) {
                  onClearBookmarks();
                }
              }}
              title="모든 책갈피 삭제"
              className="p-1 rounded-md text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              title="사이드바 닫기 (Ctrl+B)"
              className="p-1 rounded-md text-gray-400 hover:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Panel Content Area */}
      {activeTab === 'toc' ? (
        /* Headings List (TOC) */
        <div className="flex-1 overflow-y-auto p-2.5 pb-32 space-y-1">
          {headings.length === 0 ? (
            <div className="text-xs italic p-4 text-center text-gray-500 dark:text-gray-400 toc-item-text">
              표시할 목차가 없습니다<br />
              <span className="text-[11px] not-italic text-gray-400 dark:text-gray-500 mt-1.5 block">
                (#, ## 등으로 제목을 추가하세요)
              </span>
            </div>
          ) : (
            headings.map((heading, index) => {
              const isActive = activeId === heading.id;
              const numbering = isNumberingEnabled ? numberingList[index] || '' : '';
              const cleanTitle = isNumberingEnabled ? stripHeadingNumbering(heading.title) : heading.title;
              const indentClass =
                heading.level === 1
                  ? 'pl-2.5 font-bold'
                  : heading.level === 2
                  ? 'pl-4 font-semibold'
                  : heading.level === 3
                  ? 'pl-6.5 font-medium'
                  : heading.level === 4
                  ? 'pl-8.5 font-normal'
                  : heading.level === 5
                  ? 'pl-10 font-normal'
                  : 'pl-11.5 font-normal';

              return (
                <button
                  key={heading.id}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      e.preventDefault();
                      onSelectHeading(heading.id);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectHeading(heading.id);
                  }}
                  className={`w-full text-left py-1.5 pr-2 rounded-md text-xs transition-none flex items-baseline cursor-pointer select-none ${indentClass} ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs toc-item-active'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:text-blue-600 dark:hover:text-blue-400 toc-item-text'
                  }`}
                  title={numbering ? `${numbering} ${cleanTitle}` : cleanTitle}
                >
                  {numbering && (
                    <span
                      className={`font-mono text-[11px] mr-1.5 shrink-0 select-none font-semibold ${
                        isActive ? 'text-blue-100 opacity-90' : 'text-gray-400 dark:text-gray-500 opacity-80'
                      }`}
                    >
                      {numbering}
                    </span>
                  )}
                  <span className="truncate flex-1">{cleanTitle}</span>
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* Bookmarks List */
        <div className="flex-1 overflow-y-auto p-2.5 pb-4 space-y-1.5">
          {sortedBookmarks.length === 0 ? (
            <div className="text-xs p-4 text-center text-gray-500 dark:text-gray-400 leading-relaxed">
              <Bookmark size={26} className="mx-auto mb-2.5 text-amber-500/70" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">저장된 책갈피가 없습니다</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-normal">
                본문 원하는 곳에서 <span className="font-bold text-amber-600 dark:text-amber-400">마우스 우클릭</span> 후<br />
                <span className="underline">"책갈피 추가"</span>를 선택하세요.
              </p>
            </div>
          ) : (
            sortedBookmarks.map((bm, index) => {
              const cleanTitle = (bm.title || `라인 ${bm.lineIndex + 1}`)
                .replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .trim();
              const cleanSnippet = (bm.snippet || '')
                .replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .trim();

              return (
                <div
                  key={bm.id}
                  onClick={() => onSelectBookmark && onSelectBookmark(bm)}
                  className="bookmark-card group w-full p-2.5 rounded-lg cursor-pointer transition-all shadow-2xs select-none"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Bookmark size={15} className="text-amber-500 shrink-0 fill-amber-500" />
                      <span className="bookmark-card-title font-bold text-xs truncate">
                        {cleanTitle}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white dark:bg-amber-600 dark:text-amber-50 font-bold shadow-2xs">
                        L{bm.lineIndex + 1}
                      </span>
                      {onRemoveBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBookmark(bm.id);
                          }}
                          title="책갈피 삭제"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {cleanSnippet && (
                    <p className="bookmark-card-snippet text-[11px] font-medium truncate mt-1.5 pl-6 font-mono opacity-90">
                      {cleanSnippet}
                    </p>
                  )}
                  <div className="bookmark-card-meta flex items-center justify-between text-[10px] mt-1 pl-6">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={11} />
                      {formatBookmarkTime(bm.createdAt)}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      클릭하여 이동 ➔
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Footer Bar for Bookmarks Sorting */}
      {activeTab === 'bookmarks' && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/90 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400 text-xs font-semibold pl-1">
            <ArrowUpDown size={13} className="text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold">정렬</span>
          </div>

          <div className="inline-flex rounded-lg bg-gray-200/80 dark:bg-gray-700/80 p-0.5 shadow-inner">
            <button
              onClick={() => {
                setBookmarkSortOrder('position');
                localStorage.setItem('bookmark_sort_order', 'position');
              }}
              title="문서 라인 위치순 정렬 (L1 ➔ L100)"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                bookmarkSortOrder === 'position'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-blue-400/30 dark:ring-blue-500/40'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ListOrdered size={12} />
              <span>위치순</span>
            </button>

            <button
              onClick={() => {
                setBookmarkSortOrder('created');
                localStorage.setItem('bookmark_sort_order', 'created');
              }}
              title="책갈피 생성일시 최신순 정렬 (최신 ➔ 과거)"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                bookmarkSortOrder === 'created'
                  ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-amber-400/30 dark:ring-amber-500/40'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Clock size={12} />
              <span>생성순</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
