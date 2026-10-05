export interface HeadingItem {
  id: string;
  title: string;
  level: number;
}

export type ViewMode = 'source' | 'view' | 'split' | 'edit' | 'inline';
export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
  filePath?: string;
}

export interface TabDocument {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  isModified?: boolean;
  hasExternalChange?: boolean;
  fileHandle?: any;
  filePath?: string;
}
export interface BookmarkItem {
  id: string;
  title: string;
  lineIndex: number;
  snippet?: string;
  createdAt: number;
}
