export interface HeadingItem {
  id: string;
  title: string;
  level: number;
}

export type ViewMode = 'source' | 'view' | 'split' | 'edit' | 'inline';

export interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
}
