import React, { useState, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { TableOfContents } from './components/TableOfContents';
import { MarkdownSource } from './components/MarkdownSource';
import { MarkdownView } from './components/MarkdownView';
import { SearchBar } from './components/SearchBar';
import { useHeadings } from './hooks/useHeadings';
import { useActiveHeading } from './hooks/useActiveHeading';
import { useTheme } from './hooks/useTheme';
import { ViewMode, RecentFile } from './types';

const DEFAULT_SAMPLE_MD = `# Markdown Viewer 앱 개발 계획

## 1. 개발 목표

Windows 환경에서 로컬 Markdown 문서를 빠르고 편리하게 열람할 수 있는 경량 Markdown Viewer 앱을 개발한다.

핵심 방향은 다음과 같다.

- Markdown 파일을 빠르게 열기
- GitHub 스타일로 보기 좋게 렌더링
- 왼쪽에 문서 목차(TOC) 표시
- 목차 선택 시 해당 Heading 위치로 즉시 이동
- 목차 패널을 토글로 숨겨 본문 공간을 최대한 활용
- 긴 문서를 효율적으로 탐색
- 다크/라이트 모드 지원

---

## 2. 핵심 사용자 경험

기본 화면은 다음과 같이 구성한다.

\`\`\`text
┌──────────────────────────────────────────────────────────────┐
│ ☰  Markdown Viewer                           🔍   🌙         │
├────────────────┬─────────────────────────────────────────────┤
│ TABLE OF       │                                             │
│ CONTENTS       │  # Markdown Viewer                          │
│                │                                             │
│ 1. Overview    │  Markdown 본문                              │
│                │                                             │
│ 2. Install     │  ## Install                                 │
│   2.1 Windows  │                                             │
│   2.2 Linux    │  ...                                        │
│                │                                             │
│ 3. Usage       │                                             │
│   3.1 Basic    │                                             │
│   3.2 Advanced │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
\`\`\`

---

## 3. 기능 안내 및 사용법

### 3.1 파일 열기 및 드래그 앤 드롭
- 상단 **파일 열기** 버튼 클릭 또는 **\`Ctrl + O\`** 키를 눌러 컴퓨터의 \`.md\` 문서를 선택하세요.
- 브라우저 화면에 파일(또는 텍스트)을 **Drag & Drop** 하셔도 즉시 열람할 수 있습니다.

### 3.2 보기 모드 (View Modes)
- **Source + View**: 원본 Markdown 텍스트와 렌더링된 결과를 분할 뷰로 비교할 수 있습니다.
- **View Only**: 렌더링 결과만 깔끔하게 독서할 수 있습니다.

### 3.3 목차(TOC) 탐색
- 왼쪽에 위치한 목차 항목을 클릭하면 해당 섹션으로 부드럽게 이동합니다.
- 스크롤을 내릴 때 현재 읽고 있는 섹션이 목차에서 **자동 강조**됩니다.
- **\`Ctrl + B\`** 또는 툴바의 버튼을 눌러 목차 패널을 토글할 수 있습니다.

### 3.4 키보드 단축키 모음
| 기능 | 단축키 |
|---|---|
| 파일 열기 | \`Ctrl + O\` |
| 목차 열기/닫기 | \`Ctrl + B\` |
| 검색 창 토글 | \`Ctrl + F\` |
| 본문 확대 | \`Ctrl + +\` |
| 본문 축소 | \`Ctrl + -\` |
| 확대율 리셋 | \`Ctrl + 0\` |
`;

export function App() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_SAMPLE_MD);
  const [fileName, setFileName] = useState<string>('markdown-app.md');
  const [tocOpen, setTocOpen] = useState<boolean>(() => {
    return localStorage.getItem('tocOpen') !== 'false';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'view';
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [splitRatio, setSplitRatio] = useState<number>(50);

  // Recent files state (Max 3 items)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    try {
      const saved = localStorage.getItem('recentFiles');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { name: 'markdown-app.md', content: DEFAULT_SAMPLE_MD, timestamp: Date.now() }
    ];
  });

  const { theme, toggleTheme } = useTheme();
  const headings = useHeadings(markdown);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const activeHeadingId = useActiveHeading(headings, mainContentRef);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSyncingScroll = useRef<boolean>(false);

  // Helper to add or update recent files (Max 3)
  const addRecentFile = (name: string, content: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.name !== name);
      const updated = [{ name, content, timestamp: Date.now() }, ...filtered].slice(0, 3);
      localStorage.setItem('recentFiles', JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to remove recent file (Right click context menu)
  const handleRemoveRecentFile = (nameToRemove: string) => {
    setRecentFiles((prev) => {
      const updated = prev.filter((f) => f.name !== nameToRemove);
      localStorage.setItem('recentFiles', JSON.stringify(updated));

      // If closed active document, switch to remaining document or reset
      if (fileName === nameToRemove) {
        if (updated.length > 0) {
          setFileName(updated[0].name);
          setMarkdown(updated[0].content);
        } else {
          setFileName('markdown-app.md');
          setMarkdown(DEFAULT_SAMPLE_MD);
        }
      }
      return updated;
    });
  };

  // Select a recent file
  const handleSelectRecentFile = (file: RecentFile) => {
    setFileName(file.name);
    setMarkdown(file.content);
    addRecentFile(file.name, file.content);
  };

  // Content-aware Heading Alignment Scroll Sync
  const handleSourceScroll = () => {
    if (viewMode !== 'split' || !sourceRef.current || !mainContentRef.current) return;
    if (isSyncingScroll.current) return;

    isSyncingScroll.current = true;
    const sourceEl = sourceRef.current;
    const viewEl = mainContentRef.current;

    const sourceHeadings = headings
      .map((h) => ({ id: h.id, el: document.getElementById(`source-heading-${h.id}`) }))
      .filter((h): h is { id: string; el: HTMLElement } => h.el !== null);

    let activeH = sourceHeadings[0];
    for (const h of sourceHeadings) {
      if (h.el.offsetTop <= sourceEl.scrollTop + 60) {
        activeH = h;
      } else {
        break;
      }
    }

    if (activeH) {
      const targetViewHeading = document.getElementById(activeH.id);
      if (targetViewHeading) {
        const offsetDiff = activeH.el.offsetTop - sourceEl.scrollTop;
        viewEl.scrollTop = targetViewHeading.offsetTop - offsetDiff;
      } else {
        const ratio = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
        viewEl.scrollTop = ratio * (viewEl.scrollHeight - viewEl.clientHeight);
      }
    } else {
      const ratio = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
      viewEl.scrollTop = ratio * (viewEl.scrollHeight - viewEl.clientHeight);
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleViewScroll = () => {
    if (viewMode !== 'split' || !sourceRef.current || !mainContentRef.current) return;
    if (isSyncingScroll.current) return;

    isSyncingScroll.current = true;
    const sourceEl = sourceRef.current;
    const viewEl = mainContentRef.current;

    const viewHeadings = headings
      .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
      .filter((h): h is { id: string; el: HTMLElement } => h.el !== null);

    let activeH = viewHeadings[0];
    for (const h of viewHeadings) {
      if (h.el.offsetTop <= viewEl.scrollTop + 60) {
        activeH = h;
      } else {
        break;
      }
    }

    if (activeH) {
      const targetSourceHeading = document.getElementById(`source-heading-${activeH.id}`);
      if (targetSourceHeading) {
        const offsetDiff = activeH.el.offsetTop - viewEl.scrollTop;
        sourceEl.scrollTop = targetSourceHeading.offsetTop - offsetDiff;
      } else {
        const ratio = viewEl.scrollTop / (viewEl.scrollHeight - viewEl.clientHeight || 1);
        sourceEl.scrollTop = ratio * (sourceEl.scrollHeight - sourceEl.clientHeight);
      }
    } else {
      const ratio = viewEl.scrollTop / (viewEl.scrollHeight - viewEl.clientHeight || 1);
      sourceEl.scrollTop = ratio * (sourceEl.scrollHeight - sourceEl.clientHeight);
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Save states
  useEffect(() => {
    localStorage.setItem('tocOpen', String(tocOpen));
  }, [tocOpen]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Open file handler
  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setMarkdown(text);
          addRecentFile(file.name, text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type.startsWith('text/'))) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setMarkdown(text);
          addRecentFile(file.name, text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const viewElement = document.getElementById(id);
    const sourceElement = document.getElementById(`source-heading-${id}`);

    if (viewElement) {
      viewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (sourceElement && viewMode === 'split') {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handleOpenFileClick();
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setTocOpen((prev) => !prev);
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setSearchOpen((prev) => !prev);
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoomLevel((prev) => Math.min(prev + 0.1, 2.0));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoomLevel((prev) => Math.max(prev - 0.1, 0.6));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(1.0);
        }
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-900"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.markdown,.txt"
        className="hidden"
      />

      <Toolbar
        tocOpen={tocOpen}
        onToggleToc={() => setTocOpen(!tocOpen)}
        fileName={fileName}
        onOpenFile={handleOpenFileClick}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        theme={theme}
        onToggleTheme={toggleTheme}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen(!searchOpen)}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel((prev) => Math.min(prev + 0.1, 2.0))}
        onZoomOut={() => setZoomLevel((prev) => Math.max(prev - 0.1, 0.6))}
        onResetZoom={() => setZoomLevel(1.0)}
        recentFiles={recentFiles}
        onSelectRecentFile={handleSelectRecentFile}
        onRemoveRecentFile={handleRemoveRecentFile}
      />

      {searchOpen && (
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Table of Contents Panel */}
        {tocOpen && (
          <TableOfContents
            headings={headings}
            activeId={activeHeadingId}
            onSelectHeading={scrollToHeading}
          />
        )}

        {/* Main Content Area (Source + View or View Only) */}
        <main className="flex-1 flex overflow-hidden relative">
          {viewMode === 'split' ? (
            <div className="flex w-full h-full">
              {/* Markdown Source Code Panel */}
              <div
                style={{ width: `${splitRatio}%` }}
                className="h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <MarkdownSource
                  ref={sourceRef}
                  markdown={markdown}
                  onScroll={handleSourceScroll}
                />
              </div>

              {/* Split Resizer Divider */}
              <div
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize select-none transition-colors"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startRatio = splitRatio;
                  const containerWidth = e.currentTarget.parentElement?.clientWidth || 1;

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const newRatio = Math.min(
                      Math.max(startRatio + (deltaX / containerWidth) * 100, 20),
                      80
                    );
                    setSplitRatio(newRatio);
                  };

                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };

                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              />

              {/* Markdown Rendered View Panel */}
              <div
                style={{ width: `${100 - splitRatio}%` }}
                className="h-full overflow-hidden"
              >
                <MarkdownView
                  ref={mainContentRef}
                  markdown={markdown}
                  zoomLevel={zoomLevel}
                  searchQuery={searchQuery}
                  onScroll={handleViewScroll}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden">
              <MarkdownView
                ref={mainContentRef}
                markdown={markdown}
                zoomLevel={zoomLevel}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
