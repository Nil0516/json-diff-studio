export type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';

export type DiffStatus =
  | 'equal'
  | 'changed'
  | 'added'
  | 'removed'
  | 'type-changed';

export interface AppSettings {
  locale: Locale;
  caseInsensitiveKeys: boolean;
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
  leftValue: unknown;
  rightValue: unknown;
  leftDisplay: string;
  rightDisplay: string;
  children?: DiffNode[];
}
