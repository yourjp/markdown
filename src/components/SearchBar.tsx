import React from 'react';
import { X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClose,
}) => {
  return (
    <div className="bg-blue-50 dark:bg-gray-800 border-b border-blue-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between shadow-inner">
      <div className="flex items-center space-x-2 flex-1 max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="문서 내 키워드 검색..."
          autoFocus
          className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        />
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        title="검색 창 닫기 (Esc)"
      >
        <X size={18} />
      </button>
    </div>
  );
};
