import React, { useState, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { Toolbar } from './components/Toolbar';
import { TabBar } from './components/TabBar';
import { TableOfContents } from './components/TableOfContents';
import { MarkdownSource } from './components/MarkdownSource';
import { MarkdownView } from './components/MarkdownView';
import { MarkdownEditor } from './components/MarkdownEditor';
import { MarkdownInlineView } from './components/MarkdownInlineView';
import { SearchBar } from './components/SearchBar';
import { FloatingMenu } from './components/FloatingMenu';
import { ExternalChangeBanner } from './components/ExternalChangeBanner';
import { embedImageDataUrlInMarkdown } from './utils/markdownEmbeds';
import { adjustBookmarksOnContentChange } from './utils/bookmarkTracking';
import { useHeadings } from './hooks/useHeadings';
import { useActiveHeading } from './hooks/useActiveHeading';
import { useTheme } from './hooks/useTheme';
import { ViewMode, RecentFile, TabDocument, BookmarkItem } from './types';
import { Bookmark, Copy, CheckSquare, Highlighter } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

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
│ [≡] Markdown Viewer                         [Search] [Theme] │
├────────────────┬─────────────────────────────────────────────┤
│ TABLE OF       │                                             │
│ CONTENTS       │  # Markdown Viewer                          │
│                │                                             │
│ 1. Overview    │  Markdown Body                              │
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

### 3.4 옵시디언 & 깃허브 콜아웃 박스 (Callout Cards)
> [!tip] 💡 유용한 팁 (옵시디언 호환)
> - **BudapestGO**: 부다페스트 대중교통 노선 및 시간표 확인
> - **PID Lítačka**: 프라하/체코 대중교통 노선 및 티켓 확인
> - **Wiener Linien**: 비엔나 실시간 교통편 확인

> [!note] ℹ️ 참고 사항
> 콜아웃 블록은 \`> [!tip]\`, \`> [!note]\`, \`> [!warning]\`, \`> [!danger]\`, \`> [!success]\`, \`> [!info]\` 등 20여 종의 키워드를 지원합니다.

> [!warning] ⚠️ 주의 사항
> 환전소 이용 시 수수료율을 반드시 먼저 확인하세요.

> [!tip]+ 접을 수 있는 콜아웃 예시 (클릭하여 접기/펼치기)
> \`+\` 또는 \`-\` 기호를 붙이면 (\`> [!tip]+\`) 헤더를 클릭해 본문을 여닫을 수 있습니다.

### 3.5 할 일 목록 (Task List 체크박스 1-클릭 테스트)
- [ ] 아침 운동하기 (30분 산책)
- [x] 메일함 확인 및 중요 메일 회신
- [ ] Markdown 앱 체크박스 클릭 테스트 수행
- [x] 프로젝트 의존성 모듈 버전 점검
- [ ] 오후 팀 주간 회의 참석

* [ ] 별표 기호 체크박스 미완료 항목
* [x] 별표 기호 체크박스 완료 항목
+ [ ] 플러스 기호 체크박스 미완료 항목
+ [x] 플러스 기호 체크박스 완료 항목
`;

// Helper to auto-fix legacy misaligned box-drawing diagrams in sample documents
const sanitizeSampleDiagram = (content: string): string => {
  if (!content) return content;
  if (content.includes('┌────────') && (content.includes('Markdown Viewer') || content.includes('TABLE OF'))) {
    return content.replace(
      /┌[─\s\S]*?└[─┴\s\S]*?┘/g,
`┌──────────────────────────────────────────────────────────────┐
│ [≡] Markdown Viewer                         [Search] [Theme] │
├────────────────┬─────────────────────────────────────────────┤
│ TABLE OF       │                                             │
│ CONTENTS       │  # Markdown Viewer                          │
│                │                                             │
│ 1. Overview    │  Markdown Body                              │
│                │                                             │
│ 2. Install     │  ## Install                                 │
│   2.1 Windows  │                                             │
│   2.2 Linux    │  ...                                        │
│                │                                             │
│ 3. Usage       │                                             │
│   3.1 Basic    │                                             │
│   3.2 Advanced │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘`
    );
  }
  return content;
};

// Helper to retrieve the last opened/edited markdown tabs from localStorage
const getInitialTabsAndDoc = (): { tabs: TabDocument[]; activeTabId: string; recentFiles: RecentFile[] } => {
  try {
    const savedTabs = localStorage.getItem('openTabs');
    const savedActiveId = localStorage.getItem('activeTabId');
    const savedRecent = localStorage.getItem('recentFiles');
    const recentFiles: RecentFile[] = savedRecent
      ? JSON.parse(savedRecent).map((f: RecentFile) => ({ ...f, content: sanitizeSampleDiagram(f.content) }))
      : [];

    if (savedTabs) {
      const parsedTabs: TabDocument[] = JSON.parse(savedTabs).map((t: TabDocument) => ({
        ...t,
        content: sanitizeSampleDiagram(t.content),
      }));
      if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
        const activeTabId = (savedActiveId && parsedTabs.some((t) => t.id === savedActiveId)) ? savedActiveId : parsedTabs[0].id;
        return {
          tabs: parsedTabs,
          activeTabId,
          recentFiles: recentFiles.length > 0 ? recentFiles : [{ name: parsedTabs[0].name, content: parsedTabs[0].content, timestamp: parsedTabs[0].timestamp }],
        };
      }
    }

    if (recentFiles.length > 0) {
      const activeName = localStorage.getItem('activeFileName');
      const found = activeName ? recentFiles.find((f) => f.name === activeName) : recentFiles[0];
      const target = found || recentFiles[0];
      const tab: TabDocument = {
        id: 'tab-init-' + Date.now(),
        name: target.name,
        content: sanitizeSampleDiagram(target.content),
        timestamp: target.timestamp || Date.now(),
        filePath: target.filePath,
      };
      return {
        tabs: [tab],
        activeTabId: tab.id,
        recentFiles,
      };
    }
  } catch (e) {
    console.error('Failed to load initial tabs:', e);
  }

  const defaultTab: TabDocument = {
    id: 'tab-default',
    name: 'markdown-app.md',
    content: DEFAULT_SAMPLE_MD,
    timestamp: Date.now(),
  };
  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
    recentFiles: [{ name: 'markdown-app.md', content: DEFAULT_SAMPLE_MD, timestamp: Date.now() }],
  };
};

