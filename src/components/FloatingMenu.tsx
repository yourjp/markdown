import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Highlighter, CheckSquare, Keyboard, X, GripHorizontal, Code, Edit3, Edit2, Eye, Columns, Layers, Plus } from 'lucide-react';
import { ViewMode } from '../types';

interface FloatingMenuProps {
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  isHighlightMode: boolean;
  onToggleHighlightMode: () => void;
  isTaskMode: boolean;
  onToggleTaskMode: () => void;
  onConvertSelectionToTask?: () => void;
  viewMode: ViewMode;
  onNextViewMode: () => void;
  onSwitchToViewMode: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  onScrollToTop,
  onScrollToBottom,
  isHighlightMode,
  onToggleHighlightMode,
  isTaskMode,
  onToggleTaskMode,
  onConvertSelectionToTask,
  viewMode,
  onNextViewMode,
  onSwitchToViewMode,
}) => {
  const [menuExpanded, setMenuExpanded] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default top-right position
    const modalWidth = 448; // max-w-md is 28rem = 448px
    const initialX = Math.max(20, window.innerWidth - modalWidth - 24);
    return { x: initialX, y: 80 };
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const modeIcons: Record<ViewMode, { icon: React.ReactNode; label: string }> = {
    source: { icon: <Code size={20} />, label: 'Source' },
    edit: { icon: <Edit3 size={20} />, label: 'Edit' },
    inline: { icon: <Edit2 size={20} />, label: 'Inline' },
    view: { icon: <Eye size={20} />, label: 'View' },
    split: { icon: <Columns size={20} />, label: 'Split' },
  };

  const currentModeInfo = modeIcons[viewMode] || modeIcons.view;

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2 z-50 select-none items-center">
        {/* Collapsible Action Buttons Group */}
        <div
          className={`flex flex-col space-y-2 transition-all duration-300 transform ${
            menuExpanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={onSwitchToViewMode}
            className={`p-3 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border cursor-pointer relative group ${
              viewMode === 'view'
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
            }`}
            title="View(독서/렌더링) 모드로 즉시 전환"
          >
            <Eye size={20} />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-emerald-300 text-[10px] font-bold rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              View 모드로 즉시 전환
            </span>
          </button>
          <button
            onClick={onNextViewMode}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700 relative group cursor-pointer"
            title={`보기 모드 순환 전환 (현재: ${currentModeInfo.label})`}
          >
            {currentModeInfo.icon}
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-amber-300 text-[10px] font-bold rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {currentModeInfo.label} 모드 (순환)
            </span>
          </button>
          <button
            onClick={() => setHelpOpen((prev) => !prev)}
            className={`p-3 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border cursor-pointer ${
              helpOpen
                ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-300'
                : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
            }`}
            title={helpOpen ? "단축키 도움말 닫기" : "단축키 도움말 보기"}
          >
            <Keyboard size={20} />
          </button>
          {/* Checkbox Creation Floating Button */}
          <button
            onClick={() => {
              if (onConvertSelectionToTask) {
                onConvertSelectionToTask();
              }
              onToggleTaskMode();
            }}
            className={`p-3 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center cursor-pointer relative group ${
              isTaskMode
                ? 'bg-indigo-600 ring-4 ring-indigo-300 dark:ring-indigo-900 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
            title={
              isTaskMode
                ? '체크박스 생성 모드 켜짐 (문장 선택 시 체크박스 생성)'
                : '체크박스 만들기 (선택된 문장 앞에 [- ] 체크박스 생성)'
            }
          >
            <CheckSquare size={20} className={isTaskMode ? 'text-white' : 'text-indigo-400'} />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-indigo-300 text-[10px] font-bold rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              체크박스 만들기
            </span>
          </button>
          <button
            onClick={onToggleHighlightMode}
            className={`p-3 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center cursor-pointer relative group ${
              isHighlightMode
                ? 'bg-pink-600 ring-4 ring-pink-300 dark:ring-pink-900 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
            title={isHighlightMode ? '형광펜 모드 켜짐 (드래그 시 칠해짐)' : '형광펜 모드 켜기 (버튼 누른 후 텍스트 드래그)'}
          >
            <Highlighter size={20} className={isHighlightMode ? 'text-white' : 'text-pink-400'} />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-pink-300 text-[10px] font-bold rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              형광펜 모드
            </span>
          </button>
          <button
            onClick={onScrollToTop}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700 cursor-pointer"
            title="맨 위로 이동"
          >
            <ArrowUp size={20} />
          </button>
          <button
            onClick={onScrollToBottom}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700 cursor-pointer"
            title="맨 아래로 이동"
          >
            <ArrowDown size={20} />
          </button>
        </div>

        {/* Primary Master Trigger Button */}
        <button
          onClick={() => setMenuExpanded((prev) => !prev)}
          className={`p-3 rounded-full shadow-md backdrop-blur-xs transition-all hover:scale-110 flex items-center justify-center border cursor-pointer ${
            menuExpanded
              ? 'bg-blue-600/80 hover:bg-blue-600 text-white border-blue-400/80 rotate-45 ring-2 ring-blue-300/40'
              : 'bg-slate-900/10 hover:bg-slate-800/80 text-blue-500/60 hover:text-blue-400 border-slate-700/20 hover:border-slate-600'
          }`}
          title={menuExpanded ? "메뉴 접기" : "플로팅 메뉴 펼치기"}
        >
          <Plus size={20} className="transition-transform duration-300" />
        </button>
      </div>

      {/* Keyboard Shortcuts Floating Non-blocking Draggable Window */}
      {helpOpen && (
        <div
          style={{ top: `${position.y}px`, left: `${position.x}px` }}
          className="fixed z-50 w-full max-w-md bg-white text-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-shadow"
        >
          {/* Draggable Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 cursor-move select-none"
            title="드래그하여 이동하세요"
          >
            <div className="flex items-center space-x-2">
              <GripHorizontal className="text-gray-400" size={18} />
              <Keyboard className="text-blue-600" size={18} />
              <h3 className="font-bold text-sm text-gray-900">단축키 도움말</h3>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3 text-xs bg-white">
            <div>
              <h4 className="text-blue-600 font-bold text-[11px] mb-1.5 uppercase tracking-wider">Inline / Text Formatting (텍스트 서식)</h4>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs col-span-2 bg-rose-50/40 border-rose-200">
                  <span className="text-rose-900 font-bold">모든 서식/문법 지우기</span>
                  <span className="text-rose-600 font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300 shadow-2xs">Ctrl + 0  /  Ctrl + \</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">굵게 (Bold)</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + B</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">기울임 (Italic)</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + I</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">형광펜 (Highlight)</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + H</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">취소선</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Shift + X</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">인라인 코드</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + E</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">링크 (Link)</span>
                  <span className="text-blue-600 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + K</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-blue-600 font-bold text-[11px] mb-1.5 uppercase tracking-wider">Inline / Line Editing (인라인 & 라인 편집)</h4>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs col-span-2 bg-rose-50/40 border-rose-200">
                  <span className="text-rose-900 font-bold">줄 전체 삭제</span>
                  <span className="text-rose-600 font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300 shadow-2xs">Ctrl + Shift + K  /  Ctrl + D</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">새 빈 줄 삽입</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Enter</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">이전/다음 줄 이동</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Enter / Shift+Enter</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-blue-600 font-bold text-[11px] mb-1.5 uppercase tracking-wider">Block & Structure (블록 / 구조 서식)</h4>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">체크박스 목록</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + T</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">제목 H1, H2, H3</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + 1~3</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">리스트 항목</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + L</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">인용구 (Quote)</span>
                  <span className="text-teal-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Q</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-blue-600 font-bold text-[11px] mb-1.5 uppercase tracking-wider">Global App Controls (글로벌 단축키)</h4>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">파일 열기</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + O</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">인쇄 / PDF 출력</span>
                  <span className="text-indigo-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + P</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">서식 복사 (HTML)</span>
                  <span className="text-purple-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Shift + C</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">새 문서 탭</span>
                  <span className="text-emerald-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Alt + N</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">탭 전환 (다음/이전)</span>
                  <span className="text-blue-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + Tab / Shift+Tab</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">저장 / Save As</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + S / Shift+S</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">목차 토글</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + B</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">검색 창 토글</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + F</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs col-span-2 bg-slate-50/60 border-slate-300">
                  <span className="text-slate-900 font-bold">모드 해제 (형광펜/체크박스/검색)</span>
                  <span className="text-slate-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">Esc</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">확대 / 축소</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + (+ / -)</span>
                </div>
                <div className="bg-gray-50 p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                  <span className="text-gray-900 font-bold">확대율 100% 리셋</span>
                  <span className="text-amber-700 font-bold bg-white px-1.5 py-0.5 rounded border border-gray-300 shadow-2xs">Ctrl + 0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
