export type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';
export type DiffBadgeStyle = 'soft' | 'solid';
export type DiffFilter = 'all' | 'changed' | 'added' | 'removed';

export type DiffStatus =
  | 'equal'
  | 'changed'
  | 'added'
  | 'removed'
  | 'type-changed';

export interface AppSettings {
  locale: Locale;
  caseInsensitiveKeys: boolean;
  sortKeys: boolean;
  diffBadgeStyle: DiffBadgeStyle;
  diffFilter: DiffFilter;
  showOnlyDifferences: boolean;
  searchQuery: string;
  editorHeight: number;
  leftInput: string;
  rightInput: string;
}

export interface JsonErrorState {
  left?: string;
  right?: string;
}

export interface DiffNode {
  path: string;
  leftKey?: string;
  rightKey?: string;
  status: DiffStatus;
  keyChanged: boolean;
  valueChanged: boolean;
  leftValue: unknown;
  rightValue: unknown;
  leftDisplay: string;
  rightDisplay: string;
  children?: DiffNode[];
}

