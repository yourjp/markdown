export interface HeadingItem {
  id: string;
  title: string;
  level: number;
}

export type ViewMode = 'view' | 'split';

export interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
}
