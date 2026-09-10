import React from 'react';
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
  FileText
} from 'lucide-react';
import { ViewMode, RecentFile } from '../types';

interface ToolbarProps {
  tocOpen: boolean;
  onToggleToc: () => void;
  fileName: string;
  onOpenFile: () => void;
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
  onOpenFile,
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
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 text-sm font-bold rounded-lg transition-colors border border-blue-800/40"
          title="로컬 Markdown 파일 열기 (Ctrl+O)"
        >
          <FolderOpen size={18} />
          <span>파일 열기</span>
        </button>

        {/* Recent Files Chips (Top 3 with Right Click to Close/Remove) */}
        {recentFiles.length > 0 && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-gray-700">
            <span className="text-xs font-semibold text-gray-400 flex items-center space-x-1 pr-1">
              <History size={14} />
              <span>최근:</span>
            </span>
            {recentFiles.map((file, idx) => (
              <button
                key={`${file.name}-${idx}`}
                onClick={() => onSelectRecentFile(file)}
                onContextMenu={(e) => {
                  e.preventDefault(); // Prevent browser context menu
                  onRemoveRecentFile(file.name);
                }}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-all max-w-[130px] truncate group relative ${
                  file.name === fileName
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
                title={`좌클릭: '${file.name}' 불러오기\n우클릭: 문서 항목 닫기(삭제)`}
              >
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-sm font-bold text-gray-200 truncate max-w-xs pl-2 border-l border-gray-600">
          {fileName || "문서를 선택하세요"}
        </span>
      </div>

      {/* Center controls: View Modes */}
      <div className="flex items-center bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => onToggleViewMode('split')}
          className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
            viewMode === 'split'
              ? 'bg-gray-800 text-blue-400 shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
          title="소스 + View 스플릿 모드"
        >
          <Columns size={15} />
          <span>Source + View</span>
        </button>
        <button
          onClick={() => onToggleViewMode('view')}
          className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-md transition-all ${
            viewMode === 'view'
              ? 'bg-gray-800 text-blue-400 shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
          title="View Only 모드"
        >
          <Eye size={15} />
          <span>View Only</span>
        </button>
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
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 text-xs font-bold rounded-lg shadow-sm transition-all"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} className="text-yellow-400" />
              <span>화이트 모드</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-blue-400" />
              <span>다크 모드</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
