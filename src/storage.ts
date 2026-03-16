import type { AppSettings } from './types';

const storageKey = 'json-diff-studio:settings';

export const defaultSettings: AppSettings = {
  locale: 'zh-TW',
  caseInsensitiveKeys: false,
  sortKeys: false,
  diffBadgeStyle: 'soft',
  diffFilter: 'all',
  showOnlyDifferences: false,
  searchQuery: '',
  editorHeight: 420,
  leftInput:
    '{\n  "Name": "Nil",\n  "profile": {\n    "age": 29,\n    "city": "New Taipei City"\n  },\n  "tags": ["backend", "json", "DevOps"]\n}',
  rightInput:
    '{\n  "name": "Nil",\n  "profile": {\n    "age": 29,\n    "city": "New Taipei City"\n  },\n  "tags": ["backend", "diff"],\n  "active": true\n}',
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}

