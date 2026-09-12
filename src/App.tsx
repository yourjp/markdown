import React, { useState, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { TableOfContents } from './components/TableOfContents';
import { MarkdownSource } from './components/MarkdownSource';
import { MarkdownView } from './components/MarkdownView';
import { MarkdownEditor } from './components/MarkdownEditor';
import { MarkdownInlineView } from './components/MarkdownInlineView';
import { SearchBar } from './components/SearchBar';
import { FloatingMenu } from './components/FloatingMenu';
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
- **Source**: 원본 Markdown 텍스트와 라인 번호만 전용으로 확인합니다.
- **View**: 렌더링 결과만 깔끔하게 독서합니다.
- **Source + View**: 원본 Markdown 텍스트와 렌더링 결과를 분할 뷰로 비교할 수 있습니다.

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
    const saved = localStorage.getItem('viewMode') as ViewMode;
    if (saved === 'source' || saved === 'view' || saved === 'split') return saved;
    return 'view';
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
  const [activeHeadingId, setActiveHeadingId] = useActiveHeading(headings, mainContentRef);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSyncingScroll = useRef<boolean>(false);

  const [lastModifiedTime, setLastModifiedTime] = useState<number>(Date.now());

  // Helper to update markdown and last modified time
  const updateMarkdown = (newContent: string) => {
    setMarkdown(newContent);
    setLastModifiedTime(Date.now());
  };

  // Helper to add or update recent files (Max 3)
  const addRecentFile = (name: string, content: string, time = Date.now()) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.name !== name);
      const updated = [{ name, content, timestamp: time }, ...filtered].slice(0, 3);
      localStorage.setItem('recentFiles', JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to remove recent file (Right click context menu)
  const handleRemoveRecentFile = (nameToRemove: string) => {
    setRecentFiles((prev) => {
      const updated = prev.filter((f) => f.name !== nameToRemove);
      localStorage.setItem('recentFiles', JSON.stringify(updated));

      if (fileName === nameToRemove) {
        if (updated.length > 0) {
          setFileName(updated[0].name);
          setMarkdown(updated[0].content);
          setLastModifiedTime(updated[0].timestamp || Date.now());
        } else {
          setFileName('markdown-app.md');
          setMarkdown(DEFAULT_SAMPLE_MD);
          setLastModifiedTime(Date.now());
        }
      }
      return updated;
    });
  };

  // Select a recent file
  const handleSelectRecentFile = (file: RecentFile) => {
    setFileName(file.name);
    setMarkdown(file.content);
    setLastModifiedTime(file.timestamp || Date.now());
    addRecentFile(file.name, file.content, file.timestamp || Date.now());
  };

  // Content-aware Heading Alignment Scroll Sync
  const handleSourceScroll = () => {
    if (viewMode !== 'split' || !sourceRef.current || !mainContentRef.current) return;
    if (isSyncingScroll.current) return;

    isSyncingScroll.current = true;
    const sourceEl = sourceRef.current;
    const viewEl = mainContentRef.current;

    let activeHId = '';
    let activeHOffsetTop = 0;

    for (const h of headings) {
      const el = document.getElementById(`source-heading-${h.id}`);
      if (el && el.offsetTop <= sourceEl.scrollTop + 60) {
        activeHId = h.id;
        activeHOffsetTop = el.offsetTop;
      } else if (el) {
        break;
      }
    }

    if (activeHId) {
      const targetViewHeading = document.getElementById(activeHId);
      if (targetViewHeading) {
        const offsetDiff = activeHOffsetTop - sourceEl.scrollTop;
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

    let activeHId = '';
    let activeHOffsetTop = 0;

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el && el.offsetTop <= viewEl.scrollTop + 60) {
        activeHId = h.id;
        activeHOffsetTop = el.offsetTop;
      } else if (el) {
        break;
      }
    }

    if (activeHId) {
      const targetSourceHeading = document.getElementById(`source-heading-${activeHId}`);
      if (targetSourceHeading) {
        const offsetDiff = activeHOffsetTop - viewEl.scrollTop;
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
      const modTime = file.lastModified || Date.now();
      setLastModifiedTime(modTime);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setMarkdown(text);
          addRecentFile(file.name, text, modTime);
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
      const modTime = file.lastModified || Date.now();
      setLastModifiedTime(modTime);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setMarkdown(text);
          addRecentFile(file.name, text, modTime);
        }
      };
      reader.readAsText(file);
    }
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    setActiveHeadingId(id);
    const viewElement = document.getElementById(id);
    const sourceElement = document.getElementById(`source-heading-${id}`);

    if (viewElement && (viewMode === 'view' || viewMode === 'split' || viewMode === 'edit' || viewMode === 'inline')) {
      if (mainContentRef.current) {
        mainContentRef.current.scrollTop = viewElement.offsetTop - 20;
      } else {
        viewElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
    if (sourceElement && (viewMode === 'source' || viewMode === 'split')) {
      if (sourceRef.current) {
        sourceRef.current.scrollTop = sourceElement.offsetTop - 20;
      } else {
        sourceElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  };

  // Save File Handler (With File System Picker / Confirmation)
  const handleSaveFile = async () => {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName || 'document.md',
          types: [
            {
              description: 'Markdown File',
              accept: { 'text/markdown': ['.md', '.markdown', '.txt'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        setFileName(handle.name);
        const now = Date.now();
        setLastModifiedTime(now);
        addRecentFile(handle.name, markdown, now);
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // 사용자가 취소함
    }

    // Fallback if File System Picker is unavailable or canceled/fails
    const targetName = prompt('저장할 파일 이름을 확인하세요:', fileName || 'document.md');
    if (!targetName) return;

    setFileName(targetName);
    const now = Date.now();
    setLastModifiedTime(now);
    addRecentFile(targetName, markdown, now);

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = targetName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save As Handler (Auto Versioning + File System Picker / Confirmation)
  const handleSaveAsFile = async () => {
    const currentName = fileName || 'document.md';
    const extIndex = currentName.lastIndexOf('.');
    const baseName = extIndex !== -1 ? currentName.slice(0, extIndex) : currentName;
    const ext = extIndex !== -1 ? currentName.slice(extIndex) : '.md';

    let suggestedName = '';
    const versionMatch = baseName.match(/^(.*)_v(\d+)\.(\d+)$/);

    if (versionMatch) {
      const prefix = versionMatch[1];
      const major = parseInt(versionMatch[2], 10);
      const minor = parseInt(versionMatch[3], 10);
      suggestedName = `${prefix}_v${major}.${minor + 1}${ext}`;
    } else {
      suggestedName = `${baseName}_v1.0${ext}`;
    }

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: 'Markdown File',
              accept: { 'text/markdown': ['.md', '.markdown', '.txt'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        setFileName(handle.name);
        const now = Date.now();
        setLastModifiedTime(now);
        addRecentFile(handle.name, markdown, now);
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // 사용자가 취소함
    }

    // Fallback if File System Picker is unavailable or canceled/fails
    const targetName = prompt('다른 이름으로 저장할 폴더/파일명을 확인하세요:', suggestedName);
    if (!targetName) return;

    setFileName(targetName);
    const now = Date.now();
    setLastModifiedTime(now);
    addRecentFile(targetName, markdown, now);

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = targetName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handleOpenFileClick();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (e.shiftKey) {
            handleSaveAsFile();
          } else {
            handleSaveFile();
          }
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
  }, [searchOpen, markdown, fileName]);

  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);

  // Auto highlight selected text when highlight mode is enabled
  useEffect(() => {
    if (!isHighlightMode) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const rawSelectedText = selection.toString();
      if (!rawSelectedText || !rawSelectedText.trim()) return;

      // 선택된 영역에서 줄바꿈 및 외곽 공백 정리
      const selectedText = rawSelectedText.replace(/\r?\n/g, ' ').trim();
      if (!selectedText) return;

      // 1. 드래그 선택 범위 안에 기존 ==형광펜== 마크다운 태그가 하나라도 포함되어 있는지 확인
      const containsHighlightRegex = /==([^=]+)==/g;
      let foundAndRemoved = false;
      let updatedMarkdown = markdown;

      const matches = markdown.match(containsHighlightRegex);
      if (matches) {
        for (const matchTag of matches) {
          const innerText = matchTag.slice(2, -2); // ==제거한 알맹이 텍스트==
          // 드래그한 영역이 형광펜 텍스트를 포함하고 있거나, 형광펜 텍스트 안에 드래그 영역이 포함된 경우 해제
          if (selectedText.includes(innerText) || innerText.includes(selectedText)) {
            updatedMarkdown = updatedMarkdown.replace(matchTag, innerText);
            foundAndRemoved = true;
          }
        }
      }

      if (foundAndRemoved) {
        setMarkdown(updatedMarkdown);
        selection.removeAllRanges();
        return;
      }

      // 2. 형광펜이 칠해지지 않은 일반 텍스트인 경우 형광펜 추가
      const highlightedTarget = `==${selectedText}==`;
      if (markdown.includes(selectedText)) {
        updatedMarkdown = markdown.replace(selectedText, highlightedTarget);
        setMarkdown(updatedMarkdown);
        selection.removeAllRanges();
      } else {
        // 마침표나 특수기호 포획 차이 대응 (예: 마침표 제외 매칭)
        const cleanSelectedText = selectedText.replace(/[\.\,\;\:]+$/, '').trim();
        if (cleanSelectedText && markdown.includes(cleanSelectedText)) {
          const cleanHighlightedTarget = `==${cleanSelectedText}==`;
          updatedMarkdown = markdown.replace(cleanSelectedText, cleanHighlightedTarget);
          setMarkdown(updatedMarkdown);
          selection.removeAllRanges();
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isHighlightMode, markdown]);

  // Floating Menu Actions
  const handleScrollToTop = () => {
    if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
    if (sourceRef.current) sourceRef.current.scrollTop = 0;
  };

  const handleScrollToBottom = () => {
    if (mainContentRef.current) mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
    if (sourceRef.current) sourceRef.current.scrollTop = sourceRef.current.scrollHeight;
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 relative"
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
        lastModifiedTime={lastModifiedTime}
        onOpenFile={handleOpenFileClick}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
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

        {/* Main Content Area (Source / Edit / View / Source + View) */}
        <main className="flex-1 flex overflow-hidden relative">
          {viewMode === 'source' ? (
            <div className="w-full h-full overflow-hidden">
              <MarkdownSource
                ref={sourceRef}
                markdown={markdown}
              />
            </div>
          ) : viewMode === 'edit' ? (
            <div className="flex w-full h-full">
              {/* Markdown Interactive Live Editor Panel */}
              <div
                style={{ width: `${splitRatio}%` }}
                className="h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <MarkdownEditor
                  markdown={markdown}
                  onChange={updateMarkdown}
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

              {/* Instant Live Rendered Preview Panel */}
              <div
                style={{ width: `${100 - splitRatio}%` }}
                className="h-full overflow-hidden"
              >
                <MarkdownView
                  ref={mainContentRef}
                  markdown={markdown}
                  zoomLevel={zoomLevel}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          ) : viewMode === 'inline' ? (
            <div className="w-full h-full overflow-hidden">
              <MarkdownInlineView
                ref={mainContentRef}
                markdown={markdown}
                zoomLevel={zoomLevel}
                searchQuery={searchQuery}
                onChangeMarkdown={updateMarkdown}
              />
            </div>
          ) : viewMode === 'split' ? (
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

      <FloatingMenu
        onScrollToTop={handleScrollToTop}
        onScrollToBottom={handleScrollToBottom}
        isHighlightMode={isHighlightMode}
        onToggleHighlightMode={() => setIsHighlightMode((prev) => !prev)}
      />
    </div>
  );
}
