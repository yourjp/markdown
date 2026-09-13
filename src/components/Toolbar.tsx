import React, { useState, useRef, useEffect } from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  FolderOpen, 
  Search, 
  Sun, 
  Moon, 
  ZoomIn, 
  ZoomOut, 
  Columns,
  Eye,
  History,
  FileText,
  ChevronDown,
  X,
  Code,
  Save,
  Download,
  Edit3,
  Edit2,
  Printer
} from 'lucide-react';
import { ViewMode, RecentFile } from '../types';

interface ToolbarProps {
  tocOpen: boolean;
  onToggleToc: () => void;
  fileName: string;
  lastModifiedTime?: number;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onPrint: () => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  recentFiles: RecentFile[];
  onSelectRecentFile: (file: RecentFile) => void;
  onRemoveRecentFile: (fileNameToRemove: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tocOpen,
  onToggleToc,
  fileName,
  lastModifiedTime,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  onPrint,
  viewMode,
  onToggleViewMode,
  theme,
  onToggleTheme,
  searchOpen,
  onToggleSearch,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  recentFiles,
  onSelectRecentFile,
  onRemoveRecentFile,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to format timestamp as MM/DD HH:mm
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const formattedTime = formatTime(lastModifiedTime);

  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between select-none z-10 shadow-sm shrink-0 text-gray-200">
      {/* Left controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleToc}
          title={tocOpen ? "목차 닫기 (Ctrl+B)" : "목차 열기 (Ctrl+B)"}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
        >
          {tocOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        <button
          onClick={onOpenFile}
          className="p-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 rounded-lg transition-colors border border-blue-800/40 flex items-center justify-center"
          title="로컬 Markdown 파일 열기 (Ctrl+O)"
        >
          <FolderOpen size={18} />
        </button>

        <button
          onClick={onSaveFile}
          className="p-2 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-400 rounded-lg transition-colors border border-emerald-800/40 flex items-center justify-center"
          title="현재 Markdown 파일 저장 (Ctrl+S)"
        >
          <Save size={18} />
        </button>

        <button
          onClick={onSaveAsFile}
          className="p-2 bg-teal-900/40 hover:bg-teal-900/60 text-teal-300 rounded-lg transition-colors border border-teal-800/40 flex items-center justify-center"
          title="버전 업하여 다른 이름으로 저장 (Ctrl+Shift+S)"
        >
          <Download size={18} />
        </button>

        <button
          onClick={onPrint}
          className="p-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 rounded-lg transition-colors border border-indigo-800/40 flex items-center justify-center"
          title="문서 인쇄 / PDF로 저장 (Ctrl+P)"
        >
          <Printer size={18} />
        </button>

        {/* Recent Files Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors border border-gray-600 shadow-sm flex items-center justify-center space-x-1"
            title={`최근 열어본 문서 리스트 (${recentFiles.length})`}
          >
            <History size={18} className="text-blue-400" />
            <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu Popup */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-gray-700 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Recent Files</span>
                <span className="text-[10px] font-normal text-gray-500">우클릭: 삭제</span>
              </div>
              
              {recentFiles.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-500 italic text-center">
                  Recent list is empty
                </div>
              ) : (
                recentFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    onClick={() => {
                      onSelectRecentFile(file);
                      setDropdownOpen(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onRemoveRecentFile(file.name);
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      file.name === fileName
                        ? 'bg-blue-900/50 text-blue-400 font-bold border-l-3 border-blue-500'
                        : 'text-gray-200 hover:bg-gray-700 hover:text-white'
                    }`}
                    title={`좌클릭: 불러오기 / 우클릭: 리스트에서 제거`}
                  >
                    <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-2">
                      <FileText size={14} className={`shrink-0 ${file.name === fileName ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className="truncate">{file.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecentFile(file.name);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                      title="문서 제거"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-gray-600 truncate max-w-sm">
          <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs shrink-0">
            v1.8.2
          </span>
          <span className="text-sm font-bold text-gray-200 truncate">
            {fileName || "문서를 선택하세요"}
          </span>
          {formattedTime && (
            <span className="text-[11px] font-medium text-emerald-400 font-mono shrink-0">
              ({formattedTime})
            </span>
          )}
        </div>
      </div>

      {/* All 5 Modes Displayed as Compact Icon Buttons */}
      <div className="flex items-center bg-gray-900/60 p-1 rounded-lg border border-gray-700/80 shadow-inner space-x-1 shrink-0">
        {[
          { mode: 'source' as ViewMode, icon: <Code size={16} />, label: 'Source', desc: '소스 전용' },
          { mode: 'edit' as ViewMode, icon: <Edit3 size={16} />, label: 'Edit', desc: '실시간 분할 편집' },
          { mode: 'inline' as ViewMode, icon: <Edit2 size={16} />, label: 'Inline', desc: '인라인 즉시 편집' },
          { mode: 'view' as ViewMode, icon: <Eye size={16} />, label: 'View', desc: '뷰 렌더링 독서' },
          { mode: 'split' as ViewMode, icon: <Columns size={16} />, label: 'Split', desc: '분할 비교 뷰' },
        ].map((item) => {
          const isActive = viewMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onToggleViewMode(item.mode)}
              title={`${item.label} 모드 (${item.desc})`}
              className={`p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400 scale-105'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/80'
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2">
        {/* Search Toggle */}
        <button
          onClick={onToggleSearch}
          title="검색 (Ctrl+F)"
          className={`p-2 rounded-lg transition-colors ${
            searchOpen
              ? 'bg-blue-900/50 text-blue-400'
              : 'hover:bg-gray-700 text-gray-300'
          }`}
        >
          <Search size={18} />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-0.5 bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={onZoomOut}
            title="축소 (Ctrl+-)"
            className="p-1.5 rounded-md hover:bg-gray-600 text-gray-300"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={onResetZoom}
            title="기본 확대율로 리셋 (Ctrl+0)"
            className="px-1.5 py-0.5 text-xs font-mono font-bold text-gray-300 hover:bg-gray-600 rounded"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="확대 (Ctrl++)"
            className="p-1.5 rounded-md hover:bg-gray-600 text-gray-300"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? "라이트 모드로 변경" : "다크 모드로 변경"}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 text-xs font-bold rounded-lg shadow-sm transition-all"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} className="text-yellow-400" />
              <span className="hidden md:inline">화이트 모드</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-blue-400" />
              <span className="hidden md:inline">다크 모드</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