export function App() {
  const [initialData] = useState(() => getInitialTabsAndDoc());
  const [tabs, setTabs] = useState<TabDocument[]>(initialData.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialData.activeTabId);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(initialData.recentFiles);

  // Derived active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
    id: 'fallback',
    name: 'markdown-app.md',
    content: DEFAULT_SAMPLE_MD,
    timestamp: Date.now(),
  };

  const fileName = activeTab.name;
  const markdown = activeTab.content;
  const lastModifiedTime = activeTab.timestamp;

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // External File Change Detection State (e.g. modified by Obsidian, VS Code, etc.)
  const [externalChange, setExternalChange] = useState<{
    tabId: string;
    fileName: string;
    mtime: number;
    diskContent: string;
  } | null>(null);
  const dismissedExternalChanges = useRef<Record<string, number>>({});

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Debounced Sync openTabs & activeTabId with localStorage (prevents disk I/O lag on typing)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('openTabs', JSON.stringify(tabs));
      } catch (err) {
        console.error('Failed to save openTabs to localStorage', err);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('activeTabId', activeTabId);
    if (activeTab) {
      localStorage.setItem('activeFileName', activeTab.name);
    }
  }, [activeTabId, activeTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
      } catch (err) {
        console.error('Failed to save recentFiles to localStorage', err);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [recentFiles]);

  const [tocOpen, setTocOpen] = useState<boolean>(() => {
    return localStorage.getItem('tocOpen') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('tocOpen', String(tocOpen));
  }, [tocOpen]);

  const [tocWidth, setTocWidth] = useState<number>(() => {
    const saved = localStorage.getItem('tocWidth');
    return saved ? parseInt(saved, 10) : 280;
  });

  useEffect(() => {
    localStorage.setItem('tocWidth', String(tocWidth));
  }, [tocWidth]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode') as ViewMode;
    if (saved === 'source' || saved === 'view' || saved === 'split') return saved;
    return 'view';
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [splitRatio, setSplitRatio] = useState<number>(50);

  const { theme, toggleTheme } = useTheme();
  // Deferred Markdown value for non-blocking concurrent rendering of TOC and live preview
  const deferredMarkdown = useDeferredValue(markdown);
  const headings = useHeadings(deferredMarkdown);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useActiveHeading(headings, mainContentRef);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  // Bookmarks State mapped by document key (filePath or tab name)
  const [docBookmarksMap, setDocBookmarksMap] = useState<Record<string, BookmarkItem[]>>(() => {
    try {
      const saved = localStorage.getItem('markdown_app_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Current active document key
  const currentDocKey = activeTab?.filePath || activeTab?.name || fileName || 'default';
  const currentBookmarks = docBookmarksMap[currentDocKey] || (activeTab?.name ? docBookmarksMap[activeTab.name] : undefined) || [];

  // Context Menu state for right click on markdown content
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetLineIndex: number;
    selectedText: string;
    lineText: string;
  } | null>(null);

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('markdown_app_bookmarks', JSON.stringify(docBookmarksMap));
    } catch (e) {
      console.warn('Failed to save bookmarks:', e);
    }
  }, [docBookmarksMap]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleDismissContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.custom-context-menu')) return;
      setContextMenu(null);
    };
    const handleScrollDismiss = () => {
      setContextMenu(null);
    };

    window.addEventListener('mousedown', handleDismissContextMenu);
    window.addEventListener('scroll', handleScrollDismiss, true);
    return () => {
      window.removeEventListener('mousedown', handleDismissContextMenu);
      window.removeEventListener('scroll', handleScrollDismiss, true);
    };
  }, []);

  // Helper to update markdown and last modified time (localStorage writes debounced)
  const updateMarkdown = useCallback((newContent: string) => {
    const now = Date.now();
    setTabs((prev) => {
      const currentTab = prev.find((t) => t.id === activeTabId);
      const oldContent = currentTab ? currentTab.content : '';

      // Auto-adjust bookmark line positions when line count or structure changes
      if (oldContent && oldContent !== newContent) {
        setDocBookmarksMap((bmPrev) => {
          const docKey = currentTab?.filePath || currentTab?.name || fileName || 'default';
          const currentBms = bmPrev[docKey] || (currentTab?.name ? bmPrev[currentTab.name] : undefined) || [];
          if (!currentBms || currentBms.length === 0) return bmPrev;

          const adjusted = adjustBookmarksOnContentChange(currentBms, oldContent, newContent);
          const res: Record<string, BookmarkItem[]> = { ...bmPrev, [docKey]: adjusted };
          if (currentTab?.name && currentTab.name !== docKey) {
            res[currentTab.name] = adjusted;
          }
          return res;
        });
      }

      return prev.map((t) =>
        t.id === activeTabId
          ? { ...t, content: newContent, timestamp: now, isModified: true }
          : t
      );
    });

    setRecentFiles((prev) => {
      const existingIdx = prev.findIndex((f) => f.name === fileName);
      if (existingIdx !== -1) {
        return prev.map((f, i) =>
          i === existingIdx ? { ...f, content: newContent, timestamp: now } : f
        );
      } else {
        return [{ name: fileName, content: newContent, timestamp: now }, ...prev].slice(0, 10);
      }
    });
  }, [activeTabId, fileName]);

  // Helper to add or update recent files (Max 10)
  const addRecentFile = useCallback((name: string, content: string, time = Date.now(), filePath?: string) => {
    localStorage.setItem('activeFileName', name);
    setRecentFiles((prev) => {
      const existing = prev.find((f) => (filePath && f.filePath && f.filePath.toLowerCase() === filePath.toLowerCase()) || f.name === name);
      const filtered = prev.filter((f) => !((filePath && f.filePath && f.filePath.toLowerCase() === filePath.toLowerCase()) || f.name === name));
      const resolvedPath = filePath || existing?.filePath;
      return [{ name, content, timestamp: time, filePath: resolvedPath }, ...filtered].slice(0, 10);
    });
  }, []);

  // Open or switch tab helper (Atomic & Deduplicating across concurrent events)
  const openOrSwitchTab = useCallback((name: string, content: string, modTime = Date.now(), fileHandle?: any, filePath?: string) => {
    setTabs((prev) => {
      const existing = prev.find((t) => (filePath && t.filePath && t.filePath.toLowerCase() === filePath.toLowerCase()) || t.name === name);
      const resolvedPath = filePath || (existing ? existing.filePath : undefined);

      if (existing) {
        setActiveTabId(existing.id);
        return prev.map((t) =>
          t.id === existing.id
            ? { ...t, content, timestamp: modTime, isModified: false, fileHandle: fileHandle || t.fileHandle, filePath: resolvedPath }
            : t
        );
      }

      if (prev.length === 1 && (prev[0].name === 'markdown-app.md' || prev[0].name.startsWith('새문서')) && !prev[0].isModified) {
        const replacedTab: TabDocument = {
          id: prev[0].id,
          name,
          content,
          timestamp: modTime,
          isModified: false,
          fileHandle,
          filePath: resolvedPath,
        };
        setActiveTabId(replacedTab.id);
        return [replacedTab];
      }

      const newTab: TabDocument = {
        id: 'tab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name,
        content,
        timestamp: modTime,
        isModified: false,
        fileHandle,
        filePath: resolvedPath,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });

    addRecentFile(name, content, modTime, filePath);
  }, [addRecentFile]);

  // Handle CLI file opening (Windows Explorer association launch & Single Instance)
  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;
    let lastHandledPath = '';
    let lastHandledTime = 0;

    const handleFileOpen = (res: any) => {
      if (!res || !res.path) return;
      const now = Date.now();
      // Debounce identical file events within 800ms
      if (lastHandledPath.toLowerCase() === res.path.toLowerCase() && now - lastHandledTime < 800) {
        return;
      }
      lastHandledPath = res.path;
      lastHandledTime = now;

      openOrSwitchTab(res.name, res.content, res.modified || Date.now(), undefined, res.path);
      showToast(`📂 "${res.name}" 문서를 열었습니다.`);
    };

    const checkInitialCliFile = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const res = await invoke<any>('get_cli_file');
          if (isMounted && res && res.path) {
            handleFileOpen(res);
          }
        }
      } catch (err) {
        console.warn('get_cli_file error:', err);
      }
    };

    checkInitialCliFile();

    const setupCliListener = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { listen } = await import('@tauri-apps/api/event');
          const unlisten = await listen<any>('open-file-from-cli', (event) => {
            if (isMounted && event.payload) {
              handleFileOpen(event.payload);
            }
          });
          if (isMounted) {
            unlistenFn = unlisten;
          } else {
            unlisten();
          }
        }
      } catch (err) {
        console.warn('listen open-file-from-cli error:', err);
      }
    };

    setupCliListener();

    return () => {
      isMounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [openOrSwitchTab]);

  // Tab Action Handlers
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleNewTab = () => {
    const nextNum = tabs.length + 1;
    const newTab: TabDocument = {
      id: 'tab-' + Date.now(),
      name: `새문서_${nextNum}.md`,
      content: `# 새 문서\n\n내용을 작성하세요.\n`,
      timestamp: Date.now(),
      isModified: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    addRecentFile(newTab.name, newTab.content, newTab.timestamp);
    showToast('📄 새 문서 탭이 생성되었습니다.');
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      const resetTab: TabDocument = {
        id: 'tab-' + Date.now(),
        name: '새문서_1.md',
        content: '# 새 문서\n\n내용을 작성하세요.\n',
        timestamp: Date.now(),
        isModified: false,
      };
      setTabs([resetTab]);
      setActiveTabId(resetTab.id);
      return;
    }

    const closeIdx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      const nextActive = newTabs[Math.max(0, closeIdx - 1)] || newTabs[0];
      if (nextActive) setActiveTabId(nextActive.id);
    }
  };

  const handleCycleTab = (direction: 'next' | 'prev') => {
    if (tabs.length <= 1) return;
    const curIdx = tabs.findIndex((t) => t.id === activeTabId);
    if (curIdx === -1) return;
    const nextIdx = direction === 'next'
      ? (curIdx + 1) % tabs.length
      : (curIdx - 1 + tabs.length) % tabs.length;
    setActiveTabId(tabs[nextIdx].id);
  };

  // Helper to remove recent file (Right click context menu)
  const handleRemoveRecentFile = (nameToRemove: string) => {
    setRecentFiles((prev) => {
      const updated = prev.filter((f) => f.name !== nameToRemove);
      localStorage.setItem('recentFiles', JSON.stringify(updated));

      if (fileName === nameToRemove) {
        if (updated.length > 0) {
          openOrSwitchTab(updated[0].name, updated[0].content, updated[0].timestamp || Date.now(), undefined, updated[0].filePath);
        } else {
          openOrSwitchTab('markdown-app.md', DEFAULT_SAMPLE_MD, Date.now());
        }
      }
      return updated;
    });
  };

  // Select a recent file
  const handleSelectRecentFile = (file: RecentFile) => {
    openOrSwitchTab(file.name, file.content, file.timestamp || Date.now(), undefined, file.filePath);
  };

  // Content-aware Heading Alignment Scroll Sync
  const handleSourceScroll = useCallback(() => {
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
  }, [viewMode, headings]);

  const handleViewScroll = useCallback(() => {
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
  }, [viewMode, headings]);

  // Save states
  useEffect(() => {
    localStorage.setItem('tocOpen', String(tocOpen));
  }, [tocOpen]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Open file handler (Tauri native file picker with full path preservation)
  const handleOpenFileClick = async () => {
    // 1. Tauri native file dialog (returns exact absolute path and content)
    try {
      const res = await invoke<any>('open_file_dialog');
      if (res && res.path) {
        openOrSwitchTab(res.name, res.content, res.modified || Date.now(), undefined, res.path);
        addRecentFile(res.name, res.content, res.modified || Date.now(), res.path);
        showToast(`📂 "${res.name}" 문서를 열었습니다.`);
        return;
      } else if (res === null) {
        return; // User cancelled
      }
    } catch (err) {
      console.warn('Tauri open_file_dialog error, falling back:', err);
    }

    // 2. Web File System Access API
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Markdown File',
              accept: {
                'text/markdown': ['.md', '.markdown', '.txt', '.text'],
              },
            },
          ],
          multiple: false,
        });
        if (handle) {
          const file = await handle.getFile();
          const text = await file.text();
          const modTime = file.lastModified || Date.now();
          const filePath = (file as any)?.path;
          openOrSwitchTab(file.name, text, modTime, handle, filePath);
          addRecentFile(file.name, text, modTime, filePath);
          showToast(`📂 "${file.name}" 문서를 열었습니다.`);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showOpenFilePicker error, falling back:', err);
      }
    }
    fileInputRef.current?.click();
  };

  // Reload Current File Handler (Direct disk reload without re-opening file dialog)
  const handleReloadFile = async () => {
    if (!activeTab) return;

    // 1. If filePath is available, read directly from disk via Tauri invoke
    const targetFilePath = activeTab.filePath || recentFiles.find((f) => f.name === activeTab.name)?.filePath;
    if (targetFilePath) {
      try {
        const text = await invoke<string>('read_file_content', { path: targetFilePath });
        let modTime = Date.now();
        try {
          modTime = await invoke<number>('get_file_metadata', { path: targetFilePath });
        } catch {
          modTime = Date.now();
        }

        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, content: text, timestamp: modTime, isModified: false, hasExternalChange: false, filePath: targetFilePath }
              : t
          )
        );
        addRecentFile(activeTab.name, text, modTime, targetFilePath);
        showToast(`🔄 "${activeTab.name}" 파일을 디스크에서 다시 로드했습니다.`);
        return;
      } catch (err: any) {
        console.warn('Failed to reload via Tauri invoke:', err);
        showToast(`❌ 파일을 디스크에서 다시 읽을 수 없습니다: ${err}`);
        return;
      }
    }

    // 2. If fileHandle is available (Web File System Access API)
    if (activeTab.fileHandle) {
      try {
        const file = await activeTab.fileHandle.getFile();
        const text = await file.text();
        const modTime = file.lastModified || Date.now();
        const filePath = (file as any)?.path;

        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, content: text, timestamp: modTime, isModified: false, hasExternalChange: false, filePath: filePath || t.filePath }
              : t
          )
        );
        addRecentFile(activeTab.name, text, modTime, filePath || activeTab.filePath);
        showToast(`🔄 "${activeTab.name}" 파일을 디스크에서 다시 로드했습니다.`);
        return;
      } catch (err: any) {
        console.warn('Failed to reload using fileHandle:', err);
      }
    }

    // 3. Fallback: If recent file content exists in memory / storage and was modified
    const recent = recentFiles.find((f) => f.name === fileName);
    if (recent && recent.content !== undefined && activeTab.isModified) {
      const confirmReload = window.confirm(
        `"${fileName}" 파일의 수정 사항을 취소하고 최근 저장된 상태로 다시 로드하시겠습니까?`
      );
      if (confirmReload) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, content: recent.content, timestamp: recent.timestamp || Date.now(), isModified: false, hasExternalChange: false }
              : t
          )
        );
        showToast(`🔄 "${fileName}" 문서를 최근 상태로 다시 로드했습니다.`);
        return;
      }
      return;
    }

    // 4. If neither path nor handle exists, show notice
    showToast(`⚠️ "${activeTab.name}" 파일에 연결된 디스크 경로가 없습니다.`);
  };

  // Handlers for External File Change Banner
  const handleReloadExternalChange = () => {
    if (!externalChange || !activeTab) return;
    const { diskContent, mtime, fileName: changeFileName } = externalChange;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, content: diskContent, timestamp: mtime, isModified: false, hasExternalChange: false }
          : t
      )
    );
    addRecentFile(changeFileName, diskContent, mtime, activeTab.filePath);
    setExternalChange(null);
    showToast(`🔄 "${changeFileName}" 파일을 최신 디스크 내용으로 다시 불러왔습니다.`);
  };

  const handleKeepExternalChange = (silent?: boolean) => {
    if (!externalChange || !activeTab) return;
    dismissedExternalChanges.current[activeTab.id] = externalChange.mtime;
    setExternalChange(null);
    if (!silent) {
      showToast(`🛡️ "${activeTab.name}" 현재 편집 내용을 유지합니다.`);
    }
  };

  const handleDismissExternalChange = () => {
    if (!externalChange || !activeTab) return;
    dismissedExternalChanges.current[activeTab.id] = externalChange.mtime;
    setExternalChange(null);
  };

  // Watch for external file modifications (Obsidian, VS Code, etc.)
  useEffect(() => {
    let isChecking = false;

    const checkActiveTabExternalChange = async () => {
      if (isChecking || !activeTab) return;
      isChecking = true;

      try {
        const targetFilePath = activeTab.filePath || recentFiles.find((f) => f.name === activeTab.name)?.filePath;

        // 1. Tauri File Watch via invoke
        if (targetFilePath) {
          try {
            const modTime = await invoke<number>('get_file_metadata', { path: targetFilePath });
            if (modTime && modTime > (activeTab.timestamp || 0)) {
              if (dismissedExternalChanges.current[activeTab.id] === modTime) {
                return;
              }

              const diskContent = await invoke<string>('read_file_content', { path: targetFilePath });
              if (diskContent === activeTab.content) {
                // Silently align timestamp if content is identical
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, timestamp: modTime, hasExternalChange: false } : t))
                );
              } else {
                setExternalChange({
                  tabId: activeTab.id,
                  fileName: activeTab.name,
                  mtime: modTime,
                  diskContent,
                });
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, hasExternalChange: true } : t))
                );
              }
            }
          } catch {
            // Ignore missing file / fs access errors
          }
          return;
        }

        // 2. Web File System Access API Watch
        if (activeTab.fileHandle) {
          try {
            const file = await activeTab.fileHandle.getFile();
            const modTime = file.lastModified || Date.now();
            if (modTime > (activeTab.timestamp || 0)) {
              if (dismissedExternalChanges.current[activeTab.id] === modTime) {
                return;
              }

              const diskContent = await file.text();
              if (diskContent === activeTab.content) {
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, timestamp: modTime, hasExternalChange: false } : t))
                );
              } else {
                setExternalChange({
                  tabId: activeTab.id,
                  fileName: activeTab.name,
                  mtime: modTime,
                  diskContent,
                });
                setTabs((prev) =>
                  prev.map((t) => (t.id === activeTabId ? { ...t, hasExternalChange: true } : t))
                );
              }
            }
          } catch {
            // Ignore handle errors
          }
        }
      } finally {
        isChecking = false;
      }
    };

    const handleWindowFocus = () => {
      checkActiveTabExternalChange();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkActiveTabExternalChange();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(checkActiveTabExternalChange, 2500);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [activeTab, activeTabId, recentFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const modTime = file.lastModified || Date.now();
      const filePath = (file as any)?.path || (file as any)?.webkitRelativePath;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text !== undefined) {
          openOrSwitchTab(file.name, text, modTime, undefined, filePath);
          showToast(`📂 "${file.name}" 문서를 열었습니다.`);
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
      const modTime = file.lastModified || Date.now();
      const filePath = (file as any)?.path;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text !== undefined) {
          openOrSwitchTab(file.name, text, modTime, undefined, filePath);
          showToast(`📂 "${file.name}" 문서를 열었습니다.`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    setActiveHeadingId(id);
    let viewElement = document.getElementById(id);
    if (!viewElement && id) {
      try {
        viewElement = document.querySelector(`[id="${CSS.escape(id)}"]`) as HTMLElement;
      } catch (e) {}
    }
    const sourceElement = document.getElementById(`source-heading-${id}`);

    if (viewElement && (viewMode === 'view' || viewMode === 'split' || viewMode === 'edit' || viewMode === 'inline')) {
      if (mainContentRef.current) {
        const container = mainContentRef.current;
        const targetRect = viewElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        container.scrollTop += (targetRect.top - containerRect.top) - 20;
      } else {
        viewElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      // Add target heading pulse/flash highlight animation
      document.querySelectorAll('.heading-target-flash').forEach((el) => {
        el.classList.remove('heading-target-flash');
      });
      viewElement.classList.remove('heading-target-flash');
      void viewElement.offsetWidth; // force reflow to restart animation reliably
      viewElement.classList.add('heading-target-flash');
      window.setTimeout(() => {
        viewElement?.classList.remove('heading-target-flash');
      }, 1700);
    }

    if (sourceElement && (viewMode === 'source' || viewMode === 'split')) {
      if (sourceRef.current) {
        const container = sourceRef.current;
        const targetRect = sourceElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        container.scrollTop += (targetRect.top - containerRect.top) - 20;
      } else {
        sourceElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      document.querySelectorAll('.source-heading-flash').forEach((el) => {
        el.classList.remove('source-heading-flash');
      });
      sourceElement.classList.remove('source-heading-flash');
      void sourceElement.offsetWidth;
      sourceElement.classList.add('source-heading-flash');
      window.setTimeout(() => {
        sourceElement?.classList.remove('source-heading-flash');
      }, 1700);
    }
  };

  // Scroll to specific line index or element
  const scrollToLine = (targetLineIndex: number) => {
    // 1. In View / Split / Edit / Inline mode: find element with data-line-index
    if (viewMode === 'view' || viewMode === 'split' || viewMode === 'edit' || viewMode === 'inline') {
      let targetEl: HTMLElement | null = null;
      // Search for exact line or nearest preceding line
      for (let offset = 0; offset <= 8; offset++) {
        const tryLine = targetLineIndex - offset;
        if (tryLine < 0) break;
        const el = document.querySelector(`[data-line-index="${tryLine}"]`) as HTMLElement;
        if (el) {
          targetEl = el;
          break;
        }
      }

      if (targetEl && mainContentRef.current) {
        const container = mainContentRef.current;
        const targetRect = targetEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        container.scrollTop += (targetRect.top - containerRect.top) - 40;

        // Flash highlight animation on target line element
        targetEl.classList.remove('heading-target-flash');
        void targetEl.offsetWidth;
        targetEl.classList.add('heading-target-flash');
        window.setTimeout(() => {
          targetEl?.classList.remove('heading-target-flash');
        }, 1700);
      }
    }

    // 2. In Source / Split mode: find line in source gutter or scroll textarea
    if (viewMode === 'source' || viewMode === 'split') {
      const lineGutterEl = document.getElementById(`source-line-${targetLineIndex + 1}`);
      if (lineGutterEl && sourceRef.current) {
        const container = sourceRef.current;
        const lineRect = lineGutterEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        container.scrollTop += (lineRect.top - containerRect.top) - 40;
      } else if (sourceRef.current) {
        const lineHeight = 24; // 1.5rem = 24px in MarkdownSource
        sourceRef.current.scrollTop = Math.max(0, targetLineIndex * lineHeight - 40);
      }
    }
  };

  // Scroll to bookmark
  const scrollToBookmark = (bm: BookmarkItem) => {
    scrollToLine(bm.lineIndex);
    showToast(`🔖 "${bm.title}" (L${bm.lineIndex + 1}) 위치로 이동했습니다.`);
  };

  // Add bookmark handler
  const handleAddBookmark = (lineIndex: number, title?: string, snippet?: string) => {
    const lines = markdown.split('\n');
    const rawLine = lines[lineIndex] || '';
    // Clean markdown headings, bold/italic, code, links, quotes, table pipes
    const cleanRaw = rawLine
      .replace(/^[#\s\-\*\+>\|]+/, '')
      .replace(/[\|]+$/, '')
      .replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanTitle = (title || cleanRaw || `라인 ${lineIndex + 1}`)
      .replace(/^[#\s\-\*\+>\|]+/, '')
      .replace(/[\|]+$/, '')
      .replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const finalTitle = cleanTitle || `라인 ${lineIndex + 1}`;
    const cleanSnippet = cleanRaw || rawLine;
    const finalSnippet = snippet || (cleanSnippet.length > 60 ? cleanSnippet.slice(0, 60) + '...' : cleanSnippet);

    const newBookmark: BookmarkItem = {
      id: 'bm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: finalTitle,
      lineIndex,
      snippet: finalSnippet,
      createdAt: Date.now(),
    };

    setDocBookmarksMap((prev) => {
      const existing = prev[currentDocKey] || (activeTab?.name ? prev[activeTab.name] : undefined) || [];
      // Prevent exact duplicate line bookmark
      const filtered = existing.filter((b) => b.lineIndex !== lineIndex);
      const updated = [...filtered, newBookmark].sort((a, b) => a.lineIndex - b.lineIndex);
      const res: Record<string, BookmarkItem[]> = { ...prev, [currentDocKey]: updated };
      if (activeTab?.name && activeTab.name !== currentDocKey) {
        res[activeTab.name] = updated;
      }
      return res;
    });

    setTocOpen(true);
    showToast(`🔖 "${finalTitle}" 책갈피가 추가되었습니다.`);
    setContextMenu(null);
  };

  // Remove bookmark handler
  const handleRemoveBookmark = (id: string) => {
    setDocBookmarksMap((prev) => {
      const existing = prev[currentDocKey] || (activeTab?.name ? prev[activeTab.name] : undefined) || [];
      const target = existing.find((b) => b.id === id);
      const updated = existing.filter((b) => b.id !== id);
      if (target) {
        showToast(`🗑️ "${target.title}" 책갈피가 삭제되었습니다.`);
      }
      const res: Record<string, BookmarkItem[]> = { ...prev, [currentDocKey]: updated };
      if (activeTab?.name && activeTab.name !== currentDocKey) {
        res[activeTab.name] = updated;
      }
      return res;
    });
  };

  // Clear all bookmarks for active document
  const handleClearBookmarks = () => {
    setDocBookmarksMap((prev) => {
      const res: Record<string, BookmarkItem[]> = { ...prev, [currentDocKey]: [] };
      if (activeTab?.name && activeTab.name !== currentDocKey) {
        res[activeTab.name] = [];
      }
      return res;
    });
    showToast('🗑️ 현재 문서의 모든 책갈피가 초기화되었습니다.');
  };

  // Helper to copy bookmarks from current document to a newly saved file's path and name
  const copyDocBookmarks = useCallback((newPath?: string, newName?: string) => {
    setDocBookmarksMap((prev) => {
      const sourceBookmarks = prev[currentDocKey] || (activeTab?.name ? prev[activeTab.name] : undefined) || [];
      if (!sourceBookmarks || sourceBookmarks.length === 0) return prev;
      const updated = { ...prev };
      if (newPath) updated[newPath] = [...sourceBookmarks];
      if (newName) updated[newName] = [...sourceBookmarks];
      return updated;
    });
  }, [currentDocKey, activeTab?.name]);

  // Save File Handler (With Direct File System Overwrite / Native Dialog)
  const handleSaveFile = async () => {
    if (!activeTab) return;

    // 1. Direct overwrite if filePath is available
    if (activeTab.filePath) {
      try {
        const now = await invoke<number>('write_file_content', { path: activeTab.filePath, content: markdown });
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, timestamp: now, isModified: false, hasExternalChange: false } : t))
        );
        addRecentFile(activeTab.name, markdown, now, activeTab.filePath);
        showToast(`💾 "${activeTab.name}" 저장 완료`);
        return;
      } catch (err) {
        console.warn('write_file_content error, trying save dialog:', err);
      }
    }

    // 2. Direct overwrite if fileHandle is available
    if (activeTab.fileHandle) {
      try {
        const writable = await activeTab.fileHandle.createWritable();
        await writable.write(markdown);
        await writable.close();
        const now = Date.now();
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, timestamp: now, isModified: false, hasExternalChange: false } : t))
        );
        addRecentFile(activeTab.name, markdown, now, activeTab.filePath);
        showToast(`💾 "${activeTab.name}" 저장 완료`);
        return;
      } catch (err: any) {
        console.warn('fileHandle write error, falling back:', err);
      }
    }

    // 3. Prompt Save As dialog via Tauri
    try {
      const res = await invoke<any>('save_file_as_dialog', { defaultName: fileName || 'document.md', content: markdown });
      if (res && res.path) {
        const now = res.modified || Date.now();
        copyDocBookmarks(res.path, res.name);
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, name: res.name, timestamp: now, isModified: false, hasExternalChange: false, filePath: res.path } : t))
        );
        addRecentFile(res.name, markdown, now, res.path);
        showToast(`💾 "${res.name}" 저장 완료`);
        return;
      } else if (res === null) {
        return;
      }
    } catch (err) {
      console.warn('save_file_as_dialog error, falling back to Web API:', err);
    }

    // 4. Web File System Access API
    if ('showSaveFilePicker' in window) {
      try {
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
        const now = Date.now();
        copyDocBookmarks(undefined, handle.name);
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, name: handle.name, timestamp: now, isModified: false, hasExternalChange: false, fileHandle: handle } : t))
        );
        addRecentFile(handle.name, markdown, now);
        showToast(`💾 "${handle.name}" 저장 완료`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const targetName = prompt('저장할 파일 이름을 확인하세요:', fileName || 'document.md');
    if (!targetName) return;

    copyDocBookmarks(undefined, targetName);
    const now = Date.now();
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, name: targetName, timestamp: now, isModified: false, hasExternalChange: false } : t))
    );
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
    showToast(`💾 "${targetName}" 다운로드 저장 완료`);
  };

  // Save As Handler (Auto Versioning + File System Picker / Native Dialog)
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

    // 1. Tauri native save_file_as_dialog
    try {
      const res = await invoke<any>('save_file_as_dialog', { defaultName: suggestedName, content: markdown });
      if (res && res.path) {
        const now = res.modified || Date.now();
        copyDocBookmarks(res.path, res.name);
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, name: res.name, timestamp: now, isModified: false, hasExternalChange: false, filePath: res.path } : t))
        );
        addRecentFile(res.name, markdown, now, res.path);
        showToast(`💾 "${res.name}" 다른 이름으로 저장 완료`);
        return;
      } else if (res === null) {
        return;
      }
    } catch (err) {
      console.warn('save_file_as_dialog error, falling back to Web API:', err);
    }

    // 2. Web File System Access API
    if ('showSaveFilePicker' in window) {
      try {
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
        const now = Date.now();
        copyDocBookmarks(undefined, handle.name);
        dismissedExternalChanges.current[activeTab.id] = now;
        setExternalChange(null);
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, name: handle.name, timestamp: now, isModified: false, hasExternalChange: false, fileHandle: handle } : t))
        );
        addRecentFile(handle.name, markdown, now);
        showToast(`💾 "${handle.name}" 다른 이름으로 저장 완료`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const targetName = prompt('다른 이름으로 저장할 폴더/파일명을 확인하세요:', suggestedName);
    if (!targetName) return;

    copyDocBookmarks(undefined, targetName);
    const now = Date.now();
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, name: targetName, timestamp: now, isModified: false } : t))
    );
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
    showToast(`💾 "${targetName}" 다운로드 저장 완료`);
  };

  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);
  const [isTaskMode, setIsTaskMode] = useState<boolean>(false);

  // Print document handler
  const handlePrint = () => {
    window.print();
  };

  // Rich HTML Copy Handler
  const handleCopyRichHtml = async () => {
    try {
      const printArea = document.getElementById('markdown-print-area');
      const renderedHtml = printArea ? printArea.innerHTML : mainContentRef.current?.innerHTML || '';

      if (!renderedHtml) {
        showToast('⚠️ 복사할 문서 내용이 없습니다.');
        return;
      }

      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
          ${renderedHtml}
        </body>
        </html>
      `;

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([styledHtml], { type: 'text/html' });
        const textBlob = new Blob([markdown], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
        showToast('✨ 서식 있는 HTML이 클립보드에 복사되었습니다! (노션/블로그 등에 붙여넣기 가능)');
      } else {
        await navigator.clipboard.writeText(markdown);
        showToast('📋 텍스트가 클립보드에 복사되었습니다.');
      }
    } catch (err) {
      console.error('Failed to copy rich HTML:', err);
      try {
        await navigator.clipboard.writeText(markdown);
        showToast('📋 텍스트가 클립보드에 복사되었습니다.');
      } catch (e) {
        showToast('❌ 클립보드 복사에 실패했습니다.');
      }
    }
  };

  // Global Image Paste Handler (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Data = event.target?.result as string;
              if (base64Data) {
                const imageMarkdown = `\n\n![첨부 이미지](${base64Data})\n\n`;
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') {
                  const textarea = activeEl as HTMLTextAreaElement;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const val = textarea.value;
                  const newVal = val.substring(0, start) + imageMarkdown + val.substring(end);
                  updateMarkdown(newVal);
                } else {
                  updateMarkdown(markdown + imageMarkdown);
                }
                showToast('📋 클립보드 이미지가 본문에 삽입되었습니다.');
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [markdown, activeTabId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          handleCopyRichHtml();
        } else if (e.altKey && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleNewTab();
        } else if (e.altKey && e.key.toLowerCase() === 'w') {
          e.preventDefault();
          handleCloseTab(activeTabId);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleCycleTab(e.shiftKey ? 'prev' : 'next');
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handleOpenFileClick();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          handleReloadFile();
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          handlePrint();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (e.shiftKey) {
            handleSaveAsFile();
          } else {
            handleSaveFile();
          }
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          handleConvertSelectionToTask();
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
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleReloadFile();
      } else if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        }
        setIsHighlightMode(false);
        setIsTaskMode(false);
      } else if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable);

        if (!isEditing && viewMode === 'view' && headings.length > 0) {
          e.preventDefault();
          const currentIdx = headings.findIndex((h) => h.id === activeHeadingId);
          let targetIdx: number;
          if (e.shiftKey) {
            // Shift + Enter: Previous TOC Heading
            if (currentIdx <= 0) {
              targetIdx = headings.length - 1;
            } else {
              targetIdx = currentIdx - 1;
            }
          } else {
            // Enter: Next TOC Heading
            if (currentIdx === -1 || currentIdx >= headings.length - 1) {
              targetIdx = 0;
            } else {
              targetIdx = currentIdx + 1;
            }
          }
          const targetHeading = headings[targetIdx];
          if (targetHeading) {
            scrollToHeading(targetHeading.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, isHighlightMode, isTaskMode, markdown, fileName, tabs, activeTabId, viewMode, headings, activeHeadingId]);

  // Helper function to escape regex special chars
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Convert current selection or specified target line to a Task list checkbox item (- [ ] text)
  const handleConvertSelectionToTask = () => {
    // 1. Textarea in Edit / Split / Source mode handling
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === 'TEXTAREA') {
      const textarea = activeEl as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      // Find start of line and end of line
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = val.length;

      const fullLine = val.substring(lineStart, lineEnd);
      // Toggle or apply task prefix
      const taskMatch = fullLine.match(/^([ \t]*)(?:[\-\*\+]\s+\[[\sxX]\]\s+|[\-\*\+]\s+|\d+\.\s+|>+\s+|#+\s+)?(.*)$/);
      let newLine = fullLine;
      if (taskMatch) {
        const indent = taskMatch[1] || '';
        const rest = taskMatch[2] || '';
        // If already a task list item, remove or toggle
        if (/^[ \t]*[\-\*\+]\s+\[[\sxX]\]/.test(fullLine)) {
          newLine = `${indent}${rest}`;
        } else {
          newLine = `${indent}- [ ] ${rest}`;
        }
      } else {
        newLine = `- [ ] ${fullLine}`;
      }

      const newVal = val.substring(0, lineStart) + newLine + val.substring(lineEnd);
      updateMarkdown(newVal);
      return;
    }

    // 2. DOM Selection handling (View, Inline, Split rendered view)
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const rawSelectedText = selection.toString();
    if (!rawSelectedText || !rawSelectedText.trim()) return;

    const selectedText = rawSelectedText.replace(/\r?\n/g, ' ').trim();
    if (!selectedText) return;

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    // Detect target line index from DOM data attributes
    let element: HTMLElement | null = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as HTMLElement) : anchorNode.parentElement;
    let targetLineIndex: number | null = null;
    while (element && element !== document.body) {
      if (element.hasAttribute('data-line-index')) {
        targetLineIndex = parseInt(element.getAttribute('data-line-index')!, 10);
        break;
      }
      element = element.parentElement;
    }

    const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let replaced = false;

    // A. If targetLineIndex is found, convert that specific line
    if (targetLineIndex !== null && targetLineIndex >= 0 && targetLineIndex < lines.length) {
      const line = lines[targetLineIndex];
      const match = line.match(/^([ \t]*)(?:[\-\*\+]\s+\[[\sxX]\]\s+|[\-\*\+]\s+|\d+\.\s+|>+\s+|#+\s+)?(.*)$/);
      if (match) {
        const indent = match[1] || '';
        const rest = match[2] || '';
        if (/^[ \t]*[\-\*\+]\s+\[[\sxX]\]/.test(line)) {
          lines[targetLineIndex] = `${indent}${rest}`;
        } else {
          lines[targetLineIndex] = `${indent}- [ ] ${rest}`;
        }
        replaced = true;
      }
    }

    // B. Search for the line containing the selected text
    if (!replaced) {
      const cleanSelectedStr = selectedText.replace(/[\s\.\,\;\:\!\?]+$/, '').trim();
      const parentText = anchorNode.parentElement?.textContent || '';
      const cleanParent = parentText.replace(/\r?\n/g, ' ').trim();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.replace(/\*\*|\*|~~|`|<mark>|<\/mark>|\[|\]|\([^)]+\)/g, '');

        if (cleanLine.includes(cleanSelectedStr) && (cleanParent === '' || cleanLine.includes(cleanParent.slice(0, 8)))) {
          const match = line.match(/^([ \t]*)(?:[\-\*\+]\s+\[[\sxX]\]\s+|[\-\*\+]\s+|\d+\.\s+|>+\s+|#+\s+)?(.*)$/);
          if (match) {
            const indent = match[1] || '';
            const rest = match[2] || '';
            if (/^[ \t]*[\-\*\+]\s+\[[\sxX]\]/.test(line)) {
              lines[i] = `${indent}${rest}`;
            } else {
              lines[i] = `${indent}- [ ] ${rest}`;
            }
            replaced = true;
            break;
          }
        }
      }
    }

    // C. Fallback: First line containing cleanSelectedStr
    if (!replaced) {
      const cleanSelectedStr = selectedText.replace(/[\s\.\,\;\:\!\?]+$/, '').trim();
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(cleanSelectedStr)) {
          const match = lines[i].match(/^([ \t]*)(?:[\-\*\+]\s+\[[\sxX]\]\s+|[\-\*\+]\s+|\d+\.\s+|>+\s+|#+\s+)?(.*)$/);
          if (match) {
            const indent = match[1] || '';
            const rest = match[2] || '';
            if (/^[ \t]*[\-\*\+]\s+\[[\sxX]\]/.test(lines[i])) {
              lines[i] = `${indent}${rest}`;
            } else {
              lines[i] = `${indent}- [ ] ${rest}`;
            }
            replaced = true;
            break;
          }
        }
      }
    }

    if (replaced) {
      updateMarkdown(lines.join('\n'));
      selection.removeAllRanges();
    }
  };

  // Auto create checkbox when text is selected and isTaskMode is active
  useEffect(() => {
    if (!isTaskMode) return;

    const handleMouseUp = () => {
      handleConvertSelectionToTask();
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isTaskMode, markdown]);

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

      // DOM Selection에서 텍스트 노드의 부모 컨텍스트 및 선택 범위 추출
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      // 텍스트 선택이 단어의 일부만 드래그된 경우, 해당 단어 전체(공백 기준 full word)로 자동 확장
      let fullSelectedText = selectedText;
      const textContent = anchorNode.textContent || '';
      const focusNode = selection.focusNode;

      // 동일 텍스트 노드 내에서 드래그한 경우 단어 경계(공백/특수문자 기준)로 선택 텍스트 자동 확장
      if (anchorNode === focusNode && textContent) {
        const startOffset = Math.min(selection.anchorOffset, selection.focusOffset);
        const endOffset = Math.max(selection.anchorOffset, selection.focusOffset);

        // 앞쪽 단어 시작 경계 찾기
        let wordStart = startOffset;
        while (wordStart > 0 && !/[\s\.\,\;\:\!\?\(\)\[\]\{\}\<\>\`\*\_]/.test(textContent[wordStart - 1])) {
          wordStart--;
        }

        // 뒤쪽 단어 끝 경계 찾기
        let wordEnd = endOffset;
        while (wordEnd < textContent.length && !/[\s\.\,\;\:\!\?\(\)\[\]\{\}\<\>\`\*\_]/.test(textContent[wordEnd])) {
          wordEnd++;
        }

        const expandedWord = textContent.slice(wordStart, wordEnd).trim();
        if (expandedWord && expandedWord.includes(selectedText)) {
          fullSelectedText = expandedWord;
        }
      }

      // 선택된 DOM 노드가 위치한 마크다운 컨테이너 패널 탐색
      let element: HTMLElement | null = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as HTMLElement) : anchorNode.parentElement;
      
      let targetLineIndex: number | null = null;
      while (element && element !== document.body) {
        if (element.hasAttribute('data-line-index')) {
          targetLineIndex = parseInt(element.getAttribute('data-line-index')!, 10);
          break;
        }
        element = element.parentElement;
      }

      // 1. 드래그 선택 범위 안에 기존 ==형광펜== 마크다운 태그가 포함되어 있는지 확인하여 해제
      const highlightTagRegex = /==([\s\S]+?)==/g;
      let foundAndRemoved = false;
      let updatedMarkdown = markdown;

      const matches = markdown.match(highlightTagRegex);
      if (matches) {
        for (const matchTag of matches) {
          const innerText = matchTag.slice(2, -2);
          const cleanInner = innerText.replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '').trim();
          const cleanSelected = fullSelectedText.replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '').trim();

          if (
            cleanSelected.length > 0 &&
            (cleanSelected.includes(cleanInner) || cleanInner.includes(cleanSelected))
          ) {
            updatedMarkdown = updatedMarkdown.replace(matchTag, innerText);
            foundAndRemoved = true;
          }
        }
      }

      if (foundAndRemoved) {
        updateMarkdown(updatedMarkdown);
        selection.removeAllRanges();
        return;
      }

      // 2. 형광펜 추가: 확장된 단어(fullSelectedText) 또는 선택된 원래 텍스트(selectedText)를 기준으로 치환
      let replaced = false;

      // 사용할 탐색 텍스트 후보 리스트 (확장된 단어 우선, fallback으로 선택한 텍스트)
      const candidates = [fullSelectedText, selectedText]
        .map((str) => str.replace(/[\s\.\,\;\:\!\?]+$/, '').trim())
        .filter(Boolean);

      const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

      for (const cleanSelectedStr of candidates) {
        if (replaced) break;

        // A. targetLineIndex가 확인되면 해당 줄에서 특정 치환
        if (targetLineIndex !== null && targetLineIndex >= 0 && targetLineIndex < lines.length) {
          const line = lines[targetLineIndex];
          if (line.includes(cleanSelectedStr)) {
            lines[targetLineIndex] = line.replace(cleanSelectedStr, `==${cleanSelectedStr}==`);
            updatedMarkdown = lines.join('\n');
            replaced = true;
            break;
          }
        }

        // B. 선택 텍스트와 드래그 주변 문맥(parentElement.textContent)을 대조하여 정확한 줄 치환
        if (!replaced) {
          const parentText = anchorNode.parentElement?.textContent || '';
          const cleanParent = parentText.replace(/\r?\n/g, ' ').trim();

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cleanLine = line.replace(/\*\*|\*|~~|`|<mark>|<\/mark>|\[|\]|\([^)]+\)/g, '');

            // 마크다운 라인이 선택된 단어와 주변 문맥을 모두 포함하는 경우 우선 치환
            if (cleanLine.includes(cleanSelectedStr) && (cleanParent === '' || cleanLine.includes(cleanParent.slice(0, 8)))) {
              if (line.includes(cleanSelectedStr)) {
                lines[i] = line.replace(cleanSelectedStr, `==${cleanSelectedStr}==`);
                updatedMarkdown = lines.join('\n');
                replaced = true;
                break;
              } else {
                // 서식 기호가 섞여있는 경우 정규식 매칭 치환
                const wordToken = escapeRegex(cleanSelectedStr);
                const segRegex = new RegExp(`(?:\\*\\*|\\*|~~|\`)*${wordToken}(?:\\*\\*|\\*|~~|\`)?`);
                const segMatch = line.match(segRegex);
                if (segMatch && segMatch[0]) {
                  lines[i] = line.replace(segMatch[0], `==${segMatch[0]}==`);
                  updatedMarkdown = lines.join('\n');
                  replaced = true;
                  break;
                }
              }
            }
          }
        }

        // C. Fallback: 문서 내에서 cleanSelectedStr가 처음 발견된 일반 줄 치환
        if (!replaced) {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(cleanSelectedStr)) {
              lines[i] = lines[i].replace(cleanSelectedStr, `==${cleanSelectedStr}==`);
              updatedMarkdown = lines.join('\n');
              replaced = true;
              break;
            }
          }
        }
      }

      if (replaced) {
        updateMarkdown(updatedMarkdown);
        selection.removeAllRanges();
      }
    };

    // 아이패드 Safari 애플펜슬 및 터치 디바이스 호환성 지원 (mouseup + touchend + selectionchange)
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isHighlightMode, markdown]);

  // Handle Interactive Task List Item Checkbox Click (View Mode)
  const handleToggleTaskListItem = useCallback((sourceLineIndex: number, targetCheckedState: boolean, textContext?: string) => {
    const lines = markdown.split('\n');
    const newCheck = targetCheckedState ? 'x' : ' ';
    let replaced = false;

    // A. AST 소스 라인 인덱스(sourceLineIndex)가 정확히 전달된 경우: 마크다운 파일의 해당 라인 직접 수정
    if (sourceLineIndex >= 0 && sourceLineIndex < lines.length) {
      const line = lines[sourceLineIndex];
      const match = line.match(/^([ \t]*[\-\*\+]\s+\[)([\s xX])(\].*)$/);
      if (match) {
        lines[sourceLineIndex] = `${match[1]}${newCheck}${match[3]}`;
        replaced = true;
      }
    }

    // B. 소스 라인 매칭 실패 시 텍스트 컨텍스트 기반 매칭 fallback
    if (!replaced && textContext && textContext.trim()) {
      const cleanContext = textContext.replace(/\r?\n/g, ' ').trim();
      const firstWord = cleanContext.split(/\s+/)[0] || '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^([ \t]*[\-\*\+]\s+\[)([\s xX])(\]\s*)(.*)$/);
        if (match) {
          const lineText = match[4].replace(/\*\*|\*|~~|`|<mark>|<\/mark>/g, '').trim();
          if (lineText && (lineText.includes(cleanContext) || cleanContext.includes(lineText) || (firstWord && lineText.includes(firstWord)))) {
            lines[i] = `${match[1]}${newCheck}${match[3]}${match[4]}`;
            replaced = true;
            break;
          }
        }
      }
    }

    if (replaced) {
      updateMarkdown(lines.join('\n'));
    }
  }, [markdown, updateMarkdown]);

  // Handle embedding image data URL directly into markdown text
  const handleEmbedImageInMarkdown = useCallback((rawSrc: string, dataUrl: string, sourcePath?: string) => {
    if (!activeTab) return;
    const oldContent = activeTab.content;
    const newContent = embedImageDataUrlInMarkdown(oldContent, rawSrc, dataUrl);
    if (newContent !== oldContent) {
      updateMarkdown(newContent);
      const filename = decodeURIComponent(rawSrc.split(/[/\\]/).pop() || rawSrc);
      const originInfo = sourcePath ? `\n📁 가져온 경로: ${sourcePath}` : '';
      showToast(`✨ "${filename}" 이미지가 본문에 Base64로 영구 임베딩되었습니다.${originInfo}`);
    }
  }, [activeTab, updateMarkdown]);

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
    <>
      <div
        className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 relative print:hidden"
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
          onReloadFile={handleReloadFile}
          onSaveFile={handleSaveFile}
          onSaveAsFile={handleSaveAsFile}
          onPrint={handlePrint}
          onCopyRichHtml={handleCopyRichHtml}
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

        {/* Multi-Tab Navigation Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
        />

        {/* External File Change Alert Banner */}
        {externalChange && externalChange.tabId === activeTabId && (
          <ExternalChangeBanner
            fileName={externalChange.fileName}
            isModified={activeTab?.isModified}
            theme={theme}
            onReload={handleReloadExternalChange}
            onKeep={handleKeepExternalChange}
            onDismiss={handleDismissExternalChange}
          />
        )}

        {searchOpen && (
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={() => setSearchOpen(false)}
          />
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Table of Contents Panel & Draggable Width Resizer */}
          {tocOpen && (
            <>
              <TableOfContents
                headings={headings}
                activeId={activeHeadingId}
                width={tocWidth}
                onClose={() => setTocOpen(false)}
                onSelectHeading={scrollToHeading}
                bookmarks={currentBookmarks}
                onSelectBookmark={scrollToBookmark}
                onRemoveBookmark={handleRemoveBookmark}
                onClearBookmarks={handleClearBookmarks}
              />
              <div
                className="w-1 bg-gray-200 dark:bg-gray-700/80 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize select-none transition-colors shrink-0"
                title="드래그하여 목차 너비 조절 / 더블클릭 시 기본 너비(280px) 초기화"
                onDoubleClick={() => setTocWidth(280)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = tocWidth;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const newWidth = Math.min(Math.max(startWidth + deltaX, 160), 650);
                    setTocWidth(newWidth);
                  };
                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                  };
                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
              />
            </>
          )}

          {/* Main Content Area with Right-Click Context Menu for Bookmarks */}
          <main
            onContextMenu={(e) => {
              // Extract target element and line index
              const target = e.target as HTMLElement;
              let lineEl: HTMLElement | null = target.closest('[data-line-index]');
              let lineIdx = 0;
              if (lineEl && lineEl.hasAttribute('data-line-index')) {
                const parsed = parseInt(lineEl.getAttribute('data-line-index') || '0', 10);
                if (!isNaN(parsed) && parsed >= 0) {
                  lineIdx = parsed;
                }
              } else {
                // If clicked on textarea in Source mode
                if (target.tagName === 'TEXTAREA') {
                  const textarea = target as HTMLTextAreaElement;
                  const cursor = textarea.selectionStart;
                  const textBefore = textarea.value.substring(0, cursor);
                  lineIdx = textBefore.split('\n').length - 1;
                } else if (mainContentRef.current) {
                  // Fallback: estimate line based on scroll percentage
                  const container = mainContentRef.current;
                  const ratio = container.scrollTop / (container.scrollHeight - container.clientHeight || 1);
                  const total = markdown.split('\n').length;
                  lineIdx = Math.min(total - 1, Math.max(0, Math.floor(ratio * total)));
                }
              }

              const selection = window.getSelection();
              const selectedText = selection ? selection.toString().trim() : '';
              const lines = markdown.split('\n');

              // Dual-validation & Content-aware line calibration
              const rawElText = (target.textContent || '').trim();
              const cleanElFirstWord = rawElText.replace(/^[#\s\-\*\+>\|]+/, '').replace(/[\s\.\,\;\:\!\?].*$/, '').trim();
              if (cleanElFirstWord && cleanElFirstWord.length >= 2) {
                const currentLineStr = lines[lineIdx] || '';
                if (!currentLineStr.includes(cleanElFirstWord)) {
                  // Check nearby lines (-10 to +10)
                  let foundNear = -1;
                  for (let offset = 1; offset <= 10; offset++) {
                    if (lineIdx - offset >= 0 && (lines[lineIdx - offset] || '').includes(cleanElFirstWord)) {
                      foundNear = lineIdx - offset;
                      break;
                    }
                    if (lineIdx + offset < lines.length && (lines[lineIdx + offset] || '').includes(cleanElFirstWord)) {
                      foundNear = lineIdx + offset;
                      break;
                    }
                  }
                  if (foundNear !== -1) {
                    lineIdx = foundNear;
                  }
                }
              }

              const lineText = lines[lineIdx] || '';

              e.preventDefault();
              setContextMenu({
                visible: true,
                x: Math.min(e.clientX, window.innerWidth - 220),
                y: Math.min(e.clientY, window.innerHeight - 200),
                targetLineIndex: lineIdx,
                selectedText,
                lineText,
              });
            }}
            className="flex-1 flex overflow-hidden relative"
          >
            {viewMode === 'source' ? (
              <div className="w-full h-full overflow-hidden">
                <MarkdownSource
                  ref={sourceRef}
                  markdown={markdown}
                  onChange={updateMarkdown}
                  bookmarks={currentBookmarks}
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
                    bookmarks={currentBookmarks}
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

                {/* Instant Live Rendered Preview Panel with non-blocking deferred markdown */}
                <div
                  style={{ width: `${100 - splitRatio}%` }}
                  className="h-full overflow-hidden"
                >
                  <MarkdownView
                    ref={mainContentRef}
                    markdown={deferredMarkdown}
                    zoomLevel={zoomLevel}
                    searchQuery={searchQuery}
                    theme={theme}
                    filePath={activeTab?.filePath}
                    bookmarks={currentBookmarks}
                    onToggleTaskListItem={handleToggleTaskListItem}
                    onEmbedImage={handleEmbedImageInMarkdown}
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
                  theme={theme}
                  filePath={activeTab?.filePath}
                  bookmarks={currentBookmarks}
                  onChangeMarkdown={updateMarkdown}
                  onEmbedImage={handleEmbedImageInMarkdown}
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
                    onChange={updateMarkdown}
                    onScroll={handleSourceScroll}
                    bookmarks={currentBookmarks}
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

                {/* Markdown Rendered View Panel with non-blocking deferred markdown */}
                <div
                  style={{ width: `${100 - splitRatio}%` }}
                  className="h-full overflow-hidden"
                >
                  <MarkdownView
                    ref={mainContentRef}
                    markdown={deferredMarkdown}
                    zoomLevel={zoomLevel}
                    searchQuery={searchQuery}
                    theme={theme}
                    filePath={activeTab?.filePath}
                    bookmarks={currentBookmarks}
                    onScroll={handleViewScroll}
                    onToggleTaskListItem={handleToggleTaskListItem}
                    onEmbedImage={handleEmbedImageInMarkdown}
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
                  theme={theme}
                  filePath={activeTab?.filePath}
                  bookmarks={currentBookmarks}
                  onToggleTaskListItem={handleToggleTaskListItem}
                  onEmbedImage={handleEmbedImageInMarkdown}
                />
              </div>
            )}
          </main>
        </div>

        {/* Custom Context Menu on Right Click */}
        {contextMenu && contextMenu.visible && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="custom-context-menu fixed z-50 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl py-1.5 text-xs text-gray-800 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 text-[11px] font-mono text-gray-400 dark:text-gray-500 flex items-center justify-between">
              <span>위치: Line {contextMenu.targetLineIndex + 1}</span>
            </div>

            <button
              onClick={() => {
                const titlePrompt = contextMenu.selectedText
                  ? contextMenu.selectedText.slice(0, 30)
                  : contextMenu.lineText
                  ? contextMenu.lineText.replace(/^[#\s\-\*\+>\|]+/, '').replace(/[\|]+$/, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').slice(0, 30)
                  : `Line ${contextMenu.targetLineIndex + 1}`;
                handleAddBookmark(contextMenu.targetLineIndex, titlePrompt);
              }}
              className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 text-left transition-colors cursor-pointer font-medium"
            >
              <Bookmark size={15} className="text-amber-500 fill-amber-500/20" />
              <span>이 위치에 책갈피 추가</span>
            </button>

            {contextMenu.selectedText && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.selectedText);
                  showToast('📋 선택한 텍스트가 복사되었습니다.');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
              >
                <Copy size={14} className="text-gray-400" />
                <span>선택 영역 텍스트 복사</span>
              </button>
            )}

            <button
              onClick={() => {
                handleConvertSelectionToTask();
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors cursor-pointer"
            >
              <CheckSquare size={14} className="text-blue-500" />
              <span>할 일(체크박스)로 변환 (Ctrl+T)</span>
            </button>
          </div>
        )}

        <FloatingMenu
          onScrollToTop={handleScrollToTop}
          onScrollToBottom={handleScrollToBottom}
          isHighlightMode={isHighlightMode}
          onToggleHighlightMode={() => {
            setIsHighlightMode((prev) => !prev);
            if (!isHighlightMode) setIsTaskMode(false);
          }}
          isTaskMode={isTaskMode}
          onToggleTaskMode={() => {
            setIsTaskMode((prev) => !prev);
            if (!isTaskMode) setIsHighlightMode(false);
          }}
          onConvertSelectionToTask={handleConvertSelectionToTask}
          viewMode={viewMode}
          onNextViewMode={() => {
            const modes: ViewMode[] = ['source', 'edit', 'inline', 'view', 'split'];
            const currentIndex = modes.indexOf(viewMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            setViewMode(modes[nextIndex]);
          }}
          onSwitchToViewMode={() => setViewMode('view')}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-blue-500/70 shadow-2xl px-5 py-3 rounded-2xl text-xs max-w-xl w-auto pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-md">
            <div className="whitespace-pre-line font-medium leading-relaxed break-all font-mono text-center">{toastMessage}</div>
          </div>
        )}
      </div>

      {/* Dedicated Print Area (Rendered exclusively during browser print) */}
      <div id="markdown-print-area" className="hidden print:block w-full bg-white text-black p-0 markdown-body">
        <MarkdownView
          markdown={markdown}
          zoomLevel={1}
          searchQuery=""
        />
      </div>
    </>
  );
}
