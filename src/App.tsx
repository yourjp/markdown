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

  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);
  const [isTaskMode, setIsTaskMode] = useState<boolean>(false);

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
      } else if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        }
        setIsHighlightMode(false);
        setIsTaskMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, isHighlightMode, isTaskMode, markdown, fileName]);

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

    const lines = markdown.split('\n');
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
        setMarkdown(updatedMarkdown);
        selection.removeAllRanges();
        return;
      }

      // 2. 형광펜 추가: 확장된 단어(fullSelectedText) 또는 선택된 원래 텍스트(selectedText)를 기준으로 치환
      let replaced = false;

      // 사용할 탐색 텍스트 후보 리스트 (확장된 단어 우선, fallback으로 선택한 텍스트)
      const candidates = [fullSelectedText, selectedText]
        .map((str) => str.replace(/[\s\.\,\;\:\!\?]+$/, '').trim())
        .filter(Boolean);

      const lines = markdown.split('\n');

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
        setMarkdown(updatedMarkdown);
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
  const handleToggleTaskListItem = (sourceLineIndex: number, targetCheckedState: boolean, textContext?: string) => {
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
  };

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
                  onToggleTaskListItem={handleToggleTaskListItem}
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
                  onToggleTaskListItem={handleToggleTaskListItem}
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
                onToggleTaskListItem={handleToggleTaskListItem}
              />
            </div>
          )}
        </main>
      </div>

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
    </div>
  );
}
