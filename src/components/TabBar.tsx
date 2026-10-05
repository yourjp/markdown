import React from 'react';
import { FileText, Plus, X } from 'lucide-react';
import { TabDocument } from '../types';

interface TabBarProps {
  tabs: TabDocument[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="h-9 bg-gray-900 border-b border-gray-700/80 px-2 flex items-center select-none z-20 overflow-x-auto shrink-0 scrollbar-none">
      <div className="flex items-center space-x-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-t-md transition-all cursor-pointer max-w-[180px] border-t-2 ${
                isActive
                  ? 'bg-gray-800 text-blue-400 font-bold border-blue-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border-transparent'
              }`}
              title={tab.name}
            >
              <FileText
                size={13}
                className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}
              />
              <span className="truncate">{tab.name}</span>

              {tab.hasExternalChange && (
                <span
                  className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/40 shrink-0 shadow-xs animate-pulse"
                  title="외부 프로그램에서 변경됨 (최신 내용 미반영)"
                />
              )}

              {tab.isModified && !tab.hasExternalChange && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                  title="수정됨"
                />
              )}

              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className={`p-0.5 rounded hover:bg-gray-700 transition-colors shrink-0 ${
                  isActive ? 'text-gray-400 hover:text-red-400' : 'text-transparent group-hover:text-gray-400 hover:text-red-400'
                }`}
                title="탭 닫기"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        className="p-1 ml-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors cursor-pointer flex items-center justify-center shrink-0"
        title="새 문서 탭 열기 (Ctrl+Alt+N)"
      >
        <Plus size={15} />
      </button>
    </div>
  );
};
