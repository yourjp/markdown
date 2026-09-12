import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Highlighter, Keyboard, X, GripHorizontal } from 'lucide-react';

interface FloatingMenuProps {
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  isHighlightMode: boolean;
  onToggleHighlightMode: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  onScrollToTop,
  onScrollToBottom,
  isHighlightMode,
  onToggleHighlightMode,
}) => {
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

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2 z-50 select-none">
        <button
          onClick={() => setHelpOpen(true)}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700"
          title="단축키 도움말 보기"
        >
          <Keyboard size={20} />
        </button>
        <button
          onClick={onToggleHighlightMode}
          className={`p-3 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center ${
            isHighlightMode
              ? 'bg-pink-600 ring-4 ring-pink-300 dark:ring-pink-900 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isHighlightMode ? '형광펜 모드 켜짐 (드래그 시 칠해짐)' : '형광펜 모드 켜기 (버튼 누른 후 텍스트 드래그)'}
        >
          <Highlighter size={20} className={isHighlightMode ? 'text-white' : 'text-pink-400'} />
        </button>
        <button
          onClick={onScrollToTop}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700"
          title="맨 위로 이동"
        >
          <ArrowUp size={20} />
        </button>
        <button
          onClick={onScrollToBottom}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center border border-slate-700"
          title="맨 아래로 이동"
        >
          <ArrowDown size={20} />
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
              <h4 className="text-blue-600 font-bold text-[11px] mb-1.5 uppercase tracking-wider">Block & Structure (블록 / 구조 서식)</h4>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
