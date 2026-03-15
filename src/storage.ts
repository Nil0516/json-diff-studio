import type { AppSettings } from './types';

const storageKey = 'json-diff-studio:settings';

export const defaultSettings: AppSettings = {
  locale: 'zh-TW',
  caseInsensitiveKeys: false,
  leftInput: '{\n  "Name": "Alice",\n  "profile": {\n    "age": 30,\n    "city": "Taipei"\n  },\n  "tags": ["frontend", "json"]\n}',
  rightInput:
    '{\n  "name": "Alice",\n  "profile": {\n    "age": 31,\n    "city": "Tokyo"\n  },\n  "tags": ["frontend", "diff"],\n  "active": true\n}',
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
